import { TERMS_VERSION } from "@garnet/contracts";
import type { DemoUser, OpenWhenLetter, Relationship } from "@/domain/models";
import { createDemoAuth, type DemoAuthState } from "./demoAuth";
import { createDemoDays, type DemoDaysState } from "./demoDays";
import { createDemoHome, type DemoHomeState } from "./demoHome";
import { createDemoPairing, type DemoPairingState } from "./demoPairing";
import { createDemoProfiles, type DemoProfilesState } from "./demoProfile";
import { createDemoChat, type DemoChatState } from "./demoChat";
import { createDemoMoments, type DemoMomentsState } from "./demoMoments";
import { createDemoSettings, type DemoSettingsState } from "./demoSettings";
import { createDemoSurprises } from "./demoSurprises";
import { createDemoTogether, type DemoTogetherState } from "./demoTogether";
import type { SurpriseRecord } from "@/domain/surprises";

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
  auth: DemoAuthState;
  pairing: DemoPairingState;
  profiles: DemoProfilesState;
  home: DemoHomeState;
  days: DemoDaysState;
  chat: DemoChatState;
  moments: DemoMomentsState;
  settings: DemoSettingsState;
  surprises: SurpriseRecord[];
  together: DemoTogetherState;
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
        body: "Close your eyes for a second. I'm on the other end of the same sky, thinking of the bench by the river and how you always steal the warm side. Miss me a little, then go and make yourself tea. I'll be home in your pocket until I'm home for real.",
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
    auth: createDemoAuth(DEMO_ME_ID, TERMS_VERSION),
    pairing: createDemoPairing(),
    profiles: createDemoProfiles(),
    home: createDemoHome(),
    days: createDemoDays(DEMO_ME_ID, DEMO_PARTNER_ID),
    chat: createDemoChat(DEMO_ME_ID, DEMO_PARTNER_ID),
    moments: createDemoMoments(DEMO_ME_ID, DEMO_PARTNER_ID),
    settings: createDemoSettings(DEMO_PARTNER_ID),
    surprises: createDemoSurprises(DEMO_ME_ID, DEMO_PARTNER_ID),
    together: createDemoTogether(DEMO_ME_ID, DEMO_PARTNER_ID),
  };
}
