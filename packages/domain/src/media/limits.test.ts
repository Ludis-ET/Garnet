import { describe, expect, it } from "vitest";
import { CONSERVATIVE_MEDIA_LIMITS, GENEROUS_MEDIA_LIMITS, validateMediaLimits } from "./limits";

describe("Media Limits (U-08)", () => {
  it("validates within conservative limits", () => {
    // 4MB JPEG is valid
    const photo = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "image/jpeg",
      byteSize: 4 * 1024 * 1024,
    });
    expect(photo.valid).toBe(true);

    // 20MB MP4 under 30s is valid
    const video = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "video/mp4",
      byteSize: 20 * 1024 * 1024,
      durationSeconds: 25,
    });
    expect(video.valid).toBe(true);

    // 3MB voice note under 60s is valid
    const voice = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "audio/mp4",
      byteSize: 3 * 1024 * 1024,
      durationSeconds: 45,
    });
    expect(voice.valid).toBe(true);
  });

  it("rejects over-limit files under conservative policy", () => {
    // 6MB photo exceeds 5MB conservative cap
    const photoOver = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "image/jpeg",
      byteSize: 6 * 1024 * 1024,
    });
    expect(photoOver).toEqual({ valid: false, reason: "size-limit-exceeded" });

    // Video duration exceeds 30s
    const videoDuration = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "video/mp4",
      byteSize: 10 * 1024 * 1024,
      durationSeconds: 45,
    });
    expect(videoDuration).toEqual({ valid: false, reason: "duration-limit-exceeded" });

    // Voice duration exceeds 60s
    const voiceDuration = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "audio/mp4",
      byteSize: 2 * 1024 * 1024,
      durationSeconds: 70,
    });
    expect(voiceDuration).toEqual({ valid: false, reason: "duration-limit-exceeded" });
  });

  it("validates higher-capacity files under generous policy", () => {
    // 10MB photo is valid under generous (cap: 15MB)
    const photo = validateMediaLimits(GENEROUS_MEDIA_LIMITS, {
      contentType: "image/jpeg",
      byteSize: 10 * 1024 * 1024,
    });
    expect(photo.valid).toBe(true);

    // 80MB video for 90s is valid under generous (cap: 100MB / 120s)
    const video = validateMediaLimits(GENEROUS_MEDIA_LIMITS, {
      contentType: "video/mp4",
      byteSize: 80 * 1024 * 1024,
      durationSeconds: 90,
    });
    expect(video.valid).toBe(true);

    // 10MB voice note for 180s is valid under generous (cap: 15MB / 300s)
    const voice = validateMediaLimits(GENEROUS_MEDIA_LIMITS, {
      contentType: "audio/aac",
      byteSize: 10 * 1024 * 1024,
      durationSeconds: 180,
    });
    expect(voice.valid).toBe(true);
  });

  it("rejects unsupported MIME types on both policies", () => {
    const exe = validateMediaLimits(GENEROUS_MEDIA_LIMITS, {
      contentType: "application/x-msdownload",
      byteSize: 1000,
    });
    expect(exe).toEqual({ valid: false, reason: "unsupported-content-type" });

    const pdf = validateMediaLimits(CONSERVATIVE_MEDIA_LIMITS, {
      contentType: "application/pdf",
      byteSize: 1000,
    });
    expect(pdf).toEqual({ valid: false, reason: "unsupported-content-type" });
  });
});
