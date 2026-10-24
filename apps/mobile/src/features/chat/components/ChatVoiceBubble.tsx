import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/domain/days";
import { useMediaPlayer, type PlaybackSpeed } from "@/features/media/MediaPlayerContext";
import { useTheme } from "@/theme/ThemeProvider";

export function ChatVoiceBubble({
  id,
  seconds,
  wave = [],
  isMine,
}: {
  id: string;
  seconds: number;
  wave?: readonly number[];
  isMine: boolean;
}) {
  const { colors, spacing } = useTheme();
  const { voice, toggleVoice, setVoiceSpeed, seekVoice } = useMediaPlayer();

  const isCurrent = voice.activeId === id;
  const isPlaying = isCurrent && voice.isPlaying;
  const elapsed = isCurrent ? voice.elapsed : 0;
  const progress = seconds > 0 ? elapsed / seconds : 0;

  const handleToggle = () => {
    toggleVoice(id, seconds);
  };

  const handleSpeedToggle = () => {
    const nextSpeed: PlaybackSpeed = voice.speed === 1 ? 1.5 : voice.speed === 1.5 ? 2 : 1;
    setVoiceSpeed(nextSpeed);
  };

  const displayTime = isCurrent && (isPlaying || elapsed > 0) ? elapsed : seconds;
  const bars =
    wave.length > 0 ? wave : Array.from({ length: 24 }, (_, i) => 0.3 + 0.6 * Math.sin(i * 0.7));

  return (
    <View style={[styles.container, { gap: spacing.sm }]}>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause voice note" : "Play voice note"}
        style={[
          styles.playBtn,
          {
            backgroundColor: isMine ? colors.ruby : colors.sapphire,
          },
        ]}
      >
        <Icon name={isPlaying ? "pause" : "play"} size={16} color={colors.onAccent} />
      </Pressable>

      <Pressable
        onPress={(e) => {
          const width = 140; // rough width
          const x = e.nativeEvent.locationX;
          const fraction = Math.max(0, Math.min(1, x / width));
          seekVoice(fraction * seconds);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Voice progress"
        style={styles.waveContainer}
      >
        {bars.slice(0, 24).map((h, i) => {
          const isPassed = i / 24 <= progress;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: Math.max(4, h * 24),
                  backgroundColor: isPassed
                    ? isMine
                      ? colors.ruby
                      : colors.sapphire
                    : colors.border,
                },
              ]}
            />
          );
        })}
      </Pressable>

      <View style={styles.timeCol}>
        <AppText variant="caption" color="textSecondary" style={styles.timeText}>
          {formatDuration(displayTime)}
        </AppText>
        {isCurrent && isPlaying ? (
          <Pressable
            onPress={handleSpeedToggle}
            accessibilityRole="button"
            accessibilityLabel={`Speed ${voice.speed}x, tap to change`}
            hitSlop={8}
            style={[styles.speedBadge, { backgroundColor: colors.surfaceRaised }]}
          >
            <AppText variant="caption" weight="600" color="accent" style={styles.speedText}>
              {voice.speed}x
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    minWidth: 210,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  waveContainer: {
    flex: 1,
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  timeCol: {
    alignItems: "flex-end",
    minWidth: 36,
  },
  timeText: {
    fontVariant: ["tabular-nums"],
  },
  speedBadge: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  speedText: {
    fontSize: 10,
  },
});
