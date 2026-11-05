import type { Temporal } from "temporal-polyfill";
import type { DemoAccount } from "@/data/fixtures/demoAuth";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import type { SettingsRepository, SettingsView } from "@/data/repositories/types";
import { ageCheckToday } from "@/domain/auth";
import { withDefaults, type UserSettings } from "@/domain/settings";
import { isOldEnough } from "@garnet/contracts";
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
  const accountPatch = (patch: Partial<DemoAccount>) => {
    const id = me();
    store.update((s) => ({
      ...s,
      auth: {
        ...s.auth,
        accounts: s.auth.accounts.map((a) => (a.userId === id ? { ...a, ...patch } : a)),
      },
    }));
  };
  return {
    get: () =>
      store.simulate((): SettingsView => {
        const s = store.read();
        const v = viewerOf(s);
        const account = s.auth.accounts.find((a) => a.userId === v.userId);
        return {
          settings: withDefaults(s.settings.byUser[v.userId]),
          me: v.me,
          partner: v.partner,
          email: account?.email ?? "",
          birthDate: account?.birthDate ?? null,
          termsVersion: account?.termsVersion ?? null,
          termsAcceptedAt: account?.termsAcceptedAt ?? null,
          dataRights: true,
        };
      }),
    devices: () =>
      store.simulate(() => {
        const at = now();
        return store.read().settings.devices.map((d) => ({
          id: d.id,
          name: d.name,
          current: d.current,
          lastActive: at.subtract({ hours: d.hoursAgo }).toString(),
        }));
      }),
    changePassword: ({ current, next }) =>
      store.simulate(() => {
        const id = me();
        const account = store.read().auth.accounts.find((a) => a.userId === id);
        if (account?.password !== current)
          return { ok: false as const, reason: "wrong-password" as const };
        accountPatch({ password: next });
        return { ok: true as const };
      }),
    methods: () =>
      store.simulate(() => {
        const id = me();
        const account = store.read().auth.accounts.find((a) => a.userId === id);
        const has = (p: "google" | "apple") => account?.providers.includes(p) === true;
        return {
          password: (account?.password ?? "") !== "",
          google: { available: true, connected: has("google") },
          apple: { available: true, connected: has("apple") },
        };
      }),
    connect: (provider) =>
      store.simulate(() => {
        const id = me();
        const account = store.read().auth.accounts.find((a) => a.userId === id);
        accountPatch({ providers: [...new Set([...(account?.providers ?? []), provider])] });
        return { ok: true as const };
      }),
    disconnect: (provider) =>
      store.simulate(() => {
        const id = me();
        const account = store.read().auth.accounts.find((a) => a.userId === id);
        const providers = (account?.providers ?? []).filter((p) => p !== provider);
        if (providers.length === 0 && (account?.password ?? "") === "")
          return { ok: false as const, reason: "last-one" as const };
        accountPatch({ providers });
        return { ok: true as const };
      }),
    sendPasswordLink: () => store.simulate(() => undefined),
    changeEmail: (newEmail) =>
      store.simulate(() => {
        const id = me();
        const account = store.read().auth.accounts.find((a) => a.userId === id);
        if (newEmail.trim().toLowerCase() === account?.email)
          return { ok: false as const, reason: "same" as const };
        return { ok: true as const };
      }),
    changeBirthDate: (birthDate) =>
      store.simulate(() => {
        if (!isOldEnough(birthDate, ageCheckToday(now())))
          return { ok: false as const, reason: "too-young" as const };
        accountPatch({ birthDate });
        return { ok: true as const };
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
