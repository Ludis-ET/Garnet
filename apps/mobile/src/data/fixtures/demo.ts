import type { DemoUser, OpenWhenLetter, Relationship } from "@/domain/models";

/**
 * Deterministic demo data (spec §5: stable IDs, fictional identities, no real private data).
 * Never generate random entities at render time; add fixtures here instead.
 */
export const DEMO_ME_ID = "demo-user-ruby";
export const DEMO_PARTNER_ID = "demo-user-sapphire";

export interface DemoState {
  meId: string;
  users: Record<string, DemoUser>;
  relationship: Relationship;
  letters: OpenWhenLetter[];
}

export function createDemoState(): DemoState {
  return {
    meId: DEMO_ME_ID,
    users: {
      [DEMO_ME_ID]: {
        id: DEMO_ME_ID,
        displayName: "Selam",
        nickname: null,
        emailLabel: "selam@example.test",
        personalSide: "ruby",
        timezone: "Africa/Addis_Ababa",
        pronouns: null,
      },
      [DEMO_PARTNER_ID]: {
        id: DEMO_PARTNER_ID,
        displayName: "Noah",
        nickname: null,
        emailLabel: "noah@example.test",
        personalSide: "sapphire",
        timezone: "Europe/London",
        pronouns: null,
      },
    },
    relationship: {
      id: "demo-relationship",
      partnerIds: [DEMO_ME_ID, DEMO_PARTNER_ID],
      displayName: "Our space",
      longDistanceStatus: "active",
      startAt: "2026-09-01T06:00:00Z",
      sharedTimezone: "Europe/London",
    },
    letters: [
      {
        id: "demo-letter-miss-me",
        authorId: DEMO_PARTNER_ID,
        recipientId: DEMO_ME_ID,
        safePrompt: "Open when you miss me",
        body: "Demo letter body. Fictional content for the prototype.",
        mediaRefs: [],
        unlock: { type: "manual" },
        state: "sealed",
        sealedAt: "2026-08-30T18:00:00Z",
        openedAt: null,
      },
      {
        id: "demo-letter-first-day",
        authorId: DEMO_PARTNER_ID,
        recipientId: DEMO_ME_ID,
        safePrompt: "Open on your first day at work",
        body: "Demo letter body that unlocks on a date.",
        mediaRefs: [],
        unlock: { type: "date", at: "2027-01-05T06:00:00Z" },
        state: "sealed",
        sealedAt: "2026-08-30T18:05:00Z",
        openedAt: null,
      },
      {
        id: "demo-letter-draft",
        authorId: DEMO_ME_ID,
        recipientId: DEMO_PARTNER_ID,
        safePrompt: "Open when you can't sleep",
        body: "My unfinished draft.",
        mediaRefs: [],
        unlock: { type: "manual" },
        state: "draft",
        sealedAt: null,
        openedAt: null,
      },
    ],
  };
}
