import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * A dark frosted pane for controls that sit on top of photos and videos (P-61): white icons and
 * words stay readable over any picture (WCAG AA), unlike the light Daylight Glass. The same in
 * both schemes, since it always sits on media.
 */
export function DarkGlass({
  radius,
  style,
  contentStyle,
  children,
}: {
  radius: number;
  /** The pane's size and position. */
  style?: StyleProp<ViewStyle>;
  /** Layout of what's inside (a row of controls, padding). */
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.pane, { borderRadius: radius }, style]}>
      {Platform.OS === "android" ? null : (
        <BlurView
          intensity={30}
          tint="dark"
          style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === "android" ? styles.frost : styles.veil,
          { borderRadius: radius },
        ]}
      />
      {/* Its own layer, so the blur never paints over it (web stacks positioned views on top). */}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  veil: { backgroundColor: "rgba(12,10,22,0.55)" },
  // No live blur on Android: denser, so it reads as frosted glass, not a see-through tint (P-74).
  frost: { backgroundColor: "rgba(12,10,22,0.8)" },
  content: { zIndex: 1, alignItems: "center", justifyContent: "center" },
});
