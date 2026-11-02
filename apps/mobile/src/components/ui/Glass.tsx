import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export type GlassTint = "none" | "ruby" | "sapphire" | "garnet";

export interface GlassProps {
  children?: ReactNode;
  /** Corner radius in points (tokens: radii). */
  radius: number;
  /** "veil" carries text (≥ 72 % white in light); "soft" is decorative only. */
  veil?: "veil" | "soft";
  tint?: GlassTint;
  /** Long soft shadow under the pane. Off for panes nested inside other glass. */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Padding etc. for the content box (inside the clipped pane). */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A liquid glass pane (Daylight Glass, P-48; "liquid" pass, P-51): backdrop blur, a light veil
 * (text colours pass AA on the raw aurora, so the veil can stay see-through), an optional colour
 * tint, a soft top sheen and a long soft shadow, and no outline (P-67). With
 * Reduce Transparency the pane is solid.
 *
 * Android: expo-blur only blurs with a blur target, so there the veil alone frosts the pane.
 */
export function Glass({
  children,
  radius,
  veil = "veil",
  tint = "none",
  shadow = true,
  style,
  contentStyle,
}: GlassProps) {
  const { colors, scheme, reduceTransparency } = useTheme();
  const tintColor =
    tint === "ruby"
      ? colors.tintRuby
      : tint === "sapphire"
        ? colors.tintSapphire
        : tint === "garnet"
          ? colors.tintGarnet
          : null;
  const blur = !reduceTransparency && Platform.OS !== "android";
  const inner = Math.max(0, radius - RIM);
  return (
    <View
      style={[
        { borderRadius: radius },
        shadow && {
          shadowColor: colors.shadow,
          shadowOpacity: scheme === "dark" ? 0.4 : 0.1,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 12 },
        },
        style,
      ]}
    >
      {/* No rim (owner direction P-67): depth comes from blur, veil, sheen and the soft shadow. */}
      <View style={{ borderRadius: radius }}>
        <View
          style={[
            styles.clip,
            {
              borderRadius: inner,
              backgroundColor: reduceTransparency ? colors.surface : "transparent",
            },
          ]}
        >
          {blur ? (
            <BlurView
              intensity={40}
              tint={scheme === "dark" ? "dark" : "light"}
              // Rounded itself: on web a backdrop blur escapes its parent's rounded clip while
              // the parent is transformed (moving tab and segment thumbs), showing a square.
              style={[StyleSheet.absoluteFill, { borderRadius: inner, overflow: "hidden" }]}
            />
          ) : null}
          {reduceTransparency ? null : (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: inner,
                  backgroundColor: veil === "veil" ? colors.glassVeil : colors.glassVeilSoft,
                },
              ]}
            />
          )}
          {tintColor === null ? null : (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { borderRadius: inner, backgroundColor: tintColor }]}
            />
          )}
          {reduceTransparency ? null : (
            // The sheen: a soft gloss over the upper part of the pane.
            <LinearGradient
              pointerEvents="none"
              colors={[colors.glassSheen, "transparent"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[styles.sheen, { borderTopLeftRadius: inner, borderTopRightRadius: inner }]}
            />
          )}
          <View style={contentStyle}>{children}</View>
        </View>
      </View>
    </View>
  );
}

/** No visible rim (P-67); kept as a constant so the clip radius stays explicit. */
const RIM = 0;

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  sheen: { position: "absolute", top: 0, left: 0, right: 0, height: "48%" },
});
