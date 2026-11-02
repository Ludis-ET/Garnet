import { Temporal } from "temporal-polyfill";
import { requestPinWidget, requestWidgetUpdate } from "react-native-android-widget";
import { writeStored } from "@/data/mock/storage";
import { renderWidget, WIDGET_NAMES } from "./GarnetWidgets";
import type { WidgetSnapshot } from "./snapshot";

export const WIDGET_SNAPSHOT_KEY = "garnet_widget_snapshot_v1";
export function widgetsSupported(): boolean {
  return true;
}

/**
 * Saves the snapshot where the widget task can read it (P-73), then redraws every Garnet widget
 * on the home screen. Only the snapshot crosses over: never the demo state itself.
 */
export function publishWidgets(snapshot: WidgetSnapshot): void {
  writeStored(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  const now = Temporal.Now.instant();
  for (const name of WIDGET_NAMES) {
    requestWidgetUpdate({
      widgetName: name,
      renderWidget: (info) => renderWidget(name, snapshot, info, now),
    }).catch(() => {
      // A widget that can't redraw keeps its last picture until the next refresh.
    });
  }
}

/**
 * Asks the launcher to add a Garnet widget (P-75). True means the launcher showed its prompt,
 * not that the person placed it; false when the launcher can't pin widgets.
 */
export async function pinWidget(name: string): Promise<boolean> {
  try {
    return await requestPinWidget({ widgetName: name });
  } catch {
    return false;
  }
}
