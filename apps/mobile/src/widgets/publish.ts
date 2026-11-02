import type { WidgetSnapshot } from "./snapshot";

/**
 * Home-screen widgets exist only in the Android build for now (P-73; iPhone waits on F-01 and
 * U-01). Elsewhere the snapshot is never built and publishing does nothing.
 */
export function widgetsSupported(): boolean {
  return false;
}

export const publishWidgets: (snapshot: WidgetSnapshot) => void = () => undefined;

/** Asks the launcher to add a widget; false where that isn't possible (P-75). */
export const pinWidget: (name: string) => Promise<boolean> = () => Promise.resolve(false);
