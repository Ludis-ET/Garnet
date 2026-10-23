import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import type { DemoArt } from "@/data/fixtures/demoDays";
import { formatDuration } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";
import { demoPhotoArt } from "@/theme/tokens";

/**
 * A simulated photo or video (Phase 2 has no real media): an abstract gradient "picture" with a
 * soft sun, never a real image. Videos get a glass play disc and a duration badge. Uploads show
 * a glass spinner, or a calm retry capsule when the upload is waiting (DAYS-02).
 */
export function MediaArt({
  art,
  seconds,
  height,
  radius,
  upload,
  onRetry,
  children,
}: {
  art: DemoArt;
  /** Present for videos. */
  seconds?: number;
  height: number;
  radius: number;
  upload?: "uploading" | "failed";
  onRetry?: () => void;
  children?: ReactNode;
}) {
  const { colors, spacing } = useTheme();
  const look = demoPhotoArt[art];
  const video = seconds !== undefined;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${video ? "Video" : "Photo"}: ${look.label} (sample)`}
      style={[styles.frame, { height, borderRadius: radius }]}
    >
      <LinearGradient
        colors={look.colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.sun,
          { width: height * 0.7, height: height * 0.7, borderRadius: height * 0.35 },
        ]}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.18)"]}
        style={[StyleSheet.absoluteFill, styles.shade]}
      />
      {video ? (
        <>
          <View style={styles.center}>
            <Glass radius={26} shadow={false} contentStyle={styles.play}>
              <Icon name="play" size={20} color={colors.textPrimary} />
            </Glass>
          </View>
          <View style={[styles.badge, { right: spacing.sm, bottom: spacing.sm }]}>
            <AppText variant="caption" weight="600" style={styles.white}>
              {formatDuration(seconds)}
            </AppText>
          </View>
        </>
      ) : null}
      {upload === "uploading" ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Glass radius={26} shadow={false} contentStyle={styles.play}>
            <ActivityIndicator color={colors.textPrimary} accessibilityLabel="Uploading" />
          </Glass>
        </Animated.View>
      ) : null}
      {upload === "failed" ? (
        <Animated.View entering={FadeIn} style={[styles.center, { padding: spacing.md }]}>
          <Glass radius={999} contentStyle={[styles.retry, { gap: spacing.sm }]}>
            <AppText variant="footnote" weight="500">
              Couldn't upload yet
            </AppText>
            {onRetry === undefined ? null : (
              <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Try the upload again"
                hitSlop={10}
                style={[styles.retryButton, { backgroundColor: colors.accentSoft }]}
              >
                <Icon name="refresh" size={16} color={colors.accent} />
              </Pressable>
            )}
          </Glass>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", width: "100%" },
  sun: {
    position: "absolute",
    top: "-12%",
    right: "-8%",
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  shade: { top: "50%" },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  play: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  white: { color: "#FFFFFF" },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 6,
    height: 44,
  },
  retryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
