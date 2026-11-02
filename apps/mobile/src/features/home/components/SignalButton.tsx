import { Haptics } from "@/components/ui/haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

/** How long to hold before a signal sends (HOME-04: nothing sends on a tap). */
export const HOLD_MS = 600;
const SIZE = 64;

/**
 * A round glass signal button (HOME-01, HOME-04). Press and hold: liquid rises inside the glass
 * and the signal sends when it's full (light haptic, sparkles, "Sent"). Letting go early drains
 * it and shows "Hold to send". Screen readers get the same through the long-press action.
 * Reduced motion: the fill is instant and nothing bursts.
 */
export function SignalButton({
  emoji,
  word,
  label,
  partnerName,
  onSend,
}: {
  emoji: string;
  word: string;
  /** The signal's full name ("I Thought of You"). */
  label: string;
  partnerName: string;
  onSend: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const fill = useSharedValue(0);
  const [state, setState] = useState<"idle" | "hint" | "sent">("idle");
  const [burst, setBurst] = useState(0);
  const sent = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const later = (ms: number, fn: () => void) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };
  const send = () => {
    sent.current = true;
    fill.set(withTiming(1, { duration: 80 }));
    if (Platform.OS !== "web")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBurst((n) => n + 1);
    setState("sent");
    onSend();
    later(1800, () => {
      setState("idle");
      fill.set(withTiming(0, { duration: 400 }));
    });
  };

  const fillStyle = useAnimatedStyle(() => ({ height: fill.get() * SIZE }));
  const caption = state === "sent" ? "Sent" : state === "hint" ? "Hold to send" : word;

  return (
    <View style={styles.col}>
      <Pressable
        onPressIn={() => {
          sent.current = false;
          if (Platform.OS !== "web") void Haptics.selectionAsync();
          fill.set(
            reduceMotion
              ? withTiming(0.5, { duration: 0 })
              : withTiming(1, { duration: HOLD_MS, easing: Easing.inOut(Easing.quad) }),
          );
        }}
        onPressOut={() => {
          if (sent.current) return;
          fill.set(withTiming(0, { duration: 200 }));
          setState("hint");
          later(1500, () => {
            setState("idle");
          });
        }}
        onLongPress={send}
        delayLongPress={HOLD_MS}
        accessibilityRole="button"
        accessibilityLabel={`${label}, to ${partnerName}`}
        accessibilityHint="Double-tap and hold to send"
        accessibilityActions={[{ name: "longpress", label: "Send" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "longpress") send();
        }}
      >
        <Glass radius={SIZE / 2} contentStyle={styles.button}>
          <Animated.View
            pointerEvents="none"
            style={[styles.fill, { backgroundColor: colors.accentSoft }, fillStyle]}
          />
          <AppText variant="title" style={styles.emoji}>
            {emoji}
          </AppText>
        </Glass>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <SparkleBurst key={burst} play={burst > 0} />
        </View>
      </Pressable>
      <AppText
        variant="caption"
        weight={state === "idle" ? "500" : "600"}
        color={state === "idle" ? "textSecondary" : "accent"}
        accessibilityLiveRegion="polite"
      >
        {caption}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: "center", gap: 6, minWidth: 76 },
  button: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  fill: { position: "absolute", left: 0, right: 0, bottom: 0 },
  emoji: { lineHeight: 34 },
});
