import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A simulated voice note (Phase 2 plays nothing): a play button and a waveform that fills as
 * "playback" runs. The time counts up; Pause stops it where it is.
 */
export function VoicePlayer({
  seconds,
  wave,
  compact = false,
}: {
  seconds: number;
  wave: readonly number[];
  compact?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setElapsed((e) => {
        if (e + 0.1 >= seconds) {
          setPlaying(false);
          return 0;
        }
        return e + 0.1;
      });
    }, 100);
    return () => {
      clearInterval(timer);
    };
  }, [playing, seconds]);
  const progress = seconds === 0 ? 0 : elapsed / seconds;
  const bar = compact ? 22 : 30;
  return (
    <View style={[styles.row, { gap: spacing.md }]}>
      <Pressable
        onPress={() => {
          setPlaying((p) => !p);
        }}
        accessibilityRole="button"
        accessibilityLabel={playing ? "Pause voice note" : "Play voice note"}
        style={[styles.play, { backgroundColor: colors.accent }]}
      >
        <Icon name={playing ? "pause" : "play"} size={18} color={colors.onAccent} />
      </Pressable>
      <View style={[styles.wave, { height: bar }]} accessible={false}>
        {wave.map((h, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(3, h * bar),
                backgroundColor:
                  i / wave.length <= progress && (playing || elapsed > 0)
                    ? colors.accent
                    : colors.textTertiary,
              },
            ]}
          />
        ))}
      </View>
      <AppText variant="footnote" color="textSecondary" style={styles.time}>
        {formatDuration(playing || elapsed > 0 ? elapsed : seconds)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  wave: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2 },
  bar: { flex: 1, borderRadius: 2 },
  time: { minWidth: 34, textAlign: "right" },
});
