import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  defaultSettingsDoc,
  mergeSettings,
  readSettings,
  settingsPatchSchema,
  settingsSchema,
  type SettingsPatchDto,
} from "./settings";

describe("default settings", () => {
  it("are valid, and start private and quiet about what isn't decided", () => {
    const d = settingsSchema.parse(defaultSettingsDoc());
    expect(d.previews).toBe("generic"); // P-17, §5
    expect(d.quiet).toEqual({ on: false, start: null, end: null }); // U-21: no default window
    expect(d.reminders).toBeNull(); // P-65: not chosen, sends nothing
    expect(d.notify.reminders).toBe("off");
  });
});

describe("patches (two devices never undo each other)", () => {
  it("changes only what the patch names, at any depth", () => {
    const base = defaultSettingsDoc();
    const next = mergeSettings(base, {
      notify: { messages: "quiet" },
      home: { cards: { memory: false } },
    });
    expect(next.notify).toEqual({ ...base.notify, messages: "quiet" });
    expect(next.home.cards).toEqual({ ...base.home.cards, memory: false });
    expect(next.home.ring).toBe(true);
    expect(next.sound).toBe(true);
  });

  it("merges patches to different settings in either order to the same result", () => {
    const a: SettingsPatchDto = { quiet: { on: true } };
    const b: SettingsPatchDto = { quiet: { start: "22:00", end: "07:00" } };
    const base = defaultSettingsDoc();
    expect(mergeSettings(mergeSettings(base, a), b)).toEqual(
      mergeSettings(mergeSettings(base, b), a),
    );
  });

  it.each([
    ["an unknown setting", { theme: "dark" }],
    ["the export state, which only the server sets", { export: { state: "ready" } }],
    ["an unknown nested field", { home: { cards: { secret: true } } }],
    ["a bad mode", { notify: { messages: "loud" } }],
    ["a time that doesn't exist", { quiet: { start: "25:00" } }],
    ["a preview mode that isn't one", { previews: "everything" }],
    ["an over-long nickname", { partnerNickname: "x".repeat(25) }],
    ["an over-long greeting", { customGreeting: "x".repeat(41) }],
  ])("refuses %s", (_, patch) => {
    expect(settingsPatchSchema.safeParse(patch).success).toBe(false);
  });

  it("property: any valid patch leaves a valid document, and is idempotent", () => {
    const mode = fc.constantFrom("immediate", "quiet", "scheduled", "off");
    const time = fc.option(fc.constantFrom("00:00", "07:30", "22:00", "23:59"));
    const patch = fc.record(
      {
        notify: fc.record({ messages: mode, signals: mode, days: mode }, { requiredKeys: [] }),
        quiet: fc.record({ on: fc.boolean(), start: time, end: time }, { requiredKeys: [] }),
        sound: fc.boolean(),
        previews: fc.constantFrom("generic", "sender", "full"),
        reminders: fc.option(fc.constantFrom("off", "gentle", "custom")),
        home: fc.record(
          { ring: fc.boolean(), cards: fc.record({ memory: fc.boolean() }, { requiredKeys: [] }) },
          { requiredKeys: [] },
        ),
      },
      { requiredKeys: [] },
    );
    fc.assert(
      fc.property(patch, (p) => {
        const parsed = settingsPatchSchema.parse(p);
        const once = mergeSettings(defaultSettingsDoc(), parsed);
        expect(settingsSchema.safeParse(once).success).toBe(true);
        expect(mergeSettings(once, parsed)).toEqual(once);
      }),
    );
  });
});

describe("reading a stored document", () => {
  it("gives the defaults for nothing at all", () => {
    expect(readSettings(null)).toEqual(defaultSettingsDoc());
    expect(readSettings("not a document")).toEqual(defaultSettingsDoc());
    expect(readSettings([])).toEqual(defaultSettingsDoc());
  });

  it("keeps what is good, fills in what is missing, drops what it doesn't know", () => {
    const read = readSettings({
      sound: false,
      notify: { messages: "off" },
      home: { cards: { today: false } },
      oldSetting: 1,
    });
    expect(read.sound).toBe(false);
    expect(read.notify.messages).toBe("off");
    expect(read.notify.signals).toBe("immediate");
    expect(read.home.cards.today).toBe(false);
    expect(read.home.cards.now).toBe(true);
    expect(read).not.toHaveProperty("oldSetting");
  });

  it("falls back setting by setting, never failing the screen", () => {
    const read = readSettings({
      sound: "yes",
      previews: "leak-everything",
      notify: { messages: "loud", signals: "off" },
      quiet: { on: true, start: "99:99", end: "07:00" },
    });
    expect(read.sound).toBe(true);
    expect(read.previews).toBe("generic");
    expect(read.notify.messages).toBe("immediate");
    expect(read.notify.signals).toBe("off");
    expect(read.quiet).toEqual({ on: true, start: null, end: "07:00" });
  });

  it("property: whatever is stored, the result is a whole, valid document", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (stored) => {
        expect(settingsSchema.safeParse(readSettings(stored)).success).toBe(true);
      }),
    );
  });
});
