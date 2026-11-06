import { Inject, Injectable } from "@nestjs/common";
import type { Kysely } from "kysely";
import { KYSELY, type Database } from "../db/database";
import { OBJECT_STORAGE, type ObjectStorage } from "./storage/object-storage";

@Injectable()
export class MediaPurgeService {
  private readonly bucket: string;

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {
    this.bucket = process.env["GARNET_MEDIA_BUCKET"] ?? "garnet-media";
  }

  /**
   * Processes the media_purge_queue transactional outbox (ADR-0005, F-07).
   * Attempts deletion from S3; increments attempt counter on failure, removes on success.
   */
  async runPurge(): Promise<{ purged: number; failed: number }> {
    const queue = await this.db
      .selectFrom("media_purge_queue")
      .select(["object_key", "attempts"])
      .orderBy("enqueued_at", "asc")
      .execute();

    let purged = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        await this.storage.deleteObject(this.bucket, item.object_key);
        await this.db
          .deleteFrom("media_purge_queue")
          .where("object_key", "=", item.object_key)
          .execute();
        purged++;
      } catch (error) {
        if (isNotFound(error)) {
          // Already gone from storage
          await this.db
            .deleteFrom("media_purge_queue")
            .where("object_key", "=", item.object_key)
            .execute();
          purged++;
        } else {
          await this.db
            .updateTable("media_purge_queue")
            .set({ attempts: item.attempts + 1 })
            .where("object_key", "=", item.object_key)
            .execute();
          failed++;
        }
      }
    }

    return { purged, failed };
  }

  /**
   * Sweeps uncommitted uploads older than the specified seconds (default 24h).
   * Deletion from media table fires media_enqueue_purge() trigger.
   */
  async sweepPendingOlderThan(seconds = 86400): Promise<number> {
    const cutoff = new Date(Date.now() - seconds * 1000);
    const deleted = await this.db
      .deleteFrom("media")
      .where("status", "=", "pending_upload")
      .where("created_at", "<", cutoff)
      .executeTakeFirst();

    return Number(deleted.numDeletedRows);
  }

  /**
   * Storage reconciliation: removes objects in storage that have no row in the database.
   * Resolves late uploads that landed after an entry was already deleted (F-07 finding 1, P-38).
   */
  async reconcileStorage(): Promise<string[]> {
    const dbRows = await this.db.selectFrom("media").select("object_key").execute();
    const knownKeys = new Set(dbRows.map((r) => r.object_key));

    const storedKeys = await this.storage.listKeys(this.bucket);
    const orphans = storedKeys.filter((key) => !knownKeys.has(key));

    for (const orphan of orphans) {
      await this.storage.deleteObject(this.bucket, orphan);
    }

    return orphans;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("name" in error
      ? (error as { name?: string }).name === "NotFound" ||
        (error as { name?: string }).name === "NoSuchKey"
      : false)
  );
}
