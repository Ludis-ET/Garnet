import type { Temporal } from "temporal-polyfill";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import type { SettingsRepository, SettingsView } from "@/data/repositories/types";
import { withDefaults, type UserSettings } from "@/domain/settings";
import type { MockStore } from "./MockStore";
import { viewerOf } from "./viewer";

/** SET-01 to SET-17 on the demo store. Every write touches only this person's own settings. */
export function createMockSettings(
  store: MockStore,
  now: () => Temporal.Instant,
): SettingsRepository {
  const me = () => viewerOf(store.read()).userId;
  const patchMine = (f: (s: UserSettings) => Partial<UserSettings>) => {
    store.update((s) => {
      const id = viewerOf(s).userId;
      const current = withDefaults(s.settings.byUser[id]);
      return {
        ...s,
        settings: {
          ...s.settings,
          byUser: { ...s.settings.byUser, [id]: { ...current, ...f(current) } },
        },
      };
    });
  };
  return {
    get: () =>
      store.simulate((): SettingsView => {
        const s = store.read();
        const v = viewerOf(s);
        const at = now();
        return {
          settings: withDefaults(s.settings.byUser[v.userId]),
          me: v.me,
          partner: v.partner,
          email: s.auth.accounts.find((a) => a.userId === v.userId)?.email ?? "",
          devices: s.settings.devices.map((d) => ({
            id: d.id,
            name: d.name,
            current: d.current,
            lastActive: at.subtract({ hours: d.hoursAgo }).toString(),
          })),
        };
      }),
    update: (patch) =>
      store.simulate(() => {
        patchMine(() => patch);
      }),
    prepareExport: () =>
      store.simulate(() => {
        patchMine(() => ({ export: { state: "ready", readyAt: now().toString() } }));
      }),
    expireExport: () =>
      store.simulate(() => {
        patchMine((c) => ({ export: { state: "expired", readyAt: c.export.readyAt } }));
      }),
    signOutDevice: (id) =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          settings: {
            ...s.settings,
            devices: s.settings.devices.filter((d) => d.current || d.id !== id),
          },
        }));
      }),
    signOutOtherDevices: () =>
      store.simulate(() => {
        store.update((s) => ({
          ...s,
          settings: { ...s.settings, devices: s.settings.devices.filter((d) => d.current) },
        }));
      }),
    endSpace: () =>
      store.simulate(() => {
        const id = me();
        store.update((s) => ({
          ...s,
          pairing: { ...s.pairing, byUser: { ...s.pairing.byUser, [id]: EMPTY_PAIRING } },
        }));
      }),
    deleteAccount: () =>
      store.simulate(() => {
        const id = me();
        store.update((s) => ({
          ...s,
          auth: {
            ...s.auth,
            accounts: s.auth.accounts.filter((a) => a.userId !== id),
            status: { kind: "signedOut" },
          },
        }));
      }),
  };
}
