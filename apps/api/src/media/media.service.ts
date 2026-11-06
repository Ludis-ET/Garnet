import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type {
  CommitMediaDto,
  CommitMediaResponse,
  MediaUrlResponse,
  RequestUploadDto,
  RequestUploadResponse,
} from "@garnet/contracts";
import {
  GENEROUS_MEDIA_LIMITS,
  stripImageMetadata,
  validateMediaLimits,
  type MediaLimitsPolicy,
} from "@garnet/domain";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";
import { OBJECT_STORAGE, type ObjectStorage } from "./storage/object-storage";

const MAGIC_BYTES: Record<string, readonly number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

@Injectable()
export class MediaService {
  private readonly bucket: string;
  private readonly limitsPolicy: MediaLimitsPolicy;

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {
    this.bucket = process.env["GARNET_MEDIA_BUCKET"] ?? "garnet-media";
    // U-08 policy: generous limits by default in prototype, customizable per deployment
    this.limitsPolicy = GENEROUS_MEDIA_LIMITS;
  }

  /** Step 1: Register an upload and acquire a short-lived presigned PUT URL (ADR-0005, P-12). */
  async requestUpload(viewer: Viewer, input: RequestUploadDto): Promise<RequestUploadResponse> {
    const limitsCheck = validateMediaLimits(this.limitsPolicy, {
      contentType: input.contentType,
      byteSize: input.byteSize,
    });
    if (!limitsCheck.valid) {
      throw new BadRequestException({
        code: "GN422",
        message: `Upload exceeds limits: ${limitsCheck.reason}`,
      });
    }

    const relationshipRow = await this.db
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", viewer.userId)
      .where("left_at", "is", null)
      .executeTakeFirst();

    if (!relationshipRow) {
      throw new NotFoundException({ code: "GN404", message: "Relationship not found" });
    }
    const relationshipId = relationshipRow.relationship_id;

    // Check parent entity tombstone (§11, P-38 finding 3)
    const isTombstoned = await this.isTombstoned(relationshipId, input.entityId);
    if (isTombstoned) {
      throw new GoneException({ code: "GN410", message: "Entity has been deleted" });
    }

    const mediaId = input.id ?? randomUUID();
    const shaBuffer = Buffer.from(input.sha256, "hex");

    // Idempotent retry: check if a media record with this ID already exists
    const existing = await this.db
      .selectFrom("media")
      .selectAll()
      .where("id", "=", mediaId)
      .executeTakeFirst();

    let objectKey: string;

    if (existing) {
      // Must match original request params
      const sameParams =
        existing.uploader_id === viewer.userId &&
        existing.content_type === input.contentType &&
        Number(existing.byte_size) === input.byteSize &&
        Buffer.from(existing.sha256).equals(shaBuffer);

      if (!sameParams) {
        throw new BadRequestException({ code: "GN400", message: "media-id-reuse" });
      }
      objectKey = existing.object_key;
    } else {
      objectKey = `media/${randomUUID()}`;
      await asViewer(this.db, viewer, async (trx) => {
        await trx
          .insertInto("media")
          .values({
            id: mediaId,
            relationship_id: relationshipId,
            uploader_id: viewer.userId,
            object_key: objectKey,
            content_type: input.contentType,
            byte_size: input.byteSize,
            sha256: shaBuffer,
            status: "pending_upload",
            entity_type: input.entityType,
            entity_id: input.entityId,
            entry_id: input.entityType === "entry" ? input.entityId : null,
            chat_message_id: input.entityType === "chat_message" ? input.entityId : null,
            width: null,
            height: null,
            duration_seconds: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
      });
    }

    const expiresIn = 300; // 5 minutes (P-38)
    const uploadUrl = await this.storage.presignPut({
      bucket: this.bucket,
      key: objectKey,
      contentType: input.contentType,
      byteSize: input.byteSize,
      expiresIn,
    });

    return {
      id: mediaId,
      uploadUrl,
      objectKey,
      expiresInSeconds: expiresIn,
    };
  }

  /** Step 2: Validate uploaded bytes, strip EXIF, and commit exactly once (ADR-0005, P-21, P-38). */
  async commit(
    viewer: Viewer,
    mediaId: string,
    input: CommitMediaDto,
  ): Promise<CommitMediaResponse> {
    const relationshipRow = await this.db
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", viewer.userId)
      .where("left_at", "is", null)
      .executeTakeFirst();

    if (!relationshipRow) {
      throw new NotFoundException({ code: "GN404", message: "Relationship not found" });
    }
    const relationshipId = relationshipRow.relationship_id;

    // Finding 3 (P-38): Check if parent entity was tombstoned during upload
    if (await this.isTombstoned(relationshipId, input.entityId)) {
      return { status: "gone", reason: "entity-deleted" };
    }

    const row = await this.db
      .selectFrom("media")
      .selectAll()
      .where("id", "=", mediaId)
      .where("relationship_id", "=", relationshipId)
      .executeTakeFirst();

    if (row?.uploader_id !== viewer.userId) {
      return { status: "rejected", reason: "not-found" };
    }

    if (row.status === "ready") {
      const url = await this.storage.presignGet({
        bucket: this.bucket,
        key: row.object_key,
        expiresIn: 900,
      });
      return {
        status: "ready",
        media: {
          id: row.id,
          type: resolveMediaType(row.content_type),
          url,
          ...(row.width ? { width: row.width } : {}),
          ...(row.height ? { height: row.height } : {}),
          ...(row.duration_seconds ? { durationSeconds: row.duration_seconds } : {}),
        },
      };
    }

    if (row.status === "rejected") {
      return { status: "rejected", reason: "previously-rejected" };
    }

    // Check if object exists in storage
    const exists = await this.storage.objectExists(this.bucket, row.object_key);
    if (!exists) {
      return { status: "not-uploaded", reason: "storage-object-missing" };
    }

    // Read bytes and validate
    const bytes = await this.storage.readObject(this.bucket, row.object_key);

    // 1. Size check
    if (bytes.length !== Number(row.byte_size)) {
      await this.storage.deleteObject(this.bucket, row.object_key);
      await this.markRejected(row.id);
      return { status: "rejected", reason: "size-mismatch" };
    }

    // 2. Magic bytes check (for formats with known magic prefixes)
    const expectedMagic = MAGIC_BYTES[row.content_type];
    if (expectedMagic?.every((b, i) => bytes[i] === b) === false) {
      await this.storage.deleteObject(this.bucket, row.object_key);
      await this.markRejected(row.id);
      return { status: "rejected", reason: "content-type-mismatch" };
    }

    // 3. Checksum verification
    const computedSha = createHash("sha256").update(bytes).digest();
    if (!computedSha.equals(Buffer.from(row.sha256))) {
      await this.storage.deleteObject(this.bucket, row.object_key);
      await this.markRejected(row.id);
      return { status: "rejected", reason: "checksum-mismatch" };
    }

    // 4. Strip location & device EXIF metadata from photos (P-21)
    if (row.content_type.startsWith("image/")) {
      const stripped = stripImageMetadata(new Uint8Array(bytes), row.content_type);
      if (stripped.length !== bytes.length) {
        await this.storage.putObject(
          this.bucket,
          row.object_key,
          Buffer.from(stripped),
          row.content_type,
        );
      }
    }

    // Conditional update: ensure exactly-once pending_upload -> ready transition
    const updated = await this.db
      .updateTable("media")
      .set({
        status: "ready",
        width: input.width ?? null,
        height: input.height ?? null,
        duration_seconds: input.durationSeconds ?? null,
        updated_at: new Date(),
      })
      .where("id", "=", mediaId)
      .where("status", "=", "pending_upload")
      .executeTakeFirst();

    if (updated.numUpdatedRows === 0n) {
      // Re-read status if concurrent commit already updated it
      const current = await this.db
        .selectFrom("media")
        .select("status")
        .where("id", "=", mediaId)
        .executeTakeFirst();
      if (current?.status !== "ready") {
        return { status: "rejected", reason: "state-changed" };
      }
    }

    const downloadUrl = await this.storage.presignGet({
      bucket: this.bucket,
      key: row.object_key,
      expiresIn: 900,
    });

    return {
      status: "ready",
      media: {
        id: row.id,
        type: resolveMediaType(row.content_type),
        url: downloadUrl,
        ...(input.width ? { width: input.width } : {}),
        ...(input.height ? { height: input.height } : {}),
        ...(input.durationSeconds ? { durationSeconds: input.durationSeconds } : {}),
      },
    };
  }

  /** Generates an authorized presigned GET URL valid for 15 minutes. */
  async getDownloadUrl(viewer: Viewer, mediaId: string): Promise<MediaUrlResponse> {
    const relationshipRow = await this.db
      .selectFrom("relationship_member")
      .select("relationship_id")
      .where("user_id", "=", viewer.userId)
      .where("left_at", "is", null)
      .executeTakeFirst();

    if (!relationshipRow) {
      throw new NotFoundException({ code: "GN404", message: "Relationship not found" });
    }

    const row = await this.db
      .selectFrom("media")
      .select(["id", "object_key", "status", "uploader_id"])
      .where("id", "=", mediaId)
      .where("relationship_id", "=", relationshipRow.relationship_id)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException({ code: "GN404", message: "Media not found" });
    }

    // Partner can only access if 'ready'; uploader can also view their own 'pending_upload'
    if (row.status !== "ready" && row.uploader_id !== viewer.userId) {
      throw new NotFoundException({ code: "GN404", message: "Media not available" });
    }

    const expiresIn = 900; // 15 minutes
    const url = await this.storage.presignGet({
      bucket: this.bucket,
      key: row.object_key,
      expiresIn,
    });

    return { url, expiresInSeconds: expiresIn };
  }

  /** Explicitly delete a media row (cascades to media_purge_queue trigger). */
  async deleteMedia(viewer: Viewer, mediaId: string): Promise<void> {
    await asViewer(this.db, viewer, async (trx) => {
      await trx.deleteFrom("media").where("id", "=", mediaId).execute();
    });
  }

  private async markRejected(id: string): Promise<void> {
    await this.db
      .updateTable("media")
      .set({ status: "rejected", updated_at: new Date() })
      .where("id", "=", id)
      .execute();
  }

  private async isTombstoned(relationshipId: string, entityId: string): Promise<boolean> {
    const tomb = await this.db
      .selectFrom("tombstone")
      .select("entity_id")
      .where("relationship_id", "=", relationshipId)
      .where("entity_id", "=", entityId)
      .executeTakeFirst();
    return tomb !== undefined;
  }
}

function resolveMediaType(contentType: string): "photo" | "video" | "voice" {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "voice";
  return "photo";
}
