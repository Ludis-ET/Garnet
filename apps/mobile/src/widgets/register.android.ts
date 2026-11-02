import { Temporal } from "temporal-polyfill";
import {
  registerWidgetTaskHandler,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { readStored } from "@/data/mock/storage";
import { isWidgetName, renderWidget } from "./GarnetWidgets";
import { WIDGET_SNAPSHOT_KEY } from "./publish.android";
import { parseWidgetSnapshot } from "./snapshot";

/**
 * Android asks for a widget picture when it's added, resized and every 30 minutes (P-73). The
 * task reads only the saved snapshot, so it works while the app is closed and never sees the
 * demo state. Taps are deep links handled by the app, so clicks need nothing here.
 */
async function widgetTask({
  widgetInfo,
  widgetAction,
  renderWidget: draw,
}: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_DELETED" || widgetAction === "WIDGET_CLICK") return;
  if (!isWidgetName(widgetInfo.widgetName)) return;
  const snapshot = parseWidgetSnapshot(readStored(WIDGET_SNAPSHOT_KEY));
  draw(renderWidget(widgetInfo.widgetName, snapshot, widgetInfo, Temporal.Now.instant()));
  await Promise.resolve();
}

export function registerWidgets(): void {
  registerWidgetTaskHandler(widgetTask);
}
