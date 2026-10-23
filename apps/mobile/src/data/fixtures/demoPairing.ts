/**
 * Demo pairing state for PAIR-01 to PAIR-07. Fictional and local only: invitations are
 * simulated codes that never leave the device (Phase 2 scope rule; P-50).
 */

/** The fictional partner who joins your invitation, or whose invitation you join. */
export const DEMO_PARTNER_NAME = "Noah";

/** Incoming demo invitations from Noah, one per state (PAIR-03). Codes use the P-50 alphabet. */
export const DEMO_INVITE_CODES = {
  valid: "K7QM4XPV",
  expired: "H3RT9WNE",
  used: "M2VB8CQD",
} as const;

export type IncomingInviteState = "valid" | "expired" | "used";

export interface DemoIncomingInvite {
  inviterName: string;
  state: IncomingInviteState;
}

/** An invitation this person created (PAIR-02). */
export interface DemoOwnInvite {
  code: string;
  /** Instant (ISO) it was created; it expires per the invite policy (P-18, proposed). */
  createdAt: string;
}

export interface DemoPairingOfUser {
  partnerName: string | null;
  invite: DemoOwnInvite | null;
  /** The incoming code this person checked and is reviewing (PAIR-04); kept off the URL. */
  reviewing: string | null;
}

export interface DemoPairingState {
  /** Per account (by user id); accounts without an entry are unpaired. */
  byUser: Record<string, DemoPairingOfUser>;
  /** Invitations other people sent, by normalised code; anything else is not valid. */
  incoming: Record<string, DemoIncomingInvite>;
}

export const EMPTY_PAIRING: DemoPairingOfUser = {
  partnerName: null,
  invite: null,
  reviewing: null,
};

export function createDemoPairing(): DemoPairingState {
  return {
    byUser: {},
    incoming: {
      [DEMO_INVITE_CODES.valid]: { inviterName: DEMO_PARTNER_NAME, state: "valid" },
      [DEMO_INVITE_CODES.expired]: { inviterName: DEMO_PARTNER_NAME, state: "expired" },
      [DEMO_INVITE_CODES.used]: { inviterName: DEMO_PARTNER_NAME, state: "used" },
    },
  };
}
