import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  findSignal,
  GENERIC_PREVIEW,
  notificationPreview,
  SIGNALS,
} from "./signals";

describe("signals catalog", () => {
  it("contains exactly the eight signals from the scope record, with unique ids", () => {
    expect(SIGNALS.map((s) => s.label)).toEqual([
      "I Thought of You",
      "Missing You",
      "I Need You",
      "I Need to Talk",
      "Just Listen",
      "Please Check On Me",
      "I Can't Talk Yet",
      "I'm Okay Now",
    ]);
    expect(new Set(SIGNALS.map((s) => s.id)).size).toBe(SIGNALS.length);
  });

  it("uses only the two notification levels", () => {
    expect(new Set(SIGNALS.map((s) => s.level))).toEqual(new Set(["gentle", "support"]));
  });
});

describe("notification previews", () => {
  it("defaults to generic previews and respected quiet hours", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      lockScreenPreview: "generic",
      quietHoursEnabled: true,
    });
  });

  it("generic previews reveal neither the signal nor its urgency", () => {
    for (const signal of SIGNALS) {
      const preview = notificationPreview(signal, DEFAULT_NOTIFICATION_PREFERENCES);
      expect(preview).toEqual(GENERIC_PREVIEW);
      expect(JSON.stringify(preview)).not.toContain(signal.label);
    }
  });

  it("shows the label only when the recipient opted into detailed previews", () => {
    const signal = findSignal("check-on-me")!;
    expect(
      notificationPreview(signal, {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        lockScreenPreview: "detailed",
      }).body,
    ).toBe("Please Check On Me");
  });
});
