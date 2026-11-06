import { describe, expect, it } from "vitest";
import { commitMediaSchema, requestUploadSchema } from "./media";

describe("Media Contracts (B7, B-41)", () => {
  it("validates valid upload request", () => {
    const valid = requestUploadSchema.safeParse({
      id: "0192e2b3-5798-7521-8254-e6be95232a93",
      contentType: "image/jpeg",
      byteSize: 1024 * 500,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      entityType: "chat_message",
      entityId: "0192e2b3-5798-7521-8254-e6be95232a94",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid sha256 or zero byte size", () => {
    const invalidSha = requestUploadSchema.safeParse({
      contentType: "image/jpeg",
      byteSize: 500,
      sha256: "not-a-hex-sha256",
      entityId: "0192e2b3-5798-7521-8254-e6be95232a94",
    });
    expect(invalidSha.success).toBe(false);

    const zeroSize = requestUploadSchema.safeParse({
      contentType: "image/jpeg",
      byteSize: 0,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      entityId: "0192e2b3-5798-7521-8254-e6be95232a94",
    });
    expect(zeroSize.success).toBe(false);
  });

  it("validates commit payload carrying entityId", () => {
    const commit = commitMediaSchema.safeParse({
      entityId: "0192e2b3-5798-7521-8254-e6be95232a94",
      width: 1920,
      height: 1080,
    });
    expect(commit.success).toBe(true);
  });
});
