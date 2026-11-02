import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import { formatDuration } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";
import { VoicePlayer } from "./VoicePlayer";
import { ENTER } from "@/theme/transitions";
import { useTestingTools } from "@/features/prototype/devTools";

const BARS = 28;
const MAX_TICKS = 1200; // two minutes

/** A soft, deterministic "live" level for bar i at tick t (no microphone in Phase 2). */
const level = (i: number, t: number) =>
  0.2 + 0.8 * Math.abs(Math.sin(i * 0.9 + t * 0.55) * Math.cos(i * 0.31 - t * 0.2));

/**
 * DAYS-08 · Voice note (simulated, records nothing): a big record button with a glow that
 * breathes, a live waveform and a timer; Stop, then play it back, record again or use it.
 */
export function VoiceRecorderSheet({
  visible,
  onSave,
  onClose,
}: {
  visible: boolean;
  onSave: (media: Extract<DemoMedia, { type: "voice" }>) => void;
  onClose: () => void;
}) {
  const { colors, spacing, reduceMotion } = useTheme();
  // Testing tools only (P-75); the app itself looks finished.
  const tools = useTestingTools();
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [tick, setTick] = useState(0);
  const [wave, setWave] = useState<number[]>([]);
  const glow = useSharedValue(1);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      setTick((t) => Math.min(MAX_TICKS, t + 1));
    }, 100);
    return () => {
      clearInterval(timer);
    };
  }, [phase]);
  useEffect(() => {
    glow.set(
      phase === "recording" && !reduceMotion
        ? withRepeat(withTiming(1.25, { duration: 900 }), -1, true)
        : withTiming(1, { duration: 200 }),
    );
  }, [phase, reduceMotion, glow]);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.get() }],
    opacity: 0.25 + (glow.get() - 1) * 1.2,
  }));

  const seconds = Math.max(1, Math.round(tick / 10));
  const reset = () => {
    setPhase("idle");
    setTick(0);
    setWave([]);
  };
  const close = () => {
    reset();
    onClose();
  };
  const stop = () => {
    setWave(Array.from({ length: BARS }, (_, i) => level(i, tick / 3)));
    setPhase("done");
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Voice note"
      footer={
        phase === "done" ? (
          <>
            <Button
              label="Use this"
              onPress={() => {
                onSave({ type: "voice", seconds, wave });
                reset();
              }}
            />
            <Button label="Record again" variant="text" onPress={reset} />
          </>
        ) : (
          <Button label="Cancel" variant="text" onPress={close} />
        )
      }
    >
      <View style={styles.center}>
        {tools ? <SimulatedBadge text="Simulated recorder" /> : null}
      </View>
      {phase === "done" ? (
        <Animated.View entering={ENTER} style={{ paddingVertical: spacing.lg }}>
          <VoicePlayer seconds={seconds} wave={wave} />
        </Animated.View>
      ) : (
        <View style={[styles.center, { gap: spacing.lg }]}>
          <View style={[styles.wave, { gap: 3 }]} accessible={false}>
            {Array.from({ length: BARS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: phase === "recording" ? 6 + level(i, tick / 3) * 38 : 6,
                    backgroundColor: phase === "recording" ? colors.accent : colors.textTertiary,
                  },
                ]}
              />
            ))}
          </View>
          <AppText variant="largeTitle" accessibilityLiveRegion="polite">
            {formatDuration(tick / 10)}
          </AppText>
          <View style={styles.button}>
            <Animated.View
              pointerEvents="none"
              style={[styles.glow, { backgroundColor: colors.accent }, glowStyle]}
            />
            <Pressable
              onPress={() => {
                if (phase === "recording") stop();
                else setPhase("recording");
              }}
              accessibilityRole="button"
              accessibilityLabel={phase === "recording" ? "Stop recording" : "Start recording"}
              style={[styles.record, { backgroundColor: colors.accent }]}
            >
              <Icon
                name={phase === "recording" ? "stop" : "mic"}
                size={32}
                color={colors.onAccent}
              />
            </Pressable>
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  wave: { flexDirection: "row", alignItems: "center", height: 48 },
  bar: { width: 4, borderRadius: 2 },
  button: { width: 112, height: 112, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 112, height: 112, borderRadius: 56 },
  record: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
