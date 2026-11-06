import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import type {
  CommitMediaResponse,
  MediaUrlResponse,
  RequestUploadResponse,
} from "@garnet/contracts";
import { startTestApi, type TestApi } from "./harness";

describe("Media Pipeline & Storage (B7, B-41, B-42, ADR-0005, P-12, P-21, P-38)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  it("completes full happy path: register -> upload -> commit with EXIF strip -> view", async () => {
    const ENTITY_ID = "0192e2b3-5798-7521-8254-e6be95232b01";
    // Construct a JPEG containing simulated GPS metadata in APP1 segment
    const rawJpeg = Buffer.from([
      0xff,
      0xd8, // SOI
      0xff,
      0xe1,
      0x00,
      0x08,
      0x45,
      0x78,
      0x69,
      0x66,
      0x00,
      0x00, // APP1 with Exif
      0xff,
      0xdb,
      0x00,
      0x05,
      0x01,
      0x02,
      0x03, // DQT
      0xff,
      0xda,
      0x00,
      0x04,
      0x09,
      0x09, // SOS
      0x12,
      0x34, // scan
      0xff,
      0xd9, // EOI
    ]);
    const sha256 = createHash("sha256").update(rawJpeg).digest("hex");

    // 1. Request upload URL
    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: rawJpeg.length,
        sha256,
        entityType: "chat_message",
        entityId: ENTITY_ID,
      },
    });
    expect(upRes.statusCode).toBe(201);
    const upData = upRes.json<RequestUploadResponse>();
    expect(upData.id).toBeDefined();
    expect(upData.uploadUrl).toContain(upData.objectKey);

    // 2. Simulate mobile app putting binary to storage
    const bucket = process.env["GARNET_MEDIA_BUCKET"] ?? "garnet-media";
    await api.objectStorage.putObject(bucket, upData.objectKey, rawJpeg, "image/jpeg");

    // 3. Commit upload
    const commitRes = await api.call("POST", `/v1/media/${upData.id}/commit`, {
      cookie: api.cookies.selam,
      body: { entityId: ENTITY_ID, width: 800, height: 600 },
    });
    expect(commitRes.statusCode).toBe(200);
    const commitData = commitRes.json<CommitMediaResponse>();
    expect(commitData.status).toBe("ready");
    expect(commitData.media?.width).toBe(800);
    expect(commitData.media?.height).toBe(600);
    expect(commitData.media?.type).toBe("photo");

    // Verify EXIF was stripped from storage object (P-21)
    const storedBytes = await api.objectStorage.readObject(bucket, upData.objectKey);
    expect(storedBytes.toString("ascii")).not.toContain("Exif");
    expect(storedBytes.length).toBeLessThan(rawJpeg.length);

    // 4. Partner can get download URL for ready media
    const urlRes = await api.call("GET", `/v1/media/${upData.id}/url`, {
      cookie: api.cookies.noah,
    });
    expect(urlRes.statusCode).toBe(200);
    const urlData = urlRes.json<MediaUrlResponse>();
    expect(urlData.url).toContain(upData.objectKey);
  });

  it("rejects commit when uploaded bytes do not match declared size or checksum", async () => {
    const ENTITY_ID = "0192e2b3-5798-7521-8254-e6be95232b02";
    const declaredBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const declaredSha = createHash("sha256").update(declaredBytes).digest("hex");

    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: declaredBytes.length,
        sha256: declaredSha,
        entityType: "chat_message",
        entityId: ENTITY_ID,
      },
    });
    const { id, objectKey } = upRes.json<RequestUploadResponse>();
    const bucket = process.env["GARNET_MEDIA_BUCKET"] ?? "garnet-media";

    // Upload mismatched bytes
    const corruptBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x99]);
    await api.objectStorage.putObject(bucket, objectKey, corruptBytes, "image/jpeg");

    const commitRes = await api.call("POST", `/v1/media/${id}/commit`, {
      cookie: api.cookies.selam,
      body: { entityId: ENTITY_ID },
    });
    expect(commitRes.statusCode).toBe(200);
    const commitData = commitRes.json<CommitMediaResponse>();
    expect(commitData.status).toBe("rejected");
    expect(commitData.reason).toBe("checksum-mismatch");

    // The corrupted object was purged from storage
    expect(await api.objectStorage.objectExists(bucket, objectKey)).toBe(false);
  });

  it("handles parent deletion before commit: answers gone and purges (P-38 finding 3)", async () => {
    const ENTITY_ID = "0192e2b3-5798-7521-8254-e6be95232b03";
    const testBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const sha256 = createHash("sha256").update(testBytes).digest("hex");

    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: testBytes.length,
        sha256,
        entityType: "entry",
        entityId: ENTITY_ID,
      },
    });
    const { id } = upRes.json<RequestUploadResponse>();

    // Entity is deleted (tombstone written)
    await api.db.query(
      "insert into tombstone (relationship_id, entity_type, entity_id) values ((select relationship_id from relationship_member limit 1), 'entry', $1)",
      [ENTITY_ID],
    );

    const commitRes = await api.call("POST", `/v1/media/${id}/commit`, {
      cookie: api.cookies.selam,
      body: { entityId: ENTITY_ID },
    });
    expect(commitRes.statusCode).toBe(200);
    expect(commitRes.json()).toMatchObject({ status: "gone" });
  });

  it("cascades deletion into purge queue and purge worker executes deletion (B-42)", async () => {
    const ENTITY_ID = "0192e2b3-5798-7521-8254-e6be95232b04";
    const testBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const sha256 = createHash("sha256").update(testBytes).digest("hex");

    const upRes = await api.call("POST", "/v1/media/upload", {
      cookie: api.cookies.selam,
      body: {
        contentType: "image/jpeg",
        byteSize: testBytes.length,
        sha256,
        entityType: "chat_message",
        entityId: ENTITY_ID,
      },
    });
    const { id, objectKey } = upRes.json<RequestUploadResponse>();
    const bucket = process.env["GARNET_MEDIA_BUCKET"] ?? "garnet-media";
    await api.objectStorage.putObject(bucket, objectKey, testBytes, "image/jpeg");

    // Commit to ready
    await api.call("POST", `/v1/media/${id}/commit`, {
      cookie: api.cookies.selam,
      body: { entityId: ENTITY_ID },
    });
    expect(await api.objectStorage.objectExists(bucket, objectKey)).toBe(true);

    // Delete media row
    const delRes = await api.call("DELETE", `/v1/media/${id}`, {
      cookie: api.cookies.selam,
    });
    expect(delRes.statusCode).toBe(204);

    // Database trigger media_enqueue_purge() enqueued object_key
    const queueRows = await api.db.query<{ object_key: string }>(
      "select object_key from media_purge_queue where object_key = $1",
      [objectKey],
    );
    expect(queueRows.rows.length).toBe(1);

    // Execute purge sweep
    const purgeRes = await api.call("POST", "/v1/media/admin/purge", {
      cookie: api.cookies.selam,
    });
    expect(purgeRes.statusCode).toBe(200);

    // Storage object is gone and queue is cleared
    expect(await api.objectStorage.objectExists(bucket, objectKey)).toBe(false);
    const queueAfter = await api.db.query("select 1 from media_purge_queue where object_key = $1", [
      objectKey,
    ]);
    expect(queueAfter.rows.length).toBe(0);
  });
});
