import { Pressable, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import type { EntryView } from "@/data/repositories/types";
import { ACTIVITIES, FEELINGS } from "@/domain/days";
import { localTimeLabel } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { MediaArt } from "./MediaArt";
import { VisibilityBadge } from "./VisibilityBadge";
import { VoicePlayer } from "./VoicePlayer";

/** The small facts under a moment: feeling, activity, place. Words, not just emoji. */
export function entryFacts(entry: EntryView): string[] {
  const facts: string[] = [];
  const mood = FEELINGS.find((f) => f.id === entry.mood);
  if (mood !== undefined) facts.push(`${mood.emoji} ${mood.label}`);
  const activity = ACTIVITIES.find((a) => a.id === entry.activity);
  if (activity !== undefined) facts.push(`${activity.emoji} ${activity.label}`);
  if (entry.place !== undefined && entry.place.length > 0) facts.push(`📍 ${entry.place}`);
  return facts;
}

/**
 * One moment in a day (DAYS-02, -03, -04): photos and videos large (they matter most), voice
 * notes as a waveform, everything else a quiet line. The author's own unshared moments carry an
 * "Only you" or "After" badge. Times are in the viewer's zone; the partner's moments also show
 * their own local time ("15:42 · 18:42 for you").
 */
export function EntryCard({
  entry,
  viewerZone,
  authorZone,
  onPress,
  onMenu,
  onRetry,
  compact = false,
}: {
  entry: EntryView;
  viewerZone: string;
  authorZone: string;
  onPress: () => void;
  onMenu?: () => void;
  onRetry?: () => void;
  /** Half-width cards in the recap: the badge moves under the words. */
  compact?: boolean;
}) {
  const { colors, radii, spacing } = useTheme();
  const at = Temporal.Instant.from(entry.at);
  const media = entry.media;
  const facts = entryFacts(entry);
  const feeling = entry.kind === "feeling";
  const label = `${entry.text}, ${localTimeLabel(at, viewerZone)}`;
  // The card opens on its picture and its words; the controls (play, retry, options) sit beside
  // them, never inside the open button (no button inside a button).
  return (
    <View style={styles.press}>
      <Glass radius={radii.lg + 2} shadow={false} contentStyle={{ padding: spacing.sm }}>
        {media !== undefined && media.type !== "voice" ? (
          entry.upload === "failed" ? (
            <MediaArt
              art={media.art}
              {...(media.type === "video" ? { seconds: media.seconds } : {})}
              height={compact ? 132 : 176}
              radius={radii.lg - 4}
              upload="failed"
              {...(onRetry === undefined ? {} : { onRetry })}
            />
          ) : (
            <Pressable
              onPress={onPress}
              accessible={false}
              importantForAccessibility="no"
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <MediaArt
                art={media.art}
                {...(media.type === "video" ? { seconds: media.seconds } : {})}
                height={compact ? 132 : 176}
                radius={radii.lg - 4}
                {...(entry.upload === undefined ? {} : { upload: entry.upload })}
              />
            </Pressable>
          )
        ) : null}
        <View style={{ padding: spacing.sm, gap: spacing.sm }}>
          {media?.type === "voice" ? (
            <VoicePlayer seconds={media.seconds} wave={media.wave} />
          ) : null}
          <View style={[styles.row, { gap: spacing.sm }]}>
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint="Opens this moment"
              style={({ pressed }) => [
                styles.row,
                styles.flex,
                { gap: spacing.sm, minHeight: 36, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <AppText variant={feeling ? "title" : "body"} accessible={false}>
                {entry.emoji}
              </AppText>
              <AppText variant="callout" weight="500" style={styles.flex} numberOfLines={3}>
                {entry.text}
              </AppText>
            </Pressable>
            {compact ? null : <VisibilityBadge visibility={entry.visibility} />}
            {onMenu === undefined ? null : (
              <Pressable
                onPress={onMenu}
                accessibilityRole="button"
                accessibilityLabel="Moment options"
                hitSlop={12}
                style={styles.menu}
              >
                <Icon name="more" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
          {facts.length === 0 &&
          (entry.mine || authorZone === viewerZone) &&
          !(compact && entry.visibility !== "shared") ? null : (
            <View style={[styles.row, styles.wrap, { gap: spacing.sm }]}>
              {compact ? <VisibilityBadge visibility={entry.visibility} /> : null}
              {facts.map((f) => (
                <AppText key={f} variant="caption" color="textSecondary">
                  {f}
                </AppText>
              ))}
              {entry.mine || authorZone === viewerZone ? null : (
                <AppText variant="caption" color="textTertiary">
                  {localTimeLabel(at, authorZone)} for {entry.authorName}
                </AppText>
              )}
            </View>
          )}
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  press: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexWrap: "wrap" },
  flex: { flex: 1 },
  menu: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
