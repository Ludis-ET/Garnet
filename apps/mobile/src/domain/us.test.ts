import { SIGNALS } from "@garnet/domain";
import { Temporal } from "temporal-polyfill";
import {
  checkInAt,
  historyDayLabel,
  receivedLine,
  responsesFor,
  sentLine,
  SIGNAL_LOOK,
} from "./us";

const BANNED = /\b(seen|read|ignored|missed|failed|broken|lost|last chance)\b/i;

describe("signal copy (§5, voice-and-copy.md)", () => {
  it("uses names, claims nothing about delivery, and avoids blame words", () => {
    for (const { id } of SIGNALS) {
      const lines = [sentLine(id), receivedLine(id, "Noah", {})];
      for (const line of lines)
        expect({ id, line, banned: BANNED.test(line) }).toEqual({ id, line, banned: false });
      expect(receivedLine(id, "Noah", {})).toContain("Noah");
    }
  });

  it("shows the chosen need, level or topic", () => {
    expect(receivedLine("need-you", "Noah", { need: "overwhelmed" })).toBe(
      'Noah: "I\'m overwhelmed"',
    );
    expect(receivedLine("missing-you", "Noah", { level: "I need a hug" })).toBe("Noah needs a hug");
    expect(receivedLine("need-to-talk", "Noah", { topic: "Just listen" })).toBe(
      "Noah would like to talk — just listen",
    );
  });

  it("offers replies but never a call button (A13), and nothing to answer for 'okay now'", () => {
    expect(responsesFor("need-you")).toEqual(["here", "comfort"]);
    expect(responsesFor("okay-now")).toEqual([]);
    for (const { id } of SIGNALS) expect(SIGNAL_LOOK[id].emoji.length).toBeGreaterThan(0);
  });
});

describe("check-in times in the partner's zone (P-56, proposed)", () => {
  // 10:00 London (BST), 12:00 Addis.
  const now = Temporal.Instant.from("2026-10-22T09:00:00Z");
  it("lands now, later, tonight at 21:00 or tomorrow at 09:00 in London", () => {
    expect(checkInAt("now", now, "Europe/London").toPlainTime().toString()).toBe("10:00:00");
    expect(checkInAt("later", now, "Europe/London").toPlainTime().toString()).toBe("13:00:00");
    expect(checkInAt("tonight", now, "Europe/London").toString()).toContain("2026-10-22T21:00:00");
    expect(checkInAt("tomorrow", now, "Europe/London").toString()).toContain("2026-10-23T09:00:00");
  });

  it("keeps 'tonight' honest after 21:00, and 'tomorrow' at 09:00 across the clock change", () => {
    const late = Temporal.Instant.from("2026-10-22T21:30:00Z"); // 22:30 BST
    expect(
      Temporal.Instant.compare(checkInAt("tonight", late, "Europe/London").toInstant(), late),
    ).toBe(0);
    const sat = Temporal.Instant.from("2026-10-24T12:00:00Z"); // BST; Sunday 25th is GMT
    const sunday = checkInAt("tomorrow", sat, "Europe/London");
    expect(sunday.toPlainTime().toString()).toBe("09:00:00");
    expect(sunday.offset).toBe("+00:00");
  });

  it("labels history days without counts", () => {
    const today = Temporal.PlainDate.from("2026-10-22");
    expect(historyDayLabel(today, today)).toBe("Today");
    expect(historyDayLabel(today.subtract({ days: 1 }), today)).toBe("Yesterday");
    expect(historyDayLabel(Temporal.PlainDate.from("2026-10-15"), today)).toBe("15 Oct");
  });
});
