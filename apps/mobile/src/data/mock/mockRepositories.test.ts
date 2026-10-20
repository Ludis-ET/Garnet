import { Temporal } from "temporal-polyfill";
import { MockServiceError, MockStore } from "./MockStore";
import { createMockRepositories } from "./mockRepositories";

const NOW = Temporal.Instant.from("2026-11-01T12:00:00Z");

function setup(settings = {}) {
  const store = new MockStore({ latencyMs: 0, ...settings });
  return { store, repos: createMockRepositories(store, () => NOW) };
}

describe("mock repositories", () => {
  it("list returns only safe views: sealed letters have no body; my draft is visible to me", async () => {
    const { repos } = setup();
    const views = await repos.openWhen.list();
    expect(views.map((v) => v.kind).sort()).toEqual(["draft", "sealed", "sealed"]);
    for (const v of views.filter((v) => v.kind === "sealed")) expect(v).not.toHaveProperty("body");
  });

  it("opening an eligible letter reveals it; a date-locked one stays sealed", async () => {
    const { repos } = setup();
    expect(await repos.openWhen.open("demo-letter-first-day")).toEqual({
      ok: false,
      reason: "not-eligible",
    });
    const opened = await repos.openWhen.open("demo-letter-miss-me");
    expect(opened).toMatchObject({ ok: true, view: { kind: "opened" } });
  });

  it("Reset Demo Data restores the seeded baseline exactly", async () => {
    const { store, repos } = setup();
    const before = JSON.stringify(store.read());
    await repos.openWhen.open("demo-letter-miss-me");
    expect(JSON.stringify(store.read())).not.toBe(before);
    store.reset();
    expect(JSON.stringify(store.read())).toBe(before);
  });

  it("simulates offline and failure without changing state", async () => {
    const { store, repos } = setup({ offline: true });
    const before = JSON.stringify(store.read());
    await expect(repos.openWhen.open("demo-letter-miss-me")).rejects.toBeInstanceOf(
      MockServiceError,
    );
    store.settings = { ...store.settings, offline: false, failCalls: true };
    await expect(repos.relationship.getMe()).rejects.toMatchObject({ kind: "failure" });
    expect(JSON.stringify(store.read())).toBe(before);
  });

  it("knows who is who", async () => {
    const { repos } = setup();
    expect((await repos.relationship.getMe()).personalSide).toBe("ruby");
    expect((await repos.relationship.getPartner()).timezone).toBe("Europe/London");
  });
});
