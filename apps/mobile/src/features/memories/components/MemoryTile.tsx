import { Pressable, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import type { MemoryView } from "@/data/repositories/types";
import { formatDuration } from "@/domain/days";
import { memoryDateLabel } from "@/domain/memories";
import { MediaArt } from "@/features/days/components/MediaArt";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * One memory in the masonry (MEM-01): photos and videos as large rounded pictures, voice notes
 * as a glass card with a waveform, words as a quiet serif quote. A thin bar in the author's
 * colour sits under each (with their name for screen readers, never colour alone).
 */
export function MemoryTile({
  memory,
  tall,
  onPress,
}: {
  memory: MemoryView;
  tall: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const media = memory.media;
  const date = memoryDateLabel(Temporal.PlainDate.from(memory.date)).replace(/ \d{4}$/, "");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${memory.title}, ${date}, added by ${memory.authorName}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      {media !== null && media.type !== "voice" ? (
        <Glass radius={radii.xl} contentStyle={{ padding: 4 }}>
          <MediaArt
            art={media.art}
            {...(media.type === "video" ? { seconds: media.seconds } : {})}
            height={tall ? 230 : 160}
            radius={radii.xl - 4}
          />
          <View style={{ padding: spacing.sm, gap: 2 }}>
            <AppText variant="footnote" weight="600" numberOfLines={2}>
              {memory.title}
            </AppText>
            <View style={styles.row}>
              <View style={[styles.bar, { backgroundColor: sideColor(memory.authorSide) }]} />
              <AppText variant="caption" color="textTertiary">
                {date}
              </AppText>
            </View>
          </View>
        </Glass>
      ) : media?.type === "voice" ? (
        <Glass
          radius={radii.xl}
          tint={memory.authorSide ?? "garnet"}
          contentStyle={{ padding: spacing.md, gap: spacing.sm }}
        >
          <AppText variant="title" accessible={false}>
            🎙️
          </AppText>
          <View style={styles.wave} accessible={false}>
            {media.wave.slice(0, 20).map((h, i) => (
              <View
                key={i}
                style={[styles.waveBar, { height: 4 + h * 22, backgroundColor: colors.accent }]}
              />
            ))}
          </View>
          <AppText variant="footnote" weight="600" numberOfLines={2}>
            {memory.title}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {formatDuration(media.seconds)} · {date}
          </AppText>
        </Glass>
      ) : (
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
          <AppText variant="title" serif color="accent" accessible={false}>
            “
          </AppText>
          <AppText variant="callout" serif italic numberOfLines={tall ? 8 : 5}>
            {memory.story.length > 0 ? memory.story : memory.title}
          </AppText>
          <View style={styles.row}>
            <View style={[styles.bar, { backgroundColor: sideColor(memory.authorSide) }]} />
            <AppText variant="caption" color="textTertiary">
              {date}
            </AppText>
          </View>
        </Glass>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  bar: { width: 14, height: 3, borderRadius: 2 },
  wave: { flexDirection: "row", alignItems: "center", gap: 2, height: 28 },
  waveBar: { flex: 1, borderRadius: 2 },
});
