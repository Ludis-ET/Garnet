import { newProfile, type DemoPartnerProfile, type Profile } from "@/data/fixtures/demoProfile";
import type { SetupRepository } from "@/data/repositories/types";
import { isSideAvailable, SETUP_STEPS, OPTIONAL_STEPS, type GemSide } from "@/domain/identity";
import type { MockStore } from "./MockStore";

/**
 * Mock adapter for SetupRepository (SETUP-01 to SETUP-08). The mock is the authority on sides
 * (P-51): a side the partner already holds is refused, so the two can never match, whatever
 * order the choices arrive in. Nothing leaves the device.
 */
export function createMockSetup(store: MockStore): SetupRepository {
  const me = () => {
    const { auth } = store.read();
    if (auth.status.kind !== "signedIn") throw new Error("Not signed in");
    const { userId } = auth.status;
    const account = auth.accounts.find((a) => a.userId === userId);
    return { userId, name: account?.displayName ?? "" };
  };
  const profileOf = (userId: string, name: string): Profile =>
    store.read().profiles.byUser[userId] ?? newProfile(name);
  const write = (userId: string, profile: Profile) => {
    store.update((s) => ({
      ...s,
      profiles: { ...s.profiles, byUser: { ...s.profiles.byUser, [userId]: profile } },
    }));
  };
  const partner = (): DemoPartnerProfile => store.read().profiles.partner;

  return {
    get: () =>
      store.simulate(() => {
        const who = me();
        return {
          profile: profileOf(who.userId, who.name),
          partner: partner(),
          togetherSince: store.read().profiles.togetherSince,
        };
      }),

    save: (patch) =>
      store.simulate(() => {
        const who = me();
        const current = profileOf(who.userId, who.name);
        const done =
          patch.done === undefined ? current.done : [...new Set([...current.done, ...patch.done])];
        write(who.userId, { ...current, ...patch, done });
      }),

    chooseSide: (side: GemSide) =>
      store.simulate(() => {
        const who = me();
        const taken = partner().side;
        if (!isSideAvailable(side, taken)) {
          return { ok: false as const, reason: "taken" as const, partnerSide: side };
        }
        const current = profileOf(who.userId, who.name);
        write(who.userId, {
          ...current,
          side,
          done: [...new Set([...current.done, "side" as const])],
        });
        return { ok: true as const };
      }),

    setTogetherSince: (date) =>
      store.simulate(() => {
        const who = me();
        const current = profileOf(who.userId, who.name);
        write(who.userId, {
          ...current,
          done: [...new Set([...current.done, "together" as const])],
        });
        store.update((s) => ({ ...s, profiles: { ...s.profiles, togetherSince: date } }));
      }),

    // On mock data the picture stays on the phone, as a data address (P-98).
    setPicture: ({ base64 }) =>
      store.simulate(() => {
        const who = me();
        const current = profileOf(who.userId, who.name);
        const avatar = { kind: "image" as const, uri: `data:image/jpeg;base64,${base64}` };
        write(who.userId, {
          ...current,
          avatar,
          done: [...new Set([...current.done, "photo" as const])],
        });
        return avatar;
      }),

    clearPicture: () =>
      store.simulate(() => {
        const who = me();
        const current = profileOf(who.userId, who.name);
        write(who.userId, { ...current, avatar: { kind: "initials", swatch: 0 } });
      }),

    complete: () =>
      store.simulate(() => {
        const who = me();
        const current = profileOf(who.userId, who.name);
        const missing = SETUP_STEPS.filter(
          (step) => !OPTIONAL_STEPS.has(step) && !current.done.includes(step),
        );
        if (current.side === null && !missing.includes("side")) missing.push("side");
        if (missing.length > 0) return { ok: false as const, missing };
        write(who.userId, { ...current, complete: true });
        return { ok: true as const };
      }),
  };
}
