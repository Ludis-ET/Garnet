import type { LocalNotice } from "./plan";

/**
 * The phone's notification system (P-75). Real notifications are in the Android build
 * (`system.android.ts`); iPhone waits on U-01. Here (web, iOS for now, tests) nothing is shown,
 * and setup keeps its simulated permission prompt.
 */
export function notificationsSupported(): boolean {
  return false;
}

export type Permission = "granted" | "denied" | "undetermined";

export const permission: (ask: boolean) => Promise<Permission> = () =>
  Promise.resolve("undetermined");

export const present: (notice: LocalNotice) => Promise<void> = () => Promise.resolve();

export const reschedule: (notices: readonly LocalNotice[]) => Promise<void> = () =>
  Promise.resolve();

export const setBadge: (count: number) => Promise<void> = () => Promise.resolve();

/** Calls back with the notification's in-app link when one is tapped; returns an unsubscribe. */
export const onOpen: (open: (href: string) => void) => () => void = () => () => undefined;
