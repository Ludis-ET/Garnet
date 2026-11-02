import { defaultSettings, greetingLine, inQuietHours, withDefaults } from "./settings";

describe("settings defaults (SET-01 to SET-17)", () => {
  it("starts with generic previews, no quiet-hours window and no reminder choice", () => {
    const s = defaultSettings();
    expect(s.previews).toBe("generic"); // P-17, §5
    expect(s.quiet).toEqual({ on: false, start: null, end: null }); // U-21 open: no default
    expect(s.reminders).toBeNull(); // P-65: not chosen sends none
  });

  it("fills in anything an older build didn't save", () => {
    const s = withDefaults({ previews: "full", notify: { messages: "off" } as never });
    expect(s.previews).toBe("full");
    expect(s.notify.messages).toBe("off");
    expect(s.notify.signals).toBe("immediate");
    expect(s.export.state).toBe("none");
  });
});

describe("quiet hours", () => {
  const q = { on: true, start: "22:00", end: "07:00" };
  it("handles a window across midnight", () => {
    expect(inQuietHours(q, "23:30")).toBe(true);
    expect(inQuietHours(q, "06:59")).toBe(true);
    expect(inQuietHours(q, "07:00")).toBe(false);
    expect(inQuietHours(q, "12:00")).toBe(false);
  });
  it("does nothing while off or without a window", () => {
    expect(inQuietHours({ ...q, on: false }, "23:30")).toBe(false);
    expect(inQuietHours({ on: true, start: null, end: null }, "23:30")).toBe(false);
  });
});

describe("greeting", () => {
  it("uses the nickname, the time of day, or the person's own words", () => {
    const s = defaultSettings();
    expect(greetingLine(s, "Noah", 9)).toBe("Good morning, Noah");
    expect(greetingLine({ ...s, partnerNickname: "love" }, "Noah", 20)).toBe("Good evening, love");
    expect(
      greetingLine({ ...s, greeting: "custom", customGreeting: "Hey {name} ✨" }, "Noah", 9),
    ).toBe("Hey Noah ✨");
  });
});
