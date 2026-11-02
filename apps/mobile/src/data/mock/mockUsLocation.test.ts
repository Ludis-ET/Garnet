/**
 * Distance (P-66): the repository keeps only a rounded position, whatever it is given, and the
 * partner's position is never used before the two of you are paired.
 */
import { Temporal } from "temporal-polyfill";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

function setup(paired = true) {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: {
      ...s.pairing,
      byUser: { [DEMO_ME_ID]: paired ? { ...EMPTY_PAIRING, partnerName: "Noah" } : EMPTY_PAIRING },
    },
    profiles: {
      ...s.profiles,
      byUser: {
        [DEMO_ME_ID]: { ...newProfile("Selam"), side: "ruby", timeZone: "Africa/Addis_Ababa" },
      },
    },
  }));
  return { store, repos: createMockRepositories(store, () => Temporal.Now.instant()) };
}

describe("location for the distance (P-66)", () => {
  it("keeps only a rounded position, even when given an exact one", async () => {
    const { store, repos } = setup();
    await repos.us.saveLocation({ lat: 9.03456, lon: 38.74321 });
    expect(store.read().settings.locations[DEMO_ME_ID]).toMatchObject({ lat: 9, lon: 38.7 });
    expect((await repos.us.overview()).distance).toMatchObject({ approximate: false });
  });

  it("forgets it when asked", async () => {
    const { store, repos } = setup();
    await repos.us.saveLocation({ lat: 9.03, lon: 38.74 });
    await repos.us.saveLocation(null);
    expect(store.read().settings.locations[DEMO_ME_ID]).toBeNull();
  });

  it("gives no distance before you're paired", async () => {
    const { repos } = setup(false);
    expect((await repos.us.overview()).distance).toBeNull();
  });
});
