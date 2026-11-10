/**
 * Demo identity and setup state for SETUP-01 to SETUP-08. Fictional and local only: photos are
 * abstract demo pictures and permissions are simulated (Phase 2 scope rule).
 */
import type { GemSide, SetupStep } from "@/domain/identity";

export type DemoPhotoId = "sunrise" | "sea" | "night";
export const DEMO_PHOTOS: readonly DemoPhotoId[] = ["sunrise", "sea", "night"];

/**
 * A person's picture: initials on a swatch, a real image (P-98: an address the app loads with
 * the session, or a local file on mock data), or one of the prototype's sample pictures (still
 * shown if stored, never offered).
 */
export type AvatarChoice =
  | { kind: "initials"; swatch: number }
  | { kind: "image"; uri: string }
  | { kind: "photo"; photo: DemoPhotoId };

export type Appearance = "system" | "light" | "dark";
export type AccentIntensity = "subtle" | "rich";
export type NotificationStatus = "unset" | "on" | "off" | "denied";

export interface NotificationPrefs {
  status: NotificationStatus;
  thoughts: boolean;
  support: boolean;
  days: boolean;
}

export interface Profile {
  displayName: string;
  nickname: string;
  side: GemSide | null;
  avatar: AvatarChoice;
  timeZone: string | null;
  /** The home town as the person writes it (P-79), optional; the partner sees it. */
  homeCity: string | null;
  appearance: Appearance;
  accent: AccentIntensity;
  notifications: NotificationPrefs;
  /** Steps the person has finished or skipped, so setup resumes where they left off. */
  done: SetupStep[];
  complete: boolean;
}

/** The demo partner as this person sees them (Noah, in London). */
export interface DemoPartnerProfile {
  name: string;
  side: GemSide | null;
  timeZone: string;
  homeCity: string | null;
  /** The partner's full birthday, YYYY-MM-DD (P-79), or null before pairing. */
  birthDate: string | null;
  ready: boolean;
  /** Their picture (P-98); their initial when absent. */
  avatar?: AvatarChoice;
}

export interface DemoProfilesState {
  byUser: Record<string, Profile>;
  partner: DemoPartnerProfile;
  /** When the two got together (YYYY-MM-DD), shared by both (P-79). */
  togetherSince: string | null;
}

/** A fresh profile: the account's display name, nothing else chosen. Categories start on (P-52). */
export function newProfile(displayName: string): Profile {
  return {
    displayName,
    nickname: "",
    side: null,
    avatar: { kind: "initials", swatch: 0 },
    timeZone: null,
    homeCity: null,
    appearance: "light",
    accent: "subtle",
    notifications: { status: "unset", thoughts: true, support: true, days: true },
    done: [],
    complete: false,
  };
}

export function createDemoProfiles(): DemoProfilesState {
  return {
    byUser: {},
    partner: {
      name: "Noah",
      side: null,
      timeZone: "Europe/London",
      homeCity: "London",
      birthDate: "1997-09-03",
      ready: false,
    },
    togetherSince: null,
  };
}
