/**
 * Spike F-07: server-side media upload and retry against real S3-compatible storage.
 * Run with `pnpm spike:media` (starts SeaweedFS in Docker). See docs/feasibility/F-07-media-retry.md.
 */
import type { PGlite } from "@electric-sql/pglite";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createDatabase, uuid } from "../../data-model/src/db";
import { MediaService, sha256, type UploadRequest } from "./media-service";
import {
  createBucket,
  createS3Client,
  listKeys,
  objectExists,
  pauseStorage,
  presignPut,
  rawPut,
  readObject,
  unpauseStorage,
  waitForStorage,
} from "./storage";

const RUBY = uuid(1);
const SAPPHIRE = uuid(2);
const GARNET = uuid(100);
const BUCKET = `garnet-f07-${randomBytes(4).toString("hex")}`;

let db: PGlite;
let s3: S3Client;
let media: MediaService;
let next = 1000;
const id = () => uuid(next++);

/** A valid JPEG-looking payload: correct magic bytes plus random content. */
function jpeg(size = 64 * 1024): Buffer {
  const body = randomBytes(size);
  body[0] = 0xff;
  body[1] = 0xd8;
  body[2] = 0xff;
  return body;
}

async function newEntry(author = RUBY): Promise<string> {
  const entryId = id();
  await asUser(db, author, (tx) =>
    tx.query(
      `insert into entry (id, relationship_id, author_id, kind, body, visibility, occurred_at, occurred_time_zone, shared_at)
       values ($1, $2, $3, 'photo', 'a moment', 'shared', now(), 'Europe/London', now())`,
      [entryId, GARNET, author],
    ),
  );
  return entryId;
}

function uploadRequest(entryId: string, body: Buffer, overrides: Partial<UploadRequest> = {}) {
  return {
    mediaId: id(),
    entryId,
    contentType: "image/jpeg",
    byteSize: body.length,
    sha256: sha256(body),
    ...overrides,
  };
}

async function requestUrl(
  req: UploadRequest,
  user = RUBY,
): Promise<{ url: string; objectKey: string }> {
  const result = await media.requestUpload(user, req);
  if (result.status !== "upload") throw new Error(`expected upload, got ${result.status}`);
  return result;
}

const purgeQueue = async () =>
  (
    await db.query<{ object_key: string; attempts: number }>(
      "select object_key, attempts from media_purge_queue",
    )
  ).rows;

beforeAll(async () => {
  s3 = createS3Client();
  await waitForStorage();
  await createBucket(s3, BUCKET);
  db = await createDatabase();
  await db.query(
    "insert into app_user (id, email, password_hash) values ($1, 'r@example.test', 'x'), ($2, 's@example.test', 'x')",
    [RUBY, SAPPHIRE],
  );
  await db.query("insert into relationship (id) values ($1)", [GARNET]);
  await db.query(
    "insert into relationship_member (relationship_id, user_id) values ($1, $2), ($1, $3)",
    [GARNET, RUBY, SAPPHIRE],
  );
  media = new MediaService(db, s3, BUCKET);
}, 90_000);

afterAll(() => {
  try {
    unpauseStorage();
  } catch {
    // not paused
  }
});

describe("storage enforces authentication (precondition for every presigned-URL result)", () => {
  it("rejects an unsigned PUT and a tampered signature", async () => {
    const unsigned = await rawPut(`${process.env["F07_S3_ENDPOINT"] ?? ""}/${BUCKET}/x`, jpeg(10), {
      contentType: "image/jpeg",
    });
    expect(unsigned.status).toBe(403);

    const url = await presignPut(s3, {
      bucket: BUCKET,
      key: "tampered",
      contentType: "image/jpeg",
      byteSize: 10,
      expiresIn: 60,
    });
    const tampered = url.replace(/X-Amz-Signature=[0-9a-f]{4}/, "X-Amz-Signature=0000");
    expect((await rawPut(tampered, jpeg(10), { contentType: "image/jpeg" })).status).toBe(403);
    expect(await objectExists(s3, BUCKET, "tampered")).toBe(false);
  });
});

describe("happy path", () => {
  it("request → presigned PUT → commit → ready, with matching stored bytes", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });
    expect(sha256(await readObject(s3, BUCKET, objectKey)).equals(req.sha256)).toBe(true);
    expect(media.readyTransitions.get(req.mediaId)).toBe(1);
  });
});

describe("interrupted and retried uploads", () => {
  it("an upload cut off mid-body stores nothing; retrying the same logical upload succeeds once", async () => {
    const body = jpeg(512 * 1024);
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);

    const cut = await rawPut(url, body, { contentType: "image/jpeg", abortAfterBytes: 100 * 1024 });
    expect(cut.status).toBe("aborted");
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "not-uploaded" });
    expect((await media.findMedia(req.mediaId))?.status).toBe("pending_upload");

    // Retry: the client asks again with the same media id (e.g. after an app restart).
    const retry = await requestUrl(req);
    expect(retry.objectKey).toBe(objectKey);
    expect((await rawPut(retry.url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });

    const rows = await db.query("select 1 from media where id = $1", [req.mediaId]);
    expect(rows.rows).toHaveLength(1);
    expect(media.readyTransitions.get(req.mediaId)).toBe(1);
  });

  it("re-uploading the same object (duplicate PUT) is harmless: same key, same bytes", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });
    expect((await listKeys(s3, BUCKET)).filter((k) => k === objectKey)).toHaveLength(1);
  });

  it("an expired presigned URL is refused; a retry obtains a fresh URL for the same object", async () => {
    const shortLived = new MediaService(db, s3, BUCKET, 1);
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const first = await shortLived.requestUpload(RUBY, req);
    if (first.status !== "upload") throw new Error("expected upload");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect((await rawPut(first.url, body, { contentType: "image/jpeg" })).status).toBe(403);

    const again = await requestUrl(req);
    expect(again.objectKey).toBe(first.objectKey);
    expect((await rawPut(again.url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });
  });
});

describe("repeated requests and duplicate finalization", () => {
  it("repeating the upload request never creates a second media row or object key", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const keys = new Set<string>();
    for (let i = 0; i < 5; i++) keys.add((await requestUrl(req)).objectKey);
    expect(keys.size).toBe(1);
    expect((await db.query("select 1 from media where id = $1", [req.mediaId])).rows).toHaveLength(
      1,
    );
  });

  it("reusing a media id with different parameters is rejected", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    await requestUrl(req);
    expect(await media.requestUpload(RUBY, { ...req, byteSize: req.byteSize + 1 })).toEqual({
      status: "rejected",
      reason: "media-id-reuse",
    });
  });

  it("repeated and concurrent commits all answer ready but finalize exactly once", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url } = await requestUrl(req);
    await rawPut(url, body, { contentType: "image/jpeg" });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => media.commit(RUBY, req.entryId, req.mediaId)),
    );
    expect(results.every((r) => r.status === "ready")).toBe(true);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });
    expect(media.readyTransitions.get(req.mediaId)).toBe(1);
  });

  it("only the entry's author can register media; the partner cannot", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(RUBY), body);
    await expect(media.requestUpload(SAPPHIRE, req)).rejects.toMatchObject({ code: "42501" });
  });
});

describe("commit validation (what landed in storage, not what the client claimed)", () => {
  it("wrong content (not a JPEG) is rejected and the object deleted", async () => {
    const body = randomBytes(2048); // no JPEG magic bytes
    body[0] = 0x00;
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({
      status: "rejected",
      reason: "content-type-mismatch",
    });
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
    expect((await media.findMedia(req.mediaId))?.status).toBe("rejected");
  });

  it("bytes that don't match the declared checksum are rejected and deleted", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body, { sha256: sha256(jpeg()) });
    const { url, objectKey } = await requestUrl(req);
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({
      status: "rejected",
      reason: "checksum-mismatch",
    });
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
  });

  it("storage refuses a Content-Type different from the signed one", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    expect((await rawPut(url, body, { contentType: "image/png" })).status).toBe(403);
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
  });

  it("storage refuses a body whose size differs from the signed Content-Length (larger or smaller)", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    const bigger = Buffer.concat([body, randomBytes(4096)]);
    expect((await rawPut(url, bigger, { contentType: "image/jpeg" })).status).toBe(403);
    expect((await rawPut(url, body.subarray(0, 1024), { contentType: "image/jpeg" })).status).toBe(
      403,
    );
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
    expect((await media.findMedia(req.mediaId))?.status).toBe("pending_upload");
  });

  it("if a provider did NOT enforce the signed size, commit validation still rejects the object", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { objectKey } = await requestUrl(req);
    // Bypass the presigned URL to simulate a lax provider storing a wrong-sized object.
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
        Body: body.subarray(0, 1024),
        ContentType: "image/jpeg",
      }),
    );
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({
      status: "rejected",
      reason: "size-mismatch",
    });
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
  });

  it("unsupported types and out-of-range sizes are refused before any URL is issued", async () => {
    const entryId = await newEntry();
    expect(
      (
        await media.requestUpload(
          RUBY,
          uploadRequest(entryId, jpeg(), { contentType: "text/html" }),
        )
      ).status,
    ).toBe("rejected");
    expect(
      (
        await media.requestUpload(
          RUBY,
          uploadRequest(entryId, jpeg(), { byteSize: 6 * 1024 * 1024 }),
        )
      ).status,
    ).toBe("rejected");
  });
});

describe("transient storage outages (container paused)", () => {
  it("an upload during an outage fails; after recovery the retry succeeds", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url } = await requestUrl(req);
    pauseStorage();
    try {
      const during = await rawPut(url, body, { contentType: "image/jpeg", timeoutMs: 1500 });
      expect(during.status === "timeout" || during.status === "network-error").toBe(true);
    } finally {
      unpauseStorage();
    }
    await waitForStorage();
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });
  });

  it("a commit during an outage throws without changing state; the retry finalizes once", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url } = await requestUrl(req);
    await rawPut(url, body, { contentType: "image/jpeg" });

    const fragile = new MediaService(
      db,
      createS3Client({ timeoutMs: 1000, maxAttempts: 1 }),
      BUCKET,
    );
    pauseStorage();
    try {
      await expect(fragile.commit(RUBY, req.entryId, req.mediaId)).rejects.toBeTruthy();
    } finally {
      unpauseStorage();
    }
    await waitForStorage();
    expect((await media.findMedia(req.mediaId))?.status).toBe("pending_upload");
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "ready" });
    expect(media.readyTransitions.get(req.mediaId)).toBe(1);
  });

  it("a purge during an outage stays queued with an attempt count, then completes", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    await rawPut(url, body, { contentType: "image/jpeg" });
    await media.commit(RUBY, req.entryId, req.mediaId);
    await asUser(db, RUBY, (tx) => tx.query("delete from entry where id = $1", [req.entryId]));

    const fragile = new MediaService(
      db,
      createS3Client({ timeoutMs: 1000, maxAttempts: 1 }),
      BUCKET,
    );
    pauseStorage();
    try {
      expect(await fragile.runPurge()).toMatchObject({ failed: 1 });
    } finally {
      unpauseStorage();
    }
    await waitForStorage();
    expect((await purgeQueue()).find((q) => q.object_key === objectKey)?.attempts).toBe(1);
    expect(await media.runPurge()).toMatchObject({ purged: 1, failed: 0 });
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
  });
});

describe("deletion and cleanup", () => {
  it("after the entry is deleted: request and commit answer gone; the object is purged", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    await rawPut(url, body, { contentType: "image/jpeg" });
    await media.commit(RUBY, req.entryId, req.mediaId);

    await asUser(db, SAPPHIRE, (tx) => tx.query("delete from entry where id = $1", [req.entryId]));
    expect(await media.requestUpload(RUBY, req)).toEqual({ status: "gone" });
    expect(await media.commit(RUBY, req.entryId, req.mediaId)).toEqual({ status: "gone" });
    expect((await purgeQueue()).map((q) => q.object_key)).toContain(objectKey);
    await media.runPurge();
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
    expect(await purgeQueue()).toEqual([]);
  });

  it("FINDING: a still-valid presigned URL can upload AFTER deletion and purge; reconciliation removes the orphan", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    await asUser(db, RUBY, (tx) => tx.query("delete from entry where id = $1", [req.entryId]));
    await media.runPurge(); // object did not exist yet: nothing to delete

    // A stale device finishes its upload with the URL it already holds.
    expect((await rawPut(url, body, { contentType: "image/jpeg" })).status).toBe(200);
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(true); // orphan: no row references it

    expect(await media.reconcileStorage()).toContain(objectKey);
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
  });

  it("an upload that is never committed is swept as an orphan and its object purged", async () => {
    const body = jpeg();
    const req = uploadRequest(await newEntry(), body);
    const { url, objectKey } = await requestUrl(req);
    await rawPut(url, body, { contentType: "image/jpeg" });
    await db.query("update media set created_at = now() - interval '2 days' where id = $1", [
      req.mediaId,
    ]);

    expect(await media.sweepPendingOlderThan(24 * 3600)).toBeGreaterThanOrEqual(1);
    expect(await media.findMedia(req.mediaId)).toBeUndefined();
    await media.runPurge();
    expect(await objectExists(s3, BUCKET, objectKey)).toBe(false);
  });
});

describe("final consistency between metadata and storage", () => {
  it("every ready row has its exact bytes stored, and every stored object belongs to a row", async () => {
    await media.runPurge();
    await media.reconcileStorage();
    const rows = (
      await db.query<{ object_key: string; status: string; sha256: Uint8Array }>(
        "select object_key, status, sha256 from media",
      )
    ).rows;
    const keys = new Set(await listKeys(s3, BUCKET));

    for (const row of rows.filter((r) => r.status === "ready")) {
      expect(keys.has(row.object_key)).toBe(true);
      expect(
        sha256(await readObject(s3, BUCKET, row.object_key)).equals(Buffer.from(row.sha256)),
      ).toBe(true);
    }
    for (const row of rows.filter((r) => r.status === "rejected")) {
      expect(keys.has(row.object_key)).toBe(false);
    }
    const referenced = new Set(rows.map((r) => r.object_key));
    for (const key of keys) expect(referenced.has(key)).toBe(true);
    expect(await purgeQueue()).toEqual([]);
    for (const count of media.readyTransitions.values()) expect(count).toBe(1);
  });
});
