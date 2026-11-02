/**
 * Haptics with one switch (Settings › Motion, P-66): the same calls as expo-haptics, quiet while
 * this person has turned haptics off. ProfileThemeSync keeps the switch in step with settings.
 */
import * as ExpoHaptics from "expo-haptics";

let enabled = true;

/** Turns every haptic in the app on or off. */
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

const quiet = (): Promise<void> => Promise.resolve();

export const Haptics = {
  ImpactFeedbackStyle: ExpoHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: ExpoHaptics.NotificationFeedbackType,
  impactAsync: (style?: ExpoHaptics.ImpactFeedbackStyle) =>
    enabled ? ExpoHaptics.impactAsync(style) : quiet(),
  selectionAsync: () => (enabled ? ExpoHaptics.selectionAsync() : quiet()),
  notificationAsync: (type?: ExpoHaptics.NotificationFeedbackType) =>
    enabled ? ExpoHaptics.notificationAsync(type) : quiet(),
};
