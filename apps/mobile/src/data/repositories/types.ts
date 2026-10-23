import type { DemoArt, DemoMedia } from "@/data/fixtures/demoDays";
import type {
  ActivityId,
  EntryFilter,
  EntryKind,
  FeelingId,
  RevealState,
  Visibility,
} from "@/domain/days";
import type { SignalPayload, SignalResponse } from "@/domain/us";
import type { SignalId } from "@garnet/domain";
import type { DemoPartnerProfile, Profile } from "@/data/fixtures/demoProfile";
import type { GemSide, SetupStep } from "@/domain/identity";
import type { OpenWhenView, OpenResult } from "@/domain/openWhen";
import type { DemoUser, Relationship } from "@/domain/models";

/**
 * Repository contracts. Screens and hooks depend on these interfaces only. Phase 2 provides
 * mock implementations (src/data/mock); Phase 4/5 swap in API adapters without touching screens.
 * Add an interface here when a page that needs it is designed — not before.
 */
export interface RelationshipRepository {
  getMe(): Promise<DemoUser>;
  getPartner(): Promise<DemoUser>;
  getRelationship(): Promise<Relationship>;
}

export interface OpenWhenRepository {
  /** Views for the current viewer: sealed letters never include a body. */
  list(): Promise<OpenWhenView[]>;
  get(id: string): Promise<OpenWhenView>;
  open(id: string): Promise<Exclude<OpenResult, { ok: true }> | { ok: true; view: OpenWhenView }>;
}

/** What the app may know about the current device's account state (AUTH-01 to AUTH-08). */
export type AuthStatus =
  | { kind: "signedOut" }
  /** Account created, waiting for the email link. Only a masked address is exposed. */
  | { kind: "verifying"; maskedEmail: string; verified: boolean }
  | { kind: "signedIn"; displayName: string }
  /** Signed out for privacy; nothing private may render (AUTH-07). */
  | { kind: "expired" };

export type CreateAccountResult =
  | { ok: true; maskedEmail: string }
  /** Neutral on purpose: never confirms that an email has an account (AUTH-02). */
  | { ok: false; reason: "may-already-exist" };

export type SignInResult =
  | { ok: true; needsVerification: boolean }
  /** One generic answer for every wrong combination: never says which field (AUTH-03). */
  | { ok: false; reason: "mismatch" }
  | { ok: false; reason: "rate-limited"; retryAfterSeconds: number };

export type VerifyLinkResult = { ok: true } | { ok: false; reason: "expired" };
export type ResetLinkStatus = "valid" | "expired" | "used" | "invalid";
export type ResetPasswordResult =
  { ok: true } | { ok: false; reason: Exclude<ResetLinkStatus, "valid"> };

export interface AuthRepository {
  status(): Promise<AuthStatus>;
  createAccount(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<CreateAccountResult>;
  signIn(input: { email: string; password: string; keepSignedIn: boolean }): Promise<SignInResult>;
  /** Simulated resend; returns the cooldown before another resend is allowed. */
  resendVerification(): Promise<{ cooldownSeconds: number }>;
  /** Simulates opening the verification link from the email preview (demo). */
  openVerificationLink(): Promise<VerifyLinkResult>;
  /** After a successful verification, continues into the app signed in on this phone. */
  finishVerification(): Promise<void>;
  /** Leaves the verifying state (Change email). */
  cancelVerification(): Promise<void>;
  /** Always resolves the same way, whether or not the account exists (AUTH-05). */
  requestPasswordReset(email: string): Promise<void>;
  checkResetLink(token: string): Promise<ResetLinkStatus>;
  resetPassword(token: string, password: string): Promise<ResetPasswordResult>;
  /** Items waiting to send that stay on this device after sign-out (AUTH-08). */
  unsentCount(): Promise<number>;
  signOut(): Promise<void>;
}

/** Where the signed-in person is in pairing (PAIR-01 to PAIR-07). `me` is their display name. */
export type PairingStatus = { me: string } & (
  | { kind: "unpaired" }
  | { kind: "inviting"; code: string; expiresAt: string; expired: boolean }
  | { kind: "reviewing"; inviterName: string }
  | { kind: "paired"; partnerName: string }
);

export interface PairingRepository {
  status(): Promise<PairingStatus>;
  /** Creates (or replaces) this person's invitation. Simulated: nothing is sent. */
  createInvite(): Promise<{ code: string; expiresAt: string }>;
  revokeInvite(): Promise<void>;
  /**
   * P-18: one indistinguishable answer for unknown, used, expired or revoked codes. A valid code
   * moves the person to reviewing; the code itself is never needed again on the client.
   */
  checkCode(code: string): Promise<{ ok: true; inviterName: string } | { ok: false }>;
  /** Accepts the invitation under review; fails (the same way) if it stopped being valid. */
  accept(): Promise<{ ok: true; partnerName: string } | { ok: false }>;
  decline(): Promise<void>;
}

/** Identity and setup (SETUP-01 to SETUP-08) for the signed-in person, plus what they may see
 * of their partner's setup (name, side, time zone, ready). */
export interface SetupState {
  profile: Profile;
  partner: DemoPartnerProfile;
}

export type ChooseSideResult =
  | { ok: true }
  /** P-51: the partner already holds this side; the two can never match. */
  | { ok: false; reason: "taken"; partnerSide: GemSide };

export interface SetupRepository {
  get(): Promise<SetupState>;
  /** Saves answers as the person goes (resume later). The side is only set by chooseSide. */
  save(patch: Partial<Omit<Profile, "side" | "complete">>): Promise<void>;
  chooseSide(side: GemSide): Promise<ChooseSideResult>;
  /** Finishes setup once every required step is answered. */
  complete(): Promise<{ ok: true } | { ok: false; missing: SetupStep[] }>;
}

/** One of the viewer's own moments today (HOME-01). The partner's day stays hidden (U-02). */
export interface MomentView {
  id: string;
  text: string;
  emoji: string;
  /** Instant (ISO). */
  at: string;
  visibility: Visibility;
}

export interface HomePerson {
  name: string;
  side: GemSide | null;
  zone: string;
}

export interface HomeToday {
  me: HomePerson;
  partner: HomePerson;
  /** The viewer's own moments today in their zone, newest first. */
  moments: MomentView[];
  /** The next yearly event, if any (HOME-01 "Coming up"). */
  event: { title: string; emoji: string; date: string; daysAway: number } | null;
  /** An Open When letter (or surprise) the viewer may open now. Never any content (A9). */
  waiting: boolean;
  /** The partner's latest signal not yet dismissed on this phone (HOME-02). */
  incoming: { id: string; signal: SignalId } | null;
}

export interface HomeRepository {
  today(): Promise<HomeToday>;
  /** Day-log rule 2: saved as a private draft unless `share` is explicitly true. */
  logMoment(input: { text: string; emoji: string; share: boolean }): Promise<MomentView>;
  /** Sent, nothing more: no delivery or read state (§5). */
  sendSignal(signal: SignalId): Promise<{ sentAt: string }>;
  dismissIncoming(id: string): Promise<void>;
}

/** A moment as the viewer may see it (DAYS-02, -03, -05). */
export interface EntryView {
  id: string;
  mine: boolean;
  authorName: string;
  kind: EntryKind;
  text: string;
  emoji: string;
  /** Instant (ISO). */
  at: string;
  visibility: Visibility;
  media?: DemoMedia;
  mood?: FeelingId;
  activity?: ActivityId;
  place?: string;
  upload?: "uploading" | "failed";
  /** Only the author edits, and only until the day is revealed (§4, U-18). */
  editable: boolean;
}

export interface DaySummary {
  /** The shared day (ISO date, D-12). */
  date: string;
  isToday: boolean;
  /** A few emoji from the visible moments; never a count (§5: no metrics). */
  preview: string[];
  thumb: DemoArt | null;
  /** Who has visible moments that day (shown as two dots with text labels). */
  me: boolean;
  partner: boolean;
  state: RevealState;
}

export interface DayDetail {
  date: string;
  isToday: boolean;
  mine: EntryView[];
  /** Only what the partner shared, or "after our days meet" once revealed. */
  partner: EntryView[];
  state: RevealState;
  me: HomePerson;
  partnerPerson: HomePerson;
}

export interface EntryInput {
  /** Present when editing. */
  id?: string;
  kind: EntryKind;
  text: string;
  emoji: string;
  visibility: Visibility;
  media?: DemoMedia;
  mood?: FeelingId;
  activity?: ActivityId;
  place?: string;
}

export type VisibilityResult =
  { ok: true } | { ok: false; reason: "shared-stays-shared" | "read-only" };

export interface DaysRepository {
  overview(): Promise<{ today: string; days: DaySummary[]; me: HomePerson; partner: HomePerson }>;
  day(date: string): Promise<DayDetail>;
  /** Null when the entry doesn't exist or isn't the viewer's to see. */
  entry(id: string): Promise<EntryView | null>;
  save(input: EntryInput): Promise<EntryView>;
  setVisibility(id: string, visibility: Visibility): Promise<VisibilityResult>;
  /** Either partner may delete a shared moment; private ones only their author (D-11). */
  remove(id: string): Promise<void>;
  retryUpload(id: string): Promise<void>;
  /** "Finish my day": this person is ready for the reveal. */
  finishDay(date: string): Promise<void>;
  search(filter: EntryFilter): Promise<{ date: string; entries: EntryView[] }[]>;
}

/** A signal as either partner sees it (US-01, US-10). */
export interface SignalItem {
  id: string;
  signal: SignalId;
  mine: boolean;
  /** Instant (ISO). */
  at: string;
  payload: SignalPayload;
  responses: SignalResponse[];
}

export interface UsOverview {
  me: HomePerson;
  partner: HomePerson;
  /** The partner's latest support signal not yet answered (US-05), pinned on Us. */
  openSupport: SignalItem | null;
  recent: SignalItem[];
}

export interface UsRepository {
  overview(): Promise<UsOverview>;
  /** Newest first. Never totals or charts (US-10). */
  history(): Promise<SignalItem[]>;
  send(signal: SignalId, payload: SignalPayload): Promise<{ sentAt: string }>;
  respond(id: string, response: SignalResponse): Promise<void>;
}

export interface Repositories {
  relationship: RelationshipRepository;
  openWhen: OpenWhenRepository;
  auth: AuthRepository;
  pairing: PairingRepository;
  setup: SetupRepository;
  home: HomeRepository;
  days: DaysRepository;
  us: UsRepository;
}
