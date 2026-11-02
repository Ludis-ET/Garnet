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

const REPLIES = [
  "Aww, that made me smile 🥰",
  "Tell me everything!",
  "Miss you too 💙",
  "Haha, that's so you 😄",
  "Can't wait for our call tonight",
  "Sending you the biggest hug 🫂",
] as const;

/**
 * Chat (CHAT-01, P-58), as if from Noah's phone: he looks at the chat, types for a moment and
 * answers. "Seen" only ever shows when both said yes; the repository filters it, not this.
 */
export function useChatDemo() {
  const store = useDemoControls();
  const patchChat = (
    patch: (
      c: ReturnType<typeof store.read>["chat"],
    ) => Partial<ReturnType<typeof store.read>["chat"]>,
  ) => {
    store.update((s) => ({ ...s, chat: { ...s.chat, ...patch(s.chat) } }));
  };
  const read = () => {
    patchChat(() => ({ partnerSeenUpTo: Temporal.Now.instant().toString() }));
  };
  const typing = (on: boolean) => {
    patchChat(() => ({ partnerTyping: on }));
  };
  const reply = () => {
    patchChat((c) => {
      const partnerId = store.read().relationship.partnerIds.find((id) => id !== store.read().meId);
      const at = Temporal.Now.instant().toString();
      const text = REPLIES[c.messages.length % REPLIES.length] ?? REPLIES[0];
      // Noah loves your latest message, and every third reply is one of his stickers (P-62).
      const lastMine = [...c.messages].reverse().find((m) => m.senderId !== partnerId);
      const side = store.read().profiles.partner.side ?? "sapphire";
      const sticker =
        c.messages.length % 3 === 0
          ? {
              character: side,
              mood:
                (["loving", "happy", "hug", "laughing"] as const)[c.messages.length % 4] ??
                "loving",
            }
          : null;
      return {
        partnerTyping: false,
        partnerSeenUpTo: at,
        messages: [
          ...c.messages.map((m) =>
            m.id === lastMine?.id && !m.reactions.some((r) => r.emoji === "❤️")
              ? { ...m, reactions: [...m.reactions, { emoji: "❤️", count: 1, reactedByMe: false }] }
              : m,
          ),
          {
            id: `demo-reply-${String(c.messages.length)}`,
            senderId: partnerId ?? "demo-user-sapphire",
            text: sticker === null ? text : "",
            createdAt: at,
            editedAt: null,
            status: "sent",
            pinned: false,
            pinnedAt: null,
            replyTo: null,
            reactions: [],
            ...(sticker === null ? {} : { sticker }),
          },
        ],
      };
    });
  };
  /** Noah opens or closes the chat (his character "watching" shows only under mutual Seen). */
  const here = (on: boolean) => {
    patchChat(() => ({ partnerInChat: on }));
  };
  return {
    read,
    typing,
    reply,
    here,
    /** The next upload stops part-way, to show the retry state. */
    failNextUpload: () => {
      patchChat(() => ({ failNextUpload: true }));
    },
    /**
     * Simulated upload progress (P-61): moves every unfinished upload along; a real adapter
     * reports progress from the network instead. An upload set to fail stops at about 60 %.
     */
    advanceUploads: (step: number) => {
      patchChat((c) => {
        let failNext = c.failNextUpload;
        const messages = c.messages.map((m) => {
          if (m.status !== "sending" || m.uploadProgress === undefined) return m;
          const next = Math.min(1, m.uploadProgress + step);
          if (failNext && next >= 0.6) {
            failNext = false;
            return { ...m, status: "failed" as const, uploadProgress: next };
          }
          if (next >= 1) {
            const done = { ...m, status: "sent" as const };
            delete done.uploadProgress;
            return done;
          }
          return { ...m, uploadProgress: next };
        });
        return { messages, failNextUpload: failNext };
      });
    },
    /** After this person sends: Noah sees it, types, then answers (only if auto-reply is on). */
    afterSend: () => {
      if (!store.read().chat.autoReply) return;
      setTimeout(() => {
        here(true);
        read();
      }, 900);
      setTimeout(() => {
        typing(true);
      }, 1700);
      setTimeout(reply, 4400);
      setTimeout(() => {
        here(false);
      }, 11_000);
    },
  };
}
