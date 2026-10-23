import { DEMO_EMAIL, DEMO_PASSWORD } from "@/data/fixtures/demoAuth";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

async function signedIn() {
  const store = new MockStore({ latencyMs: 0 });
  const repos = createMockRepositories(store);
  await repos.auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: true });
  const partnerPicks = (side: "ruby" | "sapphire" | null) => {
    store.update((s) => ({
      ...s,
      profiles: { ...s.profiles, partner: { ...s.profiles.partner, side } },
    }));
  };
  return { store, setup: repos.setup, partnerPicks };
}

describe("mock setup (SETUP-01 to SETUP-08)", () => {
  it("starts from the account's display name with nothing else chosen", async () => {
    const { setup } = await signedIn();
    const { profile, partner } = await setup.get();
    expect(profile).toMatchObject({ displayName: "Selam", side: null, done: [], complete: false });
    expect(partner).toMatchObject({ name: "Noah", side: null, timeZone: "Europe/London" });
  });

  it("saves answers as it goes and remembers finished steps once", async () => {
    const { setup } = await signedIn();
    await setup.save({ nickname: "Sel", done: ["name"] });
    await setup.save({ timeZone: "Africa/Addis_Ababa", done: ["time", "name"] });
    const { profile } = await setup.get();
    expect(profile.nickname).toBe("Sel");
    expect(profile.done).toEqual(["name", "time"]);
  });

  it("lets a person take a free side (P-51)", async () => {
    const { setup } = await signedIn();
    expect(await setup.chooseSide("ruby")).toEqual({ ok: true });
    expect((await setup.get()).profile.side).toBe("ruby");
  });

  it("refuses the side the partner holds, so the two can never match (P-51)", async () => {
    const { setup, partnerPicks } = await signedIn();
    partnerPicks("sapphire");
    expect(await setup.chooseSide("sapphire")).toEqual({
      ok: false,
      reason: "taken",
      partnerSide: "sapphire",
    });
    expect((await setup.get()).profile.side).toBeNull();
    expect(await setup.chooseSide("ruby")).toEqual({ ok: true });
  });

  it("can't finish until the required steps are answered; photo and look are optional", async () => {
    const { setup } = await signedIn();
    expect(await setup.complete()).toEqual({
      ok: false,
      missing: ["name", "side", "time", "alerts"],
    });
    await setup.save({ done: ["name"] });
    await setup.chooseSide("sapphire");
    await setup.save({ timeZone: "Africa/Addis_Ababa", done: ["time"] });
    await setup.save({ done: ["alerts"] });
    expect(await setup.complete()).toEqual({ ok: true });
    expect((await setup.get()).profile.complete).toBe(true);
  });
});
