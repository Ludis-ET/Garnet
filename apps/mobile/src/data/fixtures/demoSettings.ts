/**
 * Demo settings, devices, notification read marks and recent searches (prompts 14, 15, 17).
 * Read marks and recent searches belong to one person on one device: never shared, never a
 * "seen" signal to the partner (§5).
 */
import type { UserSettings } from "@/domain/settings";

export interface DemoDevice {
  id: string;
  name: string;
  /** Hours since last active (fixtures stay current). */
  hoursAgo: number;
  current: boolean;
}

export interface DemoSettingsState {
  byUser: Record<string, Partial<UserSettings>>;
  /** Simulated sessions (SET-12); multi-device behaviour is open (U-19, U-27). */
  devices: DemoDevice[];
  /** Notifications this person marked read (NOTIF-01), by user. */
  readIds: Record<string, string[]>;
  /** Notifications this person marked unread again, by user (wins over reading in chat). */
  keptUnread: Record<string, string[]>;
  /** Recent searches on this device (SEARCH-01), by user. */
  recentSearches: Record<string, string[]>;
  /**
   * Each person's last location, already rounded to about 10 km (P-66), by user. Only ever
   * used to work out the distance; never shown to the partner.
   */
  locations: Record<string, { lat: number; lon: number; at: string } | null>;
}

export function createDemoSettings(partnerId: string): DemoSettingsState {
  return {
    byUser: {},
    devices: [
      { id: "this-phone", name: "This iPhone", hoursAgo: 0, current: true },
      { id: "ipad", name: "iPad", hoursAgo: 52, current: false },
    ],
    readIds: {},
    keptUnread: {},
    recentSearches: {},
    // Noah's phone in London, as if shared from his side.
    locations: { [partnerId]: { lat: 51.5, lon: -0.1, at: "2026-10-01T09:00:00Z" } },
  };
}
