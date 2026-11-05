import { DEMO_ME_ID, type DemoState } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import type { MockStore } from "@/data/mock/MockStore";
import type {
  AuthStatus,
  PairingStatus,
  Repositories,
  SetupState,
} from "@/data/repositories/types";
import { withDefaults, type UserSettings } from "@/domain/settings";

/**
 * While the backend arrives one area at a time (P-76), the areas on the API are the truth about
 * who someone is, and the areas still on sample data (Home, Days, Us, chat, the notifications and
 * widgets built from them) read that from the mock store. So each answer from the API is copied
 * into the store as it arrives: without this, the store would say nobody is signed in and those
 * screens would fail. Sample content stays sample; the person, their partner and their settings
 * are real. Each area's mirror goes away with the sample data it serves.
 */

const unchanged = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Writes only a real change: every write refreshes the screens on sample data. */
function write(store: MockStore, change: (s: Readonly<DemoState>) => DemoState): void {
  const before = store.read();
  const after = change(before);
  if (!unchanged(before, after)) store.update(() => after);
}

export function mirrorAuth(store: MockStore, status: AuthStatus): void {
  write(store, (s) => ({
    ...s,
    auth: {
      ...s.auth,
      status:
        status.kind === "signedIn"
          ? { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true }
          : { kind: "signedOut" },
      accounts:
        status.kind === "signedIn"
          ? s.auth.accounts.map((a) =>
              a.userId === DEMO_ME_ID ? { ...a, displayName: status.displayName } : a,
            )
          : s.auth.accounts,
    },
  }));
}

export function mirrorPairing(store: MockStore, status: PairingStatus): void {
  const partnerName = status.kind === "paired" ? status.partnerName : null;
  write(store, (s) => ({
    ...s,
    pairing: {
      ...s.pairing,
      byUser: {
        ...s.pairing.byUser,
        [DEMO_ME_ID]: { ...(s.pairing.byUser[DEMO_ME_ID] ?? EMPTY_PAIRING), partnerName },
      },
    },
  }));
}

export function mirrorSetup(store: MockStore, state: SetupState): void {
  write(store, (s) => ({
    ...s,
    profiles: {
      ...s.profiles,
      byUser: { ...s.profiles.byUser, [DEMO_ME_ID]: state.profile },
      // Before pairing the API has no partner: the sample one stays until there is a real one.
      partner: state.partner.name === "" ? s.profiles.partner : state.partner,
      togetherSince: state.togetherSince,
    },
  }));
}

export function mirrorSettings(store: MockStore, patch: Partial<UserSettings>): void {
  write(store, (s) => ({
    ...s,
    settings: {
      ...s.settings,
      byUser: {
        ...s.settings.byUser,
        [DEMO_ME_ID]: { ...withDefaults(s.settings.byUser[DEMO_ME_ID]), ...patch },
      },
    },
  }));
}

/** The API's repositories, each answer also copied into the store (see above). */
export function withMirror(api: Partial<Repositories>, store: MockStore): Partial<Repositories> {
  const { auth, pairing, setup, settings } = api;
  return {
    ...api,
    ...(auth === undefined
      ? {}
      : {
          auth: {
            ...auth,
            status: async () => {
              const status = await auth.status();
              mirrorAuth(store, status);
              return status;
            },
          },
        }),
    ...(pairing === undefined
      ? {}
      : {
          pairing: {
            ...pairing,
            status: async () => {
              const status = await pairing.status();
              mirrorPairing(store, status);
              return status;
            },
          },
        }),
    ...(setup === undefined
      ? {}
      : {
          setup: {
            ...setup,
            get: async () => {
              const state = await setup.get();
              mirrorSetup(store, state);
              return state;
            },
          },
        }),
    ...(settings === undefined
      ? {}
      : {
          settings: {
            ...settings,
            get: async () => {
              const view = await settings.get();
              mirrorSettings(store, view.settings);
              return view;
            },
            update: async (patch) => {
              await settings.update(patch);
              mirrorSettings(store, patch);
            },
          },
        }),
  };
}
