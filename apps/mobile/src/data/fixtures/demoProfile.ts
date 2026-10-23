/**
 * Demo identity and setup state for SETUP-01 to SETUP-08. Fictional and local only: photos are
 * abstract demo pictures and permissions are simulated (Phase 2 scope rule).
 */
import type { GemSide, SetupStep } from "@/domain/identity";

export type DemoPhotoId = "sunrise" | "sea" | "night";
export const DEMO_PHOTOS: readonly DemoPhotoId[] = ["sunrise", "sea", "night"];

export type AvatarChoice =
  { kind: "initials"; swatch: number } | { kind: "photo"; photo: DemoPhotoId };

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
  ready: boolean;
}

export interface DemoProfilesState {
  byUser: Record<string, Profile>;
  partner: DemoPartnerProfile;
}

/** A fresh profile: the account's display name, nothing else chosen. Categories start on (P-52). */
export function newProfile(displayName: string): Profile {
  return {
    displayName,
    nickname: "",
    side: null,
    avatar: { kind: "initials", swatch: 0 },
    timeZone: null,
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
    partner: { name: "Noah", side: null, timeZone: "Europe/London", ready: false },
  };
}
