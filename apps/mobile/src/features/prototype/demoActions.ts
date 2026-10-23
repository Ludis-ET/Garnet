/**
 * SYS-06 prototype affordances for pairing (P-49): things a reviewer needs but a real app gets
 * from another phone or from time passing. Only the prototype panel and clearly labelled
 * "(demo)" helpers use these; product screens never read fixtures directly (rule 1).
 */
import { Temporal } from "temporal-polyfill";
import {
  DEMO_INVITE_CODES,
  DEMO_PARTNER_NAME,
  EMPTY_PAIRING,
  type DemoPairingOfUser,
} from "@/data/fixtures/demoPairing";
import { useDemoControls } from "@/data/RepositoryProvider";
import type { DemoPartnerProfile } from "@/data/fixtures/demoProfile";
import type { SignalId } from "@garnet/domain";
import type { GemSide } from "@/domain/identity";
import { INVITE_POLICY_P18 } from "@/domain/pairing";

export { DEMO_INVITE_CODES };

export function usePairingDemo() {
  const store = useDemoControls();
  const patchMine = (patch: (p: DemoPairingOfUser) => Partial<DemoPairingOfUser>) => {
    store.update((s) => {
      if (s.auth.status.kind !== "signedIn") return s;
      const { userId } = s.auth.status;
      const current = s.pairing.byUser[userId] ?? EMPTY_PAIRING;
      return {
        ...s,
        pairing: {
          ...s.pairing,
          byUser: { ...s.pairing.byUser, [userId]: { ...current, ...patch(current) } },
        },
      };
    });
  };
  return {
    /** Noah accepts your invitation on "their phone" (PAIR-06). */
    partnerJoins: () => {
      patchMine((p) => (p.invite === null ? {} : { partnerName: DEMO_PARTNER_NAME, invite: null }));
    },
    /** Your invitation reaches its 24-hour ceiling now (P-18, proposed). */
    expireInvite: () => {
      patchMine((p) =>
        p.invite === null
          ? {}
          : {
              invite: {
                ...p.invite,
                createdAt: Temporal.Now.instant()
                  .subtract({ hours: INVITE_POLICY_P18.ttlHours })
                  .toString(),
              },
            },
      );
    },
    /** Back to unpaired, to walk the flow again. */
    unpair: () => {
      patchMine(() => EMPTY_PAIRING);
    },
  };
}

/** Noah's side of setup (SETUP-03, P-51): pick a side, or not yet; and whether he's done. */
export function useSetupDemo() {
  const store = useDemoControls();
  const patchPartner = (patch: Partial<DemoPartnerProfile>) => {
    store.update((s) => ({
      ...s,
      profiles: { ...s.profiles, partner: { ...s.profiles.partner, ...patch } },
    }));
  };
  return {
    /** Never lets the demo break P-51: a side this person holds can't be given to Noah. */
    partnerPicks: (side: GemSide | null) => {
      const s = store.read();
      const mine =
        s.auth.status.kind === "signedIn"
          ? (s.profiles.byUser[s.auth.status.userId]?.side ?? null)
          : null;
      if (side !== null && side === mine) return;
      patchPartner({ side });
    },
    partnerReady: () => {
      patchPartner({ ready: true });
    },
  };
}

/** Home (HOME-02) and Us (US-05): Noah's signal arrives, as if from his phone. */
export function useHomeDemo() {
  const store = useDemoControls();
  return {
    partnerSignals: (signal: SignalId) => {
      store.update((s) => ({
        ...s,
        home: {
          ...s.home,
          incoming: [
            ...s.home.incoming,
            {
              id: `in-${String(s.home.incoming.length + 1)}`,
              signal,
              at: Temporal.Now.instant().toString(),
              // A support signal carries what Noah needs, so US-05 has something to show.
              ...(signal === "need-you"
                ? { payload: { need: "lonely" as const, note: "Long day without you" } }
                : {}),
            },
          ],
        },
      }));
    },
  };
}
