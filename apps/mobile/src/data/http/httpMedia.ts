import {
  commitMediaResponseSchema,
  mediaUrlResponseSchema,
  requestUploadResponseSchema,
  type ChatMediaDto,
  type CommitMediaResponse,
  type MediaEntityType,
  type MediaUrlResponse,
  type RequestUploadDto,
  type RequestUploadResponse,
} from "@garnet/contracts";
import type { ApiClient } from "./client";

export interface HttpMediaUploader {
  requestUpload(input: RequestUploadDto): Promise<RequestUploadResponse>;
  uploadBinary(url: string, bytes: Uint8Array, contentType: string): Promise<void>;
  commit(
    mediaId: string,
    entityId: string,
    metadata?: { width?: number; height?: number; durationSeconds?: number },
  ): Promise<CommitMediaResponse>;
  getDownloadUrl(mediaId: string): Promise<string>;
  uploadAndCommit(
    file: { bytes: Uint8Array; contentType: string; sha256: string },
    entityType: MediaEntityType,
    entityId: string,
    metadata?: { width?: number; height?: number; durationSeconds?: number },
  ): Promise<ChatMediaDto>;
}

export function createHttpMedia(api: ApiClient): HttpMediaUploader {
  return {
    async requestUpload(input: RequestUploadDto): Promise<RequestUploadResponse> {
      return api.post<RequestUploadResponse>(
        "/v1/media/upload",
        requestUploadResponseSchema,
        input,
      );
    },

    async uploadBinary(url: string, bytes: Uint8Array, contentType: string): Promise<void> {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(bytes.byteLength),
        },
        body: bytes as unknown as BodyInit,
      });
      if (!res.ok) {
        throw new Error(`Direct storage upload failed with status ${res.status}`);
      }
    },

    async commit(
      mediaId: string,
      entityId: string,
      metadata?: { width?: number; height?: number; durationSeconds?: number },
    ): Promise<CommitMediaResponse> {
      return api.post<CommitMediaResponse>(
        `/v1/media/${mediaId}/commit`,
        commitMediaResponseSchema,
        {
          entityId,
          ...(metadata?.width ? { width: metadata.width } : {}),
          ...(metadata?.height ? { height: metadata.height } : {}),
          ...(metadata?.durationSeconds ? { durationSeconds: metadata.durationSeconds } : {}),
        },
      );
    },

    async getDownloadUrl(mediaId: string): Promise<string> {
      const res = await api.get<MediaUrlResponse>(
        `/v1/media/${mediaId}/url`,
        mediaUrlResponseSchema,
      );
      return res.url;
    },

    async uploadAndCommit(
      file: { bytes: Uint8Array; contentType: string; sha256: string },
      entityType: MediaEntityType,
      entityId: string,
      metadata?: { width?: number; height?: number; durationSeconds?: number },
    ): Promise<ChatMediaDto> {
      // 1. Request presigned upload
      const reg = await this.requestUpload({
        contentType: file.contentType,
        byteSize: file.bytes.byteLength,
        sha256: file.sha256,
        entityType,
        entityId,
      });

      // 2. Put directly to storage
      await this.uploadBinary(reg.uploadUrl, file.bytes, file.contentType);

      // 3. Commit
      const commitRes = await this.commit(reg.id, entityId, metadata);
      if (commitRes.status !== "ready" || !commitRes.media) {
        throw new Error(`Media commit failed: ${commitRes.reason ?? commitRes.status}`);
      }

      return {
        id: commitRes.media.id,
        type: commitRes.media.type,
        url: commitRes.media.url,
        ...(commitRes.media.width ? { width: commitRes.media.width } : {}),
        ...(commitRes.media.height ? { height: commitRes.media.height } : {}),
        ...(commitRes.media.durationSeconds
          ? { durationSeconds: commitRes.media.durationSeconds }
          : {}),
      };
    },
  };
}
