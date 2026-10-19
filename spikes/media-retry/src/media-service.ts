import type { PGlite } from "@electric-sql/pglite";
import type { S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { asUser } from "../../data-model/src/db";
import {
  deleteObject,
  isNotFound,
  listKeys,
  objectExists,
  presignPut,
  readObject,
} from "./storage";

/**
 * Reference model of the ADR-0005 media flow for spike F-07. NOT the production service:
 * no HTTP layer, no thumbnails or EXIF stripping, single-connection database (PGlite).
 *
 * Metadata lives in the F-05 draft schema (`media`, `media_purge_queue`, `tombstone`), so the
 * spike exercises the real draft triggers and RLS. Storage is real S3-compatible storage.
 */

/** Spike-only limits; first-release limits are undecided (U-08). */
export const SPIKE_MAX_BYTES = 5 * 1024 * 1024;
const MAGIC: Record<string, readonly number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

export interface UploadRequest {
  readonly mediaId: string;
  readonly entryId: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly sha256: Buffer;
}

export type RequestUploadResult =
  | { readonly status: "upload"; readonly url: string; readonly objectKey: string }
  | { readonly status: "ready" }
  | { readonly status: "rejected"; readonly reason: string }
  | { readonly status: "gone" };

export type CommitResult =
  | { readonly status: "ready" }
  | { readonly status: "rejected"; readonly reason: string }
  | { readonly status: "not-uploaded" }
  | { readonly status: "gone" }
  | { readonly status: "not-found" };

interface MediaRow {
  id: string;
  entry_id: string;
  uploader_id: string;
  object_key: string;
  content_type: string;
  byte_size: number | string;
  sha256: Uint8Array;
  status: "pending_upload" | "ready" | "rejected";
}

export const sha256 = (data: Buffer): Buffer => createHash("sha256").update(data).digest();

export class MediaService {
  /** Counts pending_upload → ready transitions per media id (must never exceed 1). */
  readonly readyTransitions = new Map<string, number>();

  constructor(
    private readonly db: PGlite,
    private readonly s3: S3Client,
    private readonly bucket: string,
    private readonly presignTtlSeconds = 300,
  ) {}

  /**
   * Step 1 (and every retry): register the upload and get a presigned PUT. Idempotent by
   * media id: a retry gets a fresh URL for the SAME object key, never a second row.
   */
  async requestUpload(userId: string, req: UploadRequest): Promise<RequestUploadResult> {
    if (await this.isEntryDeleted(req.entryId)) return { status: "gone" };
    if (!(req.contentType in MAGIC)) return { status: "rejected", reason: "unsupported-type" };
    if (req.byteSize <= 0 || req.byteSize > SPIKE_MAX_BYTES) {
      return { status: "rejected", reason: "size-out-of-range" };
    }

    let row = await this.findMedia(req.mediaId);
    if (row === undefined) {
      const entry = await this.db.query<{ relationship_id: string }>(
        "select relationship_id from entry where id = $1",
        [req.entryId],
      );
      const relationshipId = entry.rows[0]?.relationship_id;
      if (relationshipId === undefined) return { status: "gone" };
      // Insert as the user: RLS requires the uploader to be the entry's author.
      await asUser(this.db, userId, (tx) =>
        tx.query(
          `insert into media (id, entry_id, relationship_id, uploader_id, object_key, content_type, byte_size, sha256)
           values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do nothing`,
          [
            req.mediaId,
            req.entryId,
            relationshipId,
            userId,
            `media/${randomUUID()}`,
            req.contentType,
            req.byteSize,
            req.sha256,
          ],
        ),
      );
      row = await this.findMedia(req.mediaId);
      if (row === undefined) throw new Error("media row missing after insert");
    }

    const sameRequest =
      row.uploader_id === userId &&
      row.entry_id === req.entryId &&
      row.content_type === req.contentType &&
      Number(row.byte_size) === req.byteSize &&
      Buffer.from(row.sha256).equals(req.sha256);
    if (!sameRequest) return { status: "rejected", reason: "media-id-reuse" };
    if (row.status === "ready") return { status: "ready" };
    if (row.status === "rejected") return { status: "rejected", reason: "previously-rejected" };

    const url = await presignPut(this.s3, {
      bucket: this.bucket,
      key: row.object_key,
      contentType: row.content_type,
      byteSize: Number(row.byte_size),
      expiresIn: this.presignTtlSeconds,
    });
    return { status: "upload", url, objectKey: row.object_key };
  }

  /**
   * Step 3: validate what actually landed in storage and finalize exactly once.
   * The request carries the entry id so a commit after deletion can answer `gone`
   * (media rows cascade away, so the media id alone could not tell "deleted" from "unknown").
   */
  async commit(userId: string, entryId: string, mediaId: string): Promise<CommitResult> {
    if (await this.isEntryDeleted(entryId)) return { status: "gone" };
    const row = await this.findMedia(mediaId);
    if (row?.entry_id !== entryId || row.uploader_id !== userId) return { status: "not-found" };
    if (row.status === "ready") return { status: "ready" };
    if (row.status === "rejected") return { status: "rejected", reason: "previously-rejected" };

    if (!(await objectExists(this.s3, this.bucket, row.object_key))) {
      return { status: "not-uploaded" };
    }
    const bytes = await readObject(this.s3, this.bucket, row.object_key);
    const reason = validate(bytes, row);
    if (reason !== null) {
      await deleteObject(this.s3, this.bucket, row.object_key);
      await this.db.query(
        "update media set status = 'rejected' where id = $1 and status = 'pending_upload'",
        [mediaId],
      );
      return { status: "rejected", reason };
    }

    // Conditional transition: concurrent or repeated commits finalize at most once.
    const updated = await this.db.query(
      "update media set status = 'ready' where id = $1 and status = 'pending_upload' returning id",
      [mediaId],
    );
    if (updated.rows.length === 1) {
      this.readyTransitions.set(mediaId, (this.readyTransitions.get(mediaId) ?? 0) + 1);
    }
    const final = await this.findMedia(mediaId);
    return final?.status === "ready"
      ? { status: "ready" }
      : { status: "rejected", reason: "state-changed" };
  }

  /** Purge worker: delete queued objects; keep failures queued with an attempt count. */
  async runPurge(): Promise<{ purged: number; failed: number }> {
    const queue = await this.db.query<{ object_key: string }>(
      "select object_key from media_purge_queue order by enqueued_at",
    );
    let purged = 0;
    let failed = 0;
    for (const { object_key } of queue.rows) {
      try {
        await deleteObject(this.s3, this.bucket, object_key);
        await this.db.query("delete from media_purge_queue where object_key = $1", [object_key]);
        purged++;
      } catch (error) {
        if (isNotFound(error)) {
          await this.db.query("delete from media_purge_queue where object_key = $1", [object_key]);
          purged++;
        } else {
          await this.db.query(
            "update media_purge_queue set attempts = attempts + 1 where object_key = $1",
            [object_key],
          );
          failed++;
        }
      }
    }
    return { purged, failed };
  }

  /** Orphan sweep: uncommitted uploads older than the threshold are deleted (purge is queued). */
  async sweepPendingOlderThan(seconds: number): Promise<number> {
    const removed = await this.db.query(
      `delete from media where status = 'pending_upload'
       and created_at < now() - make_interval(secs => $1) returning id`,
      [seconds],
    );
    return removed.rows.length;
  }

  /**
   * Storage reconciliation: delete objects that no media row references. Needed because a
   * presigned URL stays usable after its entry is deleted (see F-07 finding 1).
   */
  async reconcileStorage(): Promise<string[]> {
    const known = new Set(
      (await this.db.query<{ object_key: string }>("select object_key from media")).rows.map(
        (r) => r.object_key,
      ),
    );
    const orphans = (await listKeys(this.s3, this.bucket)).filter((key) => !known.has(key));
    for (const key of orphans) await deleteObject(this.s3, this.bucket, key);
    return orphans;
  }

  async findMedia(mediaId: string): Promise<MediaRow | undefined> {
    const result = await this.db.query<MediaRow>("select * from media where id = $1", [mediaId]);
    return result.rows[0];
  }

  private async isEntryDeleted(entryId: string): Promise<boolean> {
    const result = await this.db.query(
      "select 1 from tombstone where entity_type = 'entry' and entity_id = $1",
      [entryId],
    );
    return result.rows.length > 0;
  }
}

function validate(bytes: Buffer, row: MediaRow): string | null {
  if (bytes.length !== Number(row.byte_size)) return "size-mismatch";
  const magic = MAGIC[row.content_type];
  if (!magic?.every((b, i) => bytes[i] === b)) return "content-type-mismatch";
  if (!sha256(bytes).equals(Buffer.from(row.sha256))) return "checksum-mismatch";
  return null;
}
