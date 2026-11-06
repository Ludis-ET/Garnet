import { writeStored } from "@/data/mock/storage";
import type { WidgetSnapshot } from "./snapshot";

export const WIDGET_SNAPSHOT_KEY = "garnet_widget_snapshot_v1";

/**
 * Widget snapshot publishing (P-73, P-90):
 * Stores the privacy-sanitized snapshot for native widget extensions (iOS WidgetKit & Android Glance).
 * Only the snapshot crosses over: never user credentials, draft entries or relationship metrics (§5).
 */
export function widgetsSupported(): boolean {
  return true;
}

export function publishWidgets(snapshot: WidgetSnapshot): void {
  writeStored(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

/** Asks the launcher to add a widget; false where that isn't possible (P-75). */
export const pinWidget: (name: string) => Promise<boolean> = () => Promise.resolve(false);
