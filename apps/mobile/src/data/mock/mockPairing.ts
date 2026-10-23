import { Temporal } from "temporal-polyfill";
import {
  EMPTY_PAIRING,
  type DemoPairingOfUser,
  type DemoPairingState,
} from "@/data/fixtures/demoPairing";
import type { PairingRepository, PairingStatus } from "@/data/repositories/types";
import {
  generateInviteCode,
  inviteExpiresAt,
  isInviteExpired,
  normaliseInviteCode,
  type InvitePolicy,
} from "@/domain/pairing";
import type { MockStore } from "./MockStore";

/**
 * Mock adapter for PairingRepository (PAIR-01 to PAIR-07). Nothing leaves the device. `now` and
 * `random` are injected so tests are deterministic; the invite policy (P-18, proposed) is a
 * required parameter with no default.
 */
export function createMockPairing(
  store: MockStore,
  now: () => Temporal.Instant,
  random: () => number,
  policy: InvitePolicy,
): PairingRepository {
  const me = () => {
    const { auth } = store.read();
    if (auth.status.kind !== "signedIn") return null;
    const { userId } = auth.status;
    const account = auth.accounts.find((a) => a.userId === userId);
    return { userId, name: account?.displayName ?? "" };
  };
  const mine = (userId: string): DemoPairingOfUser =>
    store.read().pairing.byUser[userId] ?? EMPTY_PAIRING;
  const setMine = (userId: string, patch: Partial<DemoPairingOfUser>) => {
    store.update((s) => ({
      ...s,
      pairing: {
        ...s.pairing,
        byUser: {
          ...s.pairing.byUser,
          [userId]: { ...(s.pairing.byUser[userId] ?? EMPTY_PAIRING), ...patch },
        },
      },
    }));
  };
  const setIncoming = (code: string, patch: Partial<DemoPairingState["incoming"][string]>) => {
    store.update((s) => {
      const current = s.pairing.incoming[code];
      if (current === undefined) return s;
      return {
        ...s,
        pairing: {
          ...s.pairing,
          incoming: { ...s.pairing.incoming, [code]: { ...current, ...patch } },
        },
      };
    });
  };
  /** The single "is this code usable" rule; every failure looks the same to the caller. */
  const usable = (code: string) => {
    const invite = store.read().pairing.incoming[normaliseInviteCode(code)];
    return invite?.state === "valid" ? invite : null;
  };

  return {
    status: () =>
      store.simulate((): PairingStatus => {
        const who = me();
        if (who === null) return { me: "", kind: "unpaired" };
        const p = mine(who.userId);
        if (p.partnerName !== null)
          return { me: who.name, kind: "paired", partnerName: p.partnerName };
        if (p.reviewing !== null) {
          const invite = usable(p.reviewing);
          if (invite !== null)
            return { me: who.name, kind: "reviewing", inviterName: invite.inviterName };
        }
        if (p.invite !== null) {
          const expiresAt = inviteExpiresAt(Temporal.Instant.from(p.invite.createdAt), policy);
          return {
            me: who.name,
            kind: "inviting",
            code: p.invite.code,
            expiresAt: expiresAt.toString(),
            expired: isInviteExpired(now(), expiresAt),
          };
        }
        return { me: who.name, kind: "unpaired" };
      }),

    createInvite: () =>
      store.simulate(() => {
        const who = me();
        if (who === null) throw new Error("Not signed in");
        const code = generateInviteCode(random);
        const createdAt = now();
        // A new invitation replaces any earlier one: only one code works at a time.
        setMine(who.userId, { invite: { code, createdAt: createdAt.toString() }, reviewing: null });
        return { code, expiresAt: inviteExpiresAt(createdAt, policy).toString() };
      }),

    revokeInvite: () =>
      store.simulate(() => {
        const who = me();
        if (who !== null) setMine(who.userId, { invite: null });
      }),

    checkCode: (code) =>
      store.simulate(() => {
        const who = me();
        if (who === null || mine(who.userId).partnerName !== null) return { ok: false as const };
        const invite = usable(code);
        if (invite === null) return { ok: false as const };
        setMine(who.userId, { reviewing: normaliseInviteCode(code) });
        return { ok: true as const, inviterName: invite.inviterName };
      }),

    accept: () =>
      store.simulate(() => {
        const who = me();
        if (who === null) return { ok: false as const };
        const code = mine(who.userId).reviewing;
        const invite = code === null ? null : usable(code);
        if (code === null || invite === null) {
          setMine(who.userId, { reviewing: null });
          return { ok: false as const };
        }
        // Single use (P-18): accepting spends the invitation; an own pending invite is dropped.
        setIncoming(code, { state: "used" });
        setMine(who.userId, { partnerName: invite.inviterName, reviewing: null, invite: null });
        return { ok: true as const, partnerName: invite.inviterName };
      }),

    decline: () =>
      store.simulate(() => {
        const who = me();
        if (who !== null) setMine(who.userId, { reviewing: null });
      }),
  };
}
