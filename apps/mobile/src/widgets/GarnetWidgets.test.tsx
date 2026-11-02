/**
 * The Android widgets (P-73) build into valid widget trees for every snapshot, and their words
 * stay generic: no streaks, counts of people, names or blame (§5, §8 voice rules).
 */
import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { buildWidgetTree } from "react-native-android-widget/src/api/build-widget-tree";
import { renderWidget, WIDGET_NAMES } from "./GarnetWidgets";
import { EMPTY_SNAPSHOT, type WidgetSnapshot } from "./snapshot";

const snapshot = fc.record<WidgetSnapshot>({
  ready: fc.boolean(),
  mySide: fc.constantFrom("ruby" as const, "sapphire" as const, null),
  partnerSide: fc.constantFrom("ruby" as const, "sapphire" as const, null),
  myZone: fc.constantFrom("Africa/Addis_Ababa", "Europe/London"),
  partnerZone: fc.constantFrom("Africa/Addis_Ababa", "Europe/London", null),
  special: fc.boolean(),
  somethingNew: fc.boolean(),
  waiting: fc.boolean(),
  nextEventDays: fc.option(fc.integer({ min: 0, max: 400 })),
  km: fc.option(fc.integer({ min: 0, max: 200 }).map((h) => h * 100)),
});

/** Every text and accessibility label in a built tree. */
function words(node: unknown): string[] {
  if (node === null || typeof node !== "object") return [];
  const n = node as { props?: Record<string, unknown>; children?: unknown[] };
  const own = [n.props?.text, n.props?.accessibilityLabel].filter(
    (w): w is string => typeof w === "string",
  );
  return [...own, ...(n.children ?? []).flatMap(words)];
}

const BANNED =
  /streak|in a row|broken|lost|failed|missed|ignored|seen|read|last chance|let .* down/i;

describe("Android widgets (P-73)", () => {
  it("build for every widget, size and snapshot, in light and dark, with generic words", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...WIDGET_NAMES),
        snapshot,
        fc.integer({ min: 100, max: 420 }),
        fc.integer({ min: 100, max: 420 }),
        fc.integer({ min: 0, max: 365 * 24 }),
        (name, snap, width, height, hours) => {
          const now = Temporal.Instant.from("2026-01-01T00:00:00Z").add({ hours });
          const drawn = renderWidget(name, snap, { width, height }, now);
          if (!("light" in drawn) || drawn.dark === null) throw new Error("light and dark");
          for (const tree of [buildWidgetTree(drawn.light), buildWidgetTree(drawn.dark)]) {
            const all = words(tree);
            expect(all.length).toBeGreaterThan(0);
            for (const w of all) expect(w).not.toMatch(BANNED);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("asks people to open the app before anything is set up", () => {
    const drawn = renderWidget(
      "FarApart",
      EMPTY_SNAPSHOT,
      { width: 300, height: 150 },
      Temporal.Now.instant(),
    );
    if (!("light" in drawn)) throw new Error("light and dark");
    expect(words(buildWidgetTree(drawn.light))).toContain("Open Garnet to begin 💜");
  });

  it("'Thinking of you' only opens the app to ask first", () => {
    const drawn = renderWidget(
      "ThinkingOfYou",
      { ...EMPTY_SNAPSHOT, ready: true, mySide: "ruby" },
      { width: 160, height: 160 },
      Temporal.Now.instant(),
    );
    if (!("light" in drawn)) throw new Error("light and dark");
    const json = JSON.stringify(buildWidgetTree(drawn.light));
    expect(json).toContain("garnet://send-thought");
    expect(json).not.toMatch(/sendSignal|thought-of-you/);
  });
});
