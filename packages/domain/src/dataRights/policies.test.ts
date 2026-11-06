import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETION_GRACE_POLICIES,
  SPACE_ENDING_POLICIES,
  sanitizeExportData,
} from "./policies";

describe("dataRights domain policies", () => {
  it("exports explicit options for U-20 without silent default", () => {
    expect(SPACE_ENDING_POLICIES.REMOVE_DEPARTING_ENTRIES.kind).toBe("remove_departing_entries");
    expect(SPACE_ENDING_POLICIES.RETAIN_SHARED_READONLY.kind).toBe("retain_shared_readonly");
    expect(SPACE_ENDING_POLICIES.TOMBSTONE_ALL_SHARED.kind).toBe("tombstone_all_shared");
  });

  it("exports explicit options for U-23 without silent default", () => {
    expect(ACCOUNT_DELETION_GRACE_POLICIES.IMMEDIATE.kind).toBe("immediate");
    expect(ACCOUNT_DELETION_GRACE_POLICIES.GRACE_14_DAYS.graceDays).toBe(14);
    expect(ACCOUNT_DELETION_GRACE_POLICIES.GRACE_30_DAYS.graceDays).toBe(30);
  });

  it("strictly excludes partner's private drafts from export data (Guardrail §5)", () => {
    const userA = "user-a";
    const userB = "user-b";

    const filtered = sanitizeExportData({
      requesterId: userA,
      days: [
        { id: "1", authorId: userA, visibility: "private", body: "A's private journal" },
        { id: "2", authorId: userA, visibility: "shared", body: "Shared moment from A" },
        { id: "3", authorId: userB, visibility: "shared", body: "Shared moment from B" },
        { id: "4", authorId: userB, visibility: "private", body: "B's top secret private draft" },
      ],
      letters: [],
    });

    // B's private draft MUST NOT be present
    expect(filtered.days.map((d) => d.id)).toEqual(["1", "2", "3"]);
    expect(filtered.days.find((d) => d.id === "4")).toBeUndefined();
  });

  it("redacts sealed letter bodies for recipient in export data (B-90, U-34)", () => {
    const userA = "user-a";
    const userB = "user-b";

    const filtered = sanitizeExportData({
      requesterId: userB, // userB is exporting
      days: [],
      letters: [
        {
          id: "l1",
          authorId: userA,
          recipientId: userB,
          status: "sealed",
          body: "Secret letter body",
        },
        {
          id: "l2",
          authorId: userA,
          recipientId: userB,
          status: "opened",
          body: "Opened letter body",
        },
        {
          id: "l3",
          authorId: userB,
          recipientId: userA,
          status: "sealed",
          body: "Letter B wrote to A",
        },
      ],
    });

    const l1 = filtered.letters.find((l) => l.id === "l1");
    expect(l1?.body).toBeNull(); // Sealed received letter body is redacted

    const l2 = filtered.letters.find((l) => l.id === "l2");
    expect(l2?.body).toBe("Opened letter body"); // Opened received letter body is kept

    const l3 = filtered.letters.find((l) => l.id === "l3");
    expect(l3?.body).toBe("Letter B wrote to A"); // Letter authored by userB retains body
  });
});
