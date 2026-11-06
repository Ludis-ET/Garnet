import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { createMockRepositories } from "@/data/mock/mockRepositories";
import { MockStore } from "@/data/mock/MockStore";
import { viewerOf } from "@/data/mock/viewer";
import type {
  AuthStatus,
  PairingStatus,
  Repositories,
  SettingsView,
  SetupState,
} from "@/data/repositories/types";
import { newProfile } from "@/data/fixtures/demoProfile";
import { defaultSettings } from "@/domain/settings";
import { withMirror } from "./mirror";

/**
 * The phone with the API on: auth, pairing, setup and settings answer from the server, while Home
 * and the rest still read the mock store. The store must learn who is really signed in, or every
 * one of those screens fails with "Not signed in".
 */
const SIGNED_IN: AuthStatus = { kind: "signedIn", displayName: "Ada" };
const PAIRED: PairingStatus = { me: "Ada", kind: "paired", partnerName: "Ben" };
const SETUP: SetupState = {
  profile: {
    ...newProfile("Ada"),
    side: "sapphire",
    timeZone: "Europe/London",
    homeCity: "Leeds",
    complete: true,
  },
  partner: {
    name: "Ben",
    side: "ruby",
    timeZone: "Africa/Addis_Ababa",
    homeCity: null,
    birthDate: "1996-02-02",
    ready: true,
  },
  togetherSince: "2021-05-02",
};

function setup(status: AuthStatus = SIGNED_IN) {
  const store = new MockStore({ latencyMs: 0 });
  const mock = createMockRepositories(store);
  let current = status;
  const update = jest.fn(() => Promise.resolve());
  const api = withMirror(
    {
      auth: { ...mock.auth, status: () => Promise.resolve(current) },
      pairing: { ...mock.pairing, status: () => Promise.resolve(PAIRED) },
      setup: { ...mock.setup, get: () => Promise.resolve(SETUP) },
      settings: {
        ...mock.settings,
        get: () =>
          Promise.resolve({
            settings: { ...defaultSettings(), previews: "sender", haptics: false },
          } as SettingsView),
        update,
      },
    },
    store,
  );
  const repos: Repositories = { ...mock, ...api };
  return {
    store,
    repos,
    update,
    become: (next: AuthStatus) => {
      current = next;
    },
  };
}

describe("what the sample-data screens learn from the API (P-76)", () => {
  it("fails before the API has answered, and works once it has", async () => {
    const { store, repos } = setup();
    expect(() => viewerOf(store.read())).toThrow("Not signed in");
    await repos.auth.status();
    expect(viewerOf(store.read()).userId).toBe(DEMO_ME_ID);
    // The first screen after sign-in: Home, still on sample data.
    await expect(repos.home.today()).resolves.toBeTruthy();
  });

  it("shows the real person and partner, not the sample ones", async () => {
    const { store, repos } = setup();
    await repos.auth.status();
    await repos.pairing.status();
    await repos.setup.get();
    const v = viewerOf(store.read());
    expect(v.me).toMatchObject({ name: "Ada", side: "sapphire", zone: "Europe/London" });
    expect(v.partner).toMatchObject({ name: "Ben", side: "ruby", zone: "Africa/Addis_Ababa" });
    expect(store.read().profiles.togetherSince).toBe("2021-05-02");
  });

  it("keeps the sample partner until there is a real one", async () => {
    const { store, repos } = setup();
    const sample = store.read().profiles.partner;
    jest
      .spyOn(repos.setup, "get")
      .mockResolvedValue({ ...SETUP, partner: { ...SETUP.partner, name: "" } });
    await repos.setup.get();
    expect(store.read().profiles.partner).toEqual(sample);
  });

  it("gives notifications and widgets the person's real settings", async () => {
    const { store, repos, update } = setup();
    await repos.auth.status();
    await repos.settings.get();
    expect(store.read().settings.byUser[DEMO_ME_ID]).toMatchObject({
      previews: "sender",
      haptics: false,
    });
    await repos.settings.update({ sound: false });
    expect(update).toHaveBeenCalledWith({ sound: false });
    expect(store.read().settings.byUser[DEMO_ME_ID]).toMatchObject({
      previews: "sender",
      sound: false,
    });
  });

  it("doesn't touch the store when a failed save never reached the server", async () => {
    const { store, repos, update } = setup();
    update.mockRejectedValueOnce(new Error("offline"));
    await expect(repos.settings.update({ sound: false })).rejects.toThrow("offline");
    expect(store.read().settings.byUser[DEMO_ME_ID]?.sound).toBeUndefined();
  });

  it("signs the sample screens out with the person", async () => {
    const { store, repos, become } = setup();
    await repos.auth.status();
    become({ kind: "signedOut" });
    await repos.auth.status();
    expect(store.read().auth.status).toEqual({ kind: "signedOut" });
  });

  it("treats someone still finishing registration as not in yet", async () => {
    const { store, repos } = setup({ kind: "registering", displayName: "Ada", birthDate: null });
    await repos.auth.status();
    expect(store.read().auth.status).toEqual({ kind: "signedOut" });
  });

  it("writes only real changes: repeating an answer wakes nothing (no refresh loop)", async () => {
    const { store, repos } = setup();
    await repos.auth.status();
    await repos.pairing.status();
    await repos.setup.get();
    await repos.settings.get();
    const wakes = jest.fn();
    store.subscribe(wakes);
    await repos.auth.status();
    await repos.pairing.status();
    await repos.setup.get();
    await repos.settings.get();
    expect(wakes).not.toHaveBeenCalled();
  });
});
