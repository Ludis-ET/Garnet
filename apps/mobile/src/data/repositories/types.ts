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
import type { ChapterPromptId, EventKind, ReminderId, Repeat } from "@/domain/events";
import type { SpecialDay } from "@/domain/companion";
import type { MemoryFilter, MemoryKind } from "@/domain/memories";
import type { SignalId } from "@garnet/domain";
import type { AvatarChoice, DemoPartnerProfile, Profile } from "@/data/fixtures/demoProfile";
import type { GemSide, SetupStep } from "@/domain/identity";
import type { OpenWhenView, OpenResult } from "@/domain/openWhen";
import type { DemoUser, Relationship, UnlockRule } from "@/domain/models";
import type {
  ChatMedia,
  ChatMessage,
  ChatPresence,
  ChatSettings,
  ChatSticker,
  ConversationSummary,
} from "@/domain/chat";
import type { UserSettings } from "@/domain/settings";
import type { SurpriseContent, SurpriseReveal, SurpriseView } from "@/domain/surprises";
import type { PlaceRecord, PlanRecord, PlanTheme, PlanWhen, SongRecord } from "@/domain/together";
import type { NotifyGroup } from "@/domain/notifications";
import type { LetterStyle } from "@/domain/models";

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

export interface CreateLetterInput {
  safePrompt: string;
  body: string;
  /** The paper and hand (P-71); cream and serif when left out. */
  paper?: LetterStyle;
  mediaRefs?: readonly string[];
  unlock?: UnlockRule;
}

export interface OpenWhenRepository {
  /** Views for the current viewer: sealed letters never include a body. */
  list(): Promise<OpenWhenView[]>;
  get(id: string): Promise<OpenWhenView>;
  open(id: string): Promise<Exclude<OpenResult, { ok: true }> | { ok: true; view: OpenWhenView }>;
  createDraft(input: CreateLetterInput): Promise<OpenWhenView>;
  saveDraft(id: string, patch: Partial<CreateLetterInput>): Promise<OpenWhenView>;
  seal(id: string, unlock: UnlockRule): Promise<OpenWhenView>;
  deleteLetter(id: string): Promise<{ ok: boolean }>;
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
  /** The picture chosen in setup (SETUP-04); the partner's shows as their initial. */
  avatar?: AvatarChoice;
}

export interface HomeToday {
  me: HomePerson;
  partner: HomePerson;
  /**
   * Both people are using the app: the partner has joined and finished setup. Until then only
   * the viewer's own character watches from the bottom of each page (P-63).
   */
  partnerActive: boolean;
  /** The viewer's own moments today in their zone, newest first. */
  moments: MomentView[];
  /** The next event, if any (HOME-01 "Coming up"; EVT-09 when it's today). */
  event: {
    id: string;
    kind: EventKind;
    title: string;
    emoji: string;
    date: string;
    daysAway: number;
  } | null;
  /** An Open When letter (or surprise) the viewer may open now. Never any content (A9). */
  waiting: boolean;
  /** How many letters the viewer may open now (their own count, P-66). */
  waitingCount: number;
  /** One memory to revisit today (HOME, P-66): a different one each day. */
  memory: { id: string; title: string; art: DemoArt | null; date: string } | null;
  /** The partner's latest signal not yet dismissed on this phone (HOME-02). */
  incoming: { id: string; signal: SignalId } | null;
  /**
   * What the characters reflect (P-57): each person's latest feeling today and signal in the
   * last few hours. The partner's come only from what they shared, never from drafts (§4).
   */
  companions: {
    me: CompanionSource;
    partner: CompanionSource;
    special: SpecialDay | null;
  };
}

export interface CompanionSource {
  zone: string;
  feeling: FeelingId | null;
  signal: SignalId | null;
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
  /**
   * How far apart (P-66): from each person's rounded location, or their time-zone city when
   * there's none (`approximate`). Only the kilometres; never where either of you is. Null
   * while this person has distance turned off, or before you're paired.
   */
  distance: { km: number; approximate: boolean } | null;
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
  /** Keeps this person's rounded location for the distance (null forgets it), P-66. */
  saveLocation(point: { lat: number; lon: number } | null): Promise<void>;
}

export interface SendMessageInput {
  text?: string | undefined;
  replyToId?: string | undefined;
  media?: ChatMedia | undefined;
  sticker?: ChatSticker | undefined;
}

export interface ChatRepository {
  getSummary(): Promise<ConversationSummary>;
  getMessages(): Promise<ChatMessage[]>;
  sendMessage(input: SendMessageInput): Promise<ChatMessage>;
  editMessage(id: string, text: string): Promise<ChatMessage>;
  deleteMessage(id: string, mode: "for-me" | "for-everyone"): Promise<void>;
  toggleReaction(messageId: string, emoji: string): Promise<ChatMessage>;
  togglePin(messageId: string): Promise<ChatMessage>;
  retryMessage(id: string): Promise<ChatMessage>;
  /** Stops an unfinished upload; the message was never sent, so it goes away. */
  cancelUpload(id: string): Promise<void>;
  /** Marks a message as saved to Memories (this person's own mark). */
  markSaved(id: string): Promise<void>;
  /**
   * This person has read everything so far (their unread counts clear). Private: never sent to
   * the partner; "Seen" stays the mutual choice (P-58, P-66).
   */
  markRead(): Promise<void>;
  /** Typing and "Seen", already filtered by both partners' choices (P-58). */
  presence(): Promise<ChatPresence>;
  getSettings(): Promise<ChatSettings>;
  updateSettings(patch: Partial<ChatSettings>): Promise<ChatSettings>;
  search(query: string): Promise<ChatMessage[]>;
  getPinned(): Promise<ChatMessage[]>;
  getSharedMedia(): Promise<ChatMessage[]>;
}

/** An event as the viewer sees it (EVT-01, EVT-02). Dates are the next occurrence. */
export interface EventView {
  id: string;
  title: string;
  kind: EventKind;
  emoji: string;
  /** The first date (ISO) and the next one on or after today (null once a one-off has passed). */
  first: string;
  next: string | null;
  daysAway: number | null;
  /** How many times it has come round on `next` (years for yearly). */
  occurrence: number;
  time: string | null;
  zone: string | null;
  /** The time in each partner's own zone, for timed events ("19:00 London · 22:00 Addis"). */
  times: { me: string; partner: string } | null;
  repeats: Repeat;
  whose: "me" | "partner" | null;
  description: string;
  reminders: ReminderId[];
  art: DemoArt;
  mine: boolean;
}

export interface EventInput {
  id?: string;
  title: string;
  kind: EventKind;
  date: string;
  time: string | null;
  zone: string | null;
  repeats: Repeat;
  whose: "me" | "partner" | null;
  description: string;
  reminders: ReminderId[];
  art: DemoArt;
}

export type SaveEventResult =
  | { ok: true; event: EventView }
  | { ok: false; reason: "empty-title" | "invalid-time" | "missing-time" };

export interface ChapterSummary {
  month: string;
  number: number;
  title: string;
  from: string;
  to: string;
  art: DemoArt;
  current: boolean;
  memoryCount: number;
}

export interface ChapterDetail extends ChapterSummary {
  memories: MemoryView[];
  reflections: {
    prompt: ChapterPromptId;
    answers: { id: string; name: string; side: GemSide | null; text: string; mine: boolean }[];
  }[];
}

export interface EventsRepository {
  list(): Promise<{ today: string; me: HomePerson; partner: HomePerson; events: EventView[] }>;
  get(id: string): Promise<EventView | null>;
  save(input: EventInput): Promise<SaveEventResult>;
  remove(id: string): Promise<void>;
  chapters(): Promise<ChapterSummary[]>;
  chapter(month: string): Promise<ChapterDetail | null>;
  /** Adds the viewer's own answer to a chapter prompt; every prompt stays optional (EVT-07). */
  reflect(month: string, prompt: ChapterPromptId, text: string): Promise<void>;
  rename(month: string, title: string): Promise<void>;
}

export interface MemoryView {
  id: string;
  mine: boolean;
  authorName: string;
  authorSide: GemSide | null;
  title: string;
  story: string;
  /** ISO date. */
  date: string;
  place: string;
  media: DemoMedia | null;
  kind: MemoryKind;
  tags: string[];
  collections: { id: string; title: string }[];
}

export interface MemoryInput {
  id?: string;
  title: string;
  story: string;
  date: string;
  place: string;
  media: DemoMedia | null;
  tags: string[];
  collectionIds: string[];
}

export interface CollectionView {
  id: string;
  title: string;
  description: string;
  art: DemoArt;
  count: number;
  cover: DemoMedia | null;
}

export interface MemoriesRepository {
  /** Newest first. Shared by both partners; saving is always explicit (§23). */
  list(filter: MemoryFilter): Promise<MemoryView[]>;
  get(id: string): Promise<MemoryView | null>;
  save(input: MemoryInput): Promise<MemoryView>;
  /** Deletes for both of you (MEM-09). Who deleted it is never shown (U-16). */
  remove(id: string): Promise<void>;
  collections(): Promise<CollectionView[]>;
  collection(id: string): Promise<{ collection: CollectionView; memories: MemoryView[] } | null>;
  createCollection(input: { title: string; description: string }): Promise<CollectionView>;
  deleteCollection(id: string): Promise<void>;
  /** Removing from a collection keeps the memory (MEM-09). */
  setInCollection(memoryId: string, collectionId: string, inIt: boolean): Promise<void>;
  /** When they started: chapters and month headers count from here. */
  start(): Promise<string>;
}

/** SET-01 to SET-17: this person's own settings and account controls (prompt 15). */
export interface SettingsView {
  settings: UserSettings;
  me: HomePerson;
  partner: HomePerson;
  email: string;
  devices: { id: string; name: string; lastActive: string; current: boolean }[];
}

export interface SettingsRepository {
  get(): Promise<SettingsView>;
  update(patch: Partial<UserSettings>): Promise<void>;
  /** SET-13: simulated; becomes ready at once and expires after 7 days. */
  prepareExport(): Promise<void>;
  /** Prototype: shows the expired state. */
  expireExport(): Promise<void>;
  signOutDevice(id: string): Promise<void>;
  signOutOtherDevices(): Promise<void>;
  /**
   * SET-14: ends the shared space for this person (direction P-37: export first). What happens
   * to shared content is open (U-20); the prototype only unpairs.
   */
  endSpace(): Promise<void>;
  /** SET-15: simulated; the account is removed from this prototype and signed out (U-23 open). */
  deleteAccount(): Promise<void>;
}

/** NOTIF-01: one row in this person's in-app notification centre. Safe text only. */
export interface InboxItem {
  id: string;
  category: string;
  /** Its settings group (NOTIF-01 details link there). */
  group: NotifyGroup;
  /** The category's name ("Message"). */
  label: string;
  emoji: string;
  title: string;
  body: string;
  at: string;
  /** Where tapping it goes (the target re-checks access). */
  href: string;
  /** For the viewer only: never tells the partner anything (§5). */
  unread: boolean;
}

export interface InboxRepository {
  list(): Promise<InboxItem[]>;
  markRead(id: string): Promise<void>;
  markUnread(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export type SearchKind = "message" | "moment" | "letter" | "memory" | "event";

/** SEARCH-01: one safe result. Never a sealed body, a partner's draft or a deleted item. */
export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  /** A short safe excerpt around the match; null for letters (bodies are never searched). */
  snippet: string | null;
  at: string;
  mine: boolean;
  sealed: boolean;
  href: string;
}

export interface SearchFilters {
  kinds: readonly SearchKind[];
  who: "both" | "me" | "partner";
}

export interface SearchRepository {
  search(query: string, filters: SearchFilters): Promise<SearchResult[]>;
  recent(): Promise<string[]>;
  remember(query: string): Promise<void>;
  forget(query: string): Promise<void>;
  clearRecent(): Promise<void>;
}

/** SUR-01 to SUR-07 (prompt 12). Views come only through viewSurprise (no content before opening). */
export interface SurprisesRepository {
  list(): Promise<{ partnerName: string; items: SurpriseView[] }>;
  get(id: string): Promise<SurpriseView>;
  create(input: {
    content: SurpriseContent;
    safeTitle: string | null;
    reveal: SurpriseReveal;
  }): Promise<{ id: string }>;
  /** The recipient opens it, once its time has come. */
  open(id: string): Promise<SurpriseView>;
  /** Provisional sender option before it opens ("rules not final", P-68). */
  cancel(id: string): Promise<void>;
  /** Provisional: the sender changes the title shown before opening (P-68). */
  retitle(id: string, title: string | null): Promise<void>;
  /** Tries scheduling again after a (simulated) failure. */
  retry(id: string): Promise<void>;
}

/** Our World's shared lists (prompt 13): plans, places and songs, with who added each. */
export type PlanView = PlanRecord & { by: string; mine: boolean };
export type PlaceView = PlaceRecord & { by: string; mine: boolean };
export type SongView = SongRecord & { by: string; mine: boolean };

export interface TogetherRepository {
  plans(): Promise<PlanView[]>;
  /** Adds a plan, or edits one when `id` is given. */
  savePlan(input: {
    id?: string;
    title: string;
    note: string;
    theme: PlanTheme;
    art: DemoArt | null;
    place: string;
    when: PlanWhen;
  }): Promise<{ id: string }>;
  /** "Mark as done together" (FUT-03). */
  completePlan(id: string): Promise<void>;
  deletePlan(id: string): Promise<void>;
  places(): Promise<PlaceView[]>;
  /** "I'm here today": a place someone chose to add, never a position (P-21). */
  addPlace(input: { name: string; note: string; art: DemoArt | null }): Promise<{ id: string }>;
  deletePlace(id: string): Promise<void>;
  songs(): Promise<SongView[]>;
  addSong(input: {
    title: string;
    artist: string;
    link: string;
    note: string;
  }): Promise<{ id: string }>;
  deleteSong(id: string): Promise<void>;
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
  chat: ChatRepository;
  events: EventsRepository;
  memories: MemoriesRepository;
  settings: SettingsRepository;
  inbox: InboxRepository;
  search: SearchRepository;
  surprises: SurprisesRepository;
  together: TogetherRepository;
}
