import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, EXIT } from "@/theme/transitions";

export interface SpeechBubbleProps {
  speakerName: string;
  line: string;
  /** Horizontal position of the tail, 0–1 of the bubble's container. */
  anchor: number;
  /** Changes re-run the entrance. */
  lineKey: number;
}

/** A figure's speech bubble. Announced politely to screen readers; never steals focus. */
export function SpeechBubble({ speakerName, line, anchor, lineKey }: SpeechBubbleProps) {
  const { colors, radii, spacing, reduceMotion, elevation } = useTheme();
  const animations = reduceMotion
    ? {}
    : {
        entering: ENTER,
        exiting: EXIT,
      };
  const left = `${Math.round(Math.min(0.85, Math.max(0.15, anchor)) * 100)}%` as const;
  return (
    <Animated.View
      key={lineKey}
      {...animations}
      style={[styles.wrap, { paddingHorizontal: spacing.lg }]}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={`${speakerName} says: ${line}`}
    >
      <View
        style={[
          styles.bubble,
          elevation.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.lg,
            padding: spacing.md,
          },
        ]}
      >
        <AppText variant="caption" color="accent">
          {speakerName}
        </AppText>
        <AppText variant="callout" style={{ marginTop: spacing.xxs }}>
          {line}
        </AppText>
      </View>
      <View
        style={[styles.tail, { left, backgroundColor: colors.surface, borderColor: colors.border }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 12, left: 0, right: 0 },
  bubble: { alignSelf: "stretch" },
  tail: {
    position: "absolute",
    bottom: -7,
    width: 14,
    height: 14,
    marginLeft: -7,
    transform: [{ rotate: "45deg" }],
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
