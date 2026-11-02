import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { SURPRISE_KINDS, type SurpriseContent } from "@/domain/surprises";
import { MediaArt } from "@/features/days/components/MediaArt";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { LetterPaper } from "@/features/openWhen/components/LetterPaper";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * What's inside a surprise, by kind (SUR-02, SUR-06): words on glass, a picture or video that
 * opens full screen, a voice note, a letter in serif, a song as a title and link (never audio,
 * spec §33), or a future-date idea. Only ever rendered for the sender, or once opened.
 */
export function SurpriseContentView({
  content,
  authorName,
  recipientName,
  at,
}: {
  content: SurpriseContent;
  authorName: string;
  /** Who it's for ("Dear …" on a letter). */
  recipientName: string;
  at: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const toast = useToast();
  const { openMedia } = useMediaPlayer();
  const kind = SURPRISE_KINDS.find((k) => k.kind === content.kind);
  // A letter is shown on the paper it was written on (P-71).
  if (content.kind === "letter")
    return (
      <LetterPaper
        readOnly
        body={content.text}
        {...(content.paper === undefined ? {} : { paper: content.paper })}
        to={recipientName}
        from={authorName}
      />
    );
  const words =
    content.text.trim().length === 0 ? null : (
      <AppText variant="body" serif={content.kind === "idea"}>
        {content.text}
      </AppText>
    );
  return (
    <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <AppText variant="caption" weight="600" color="accent">
        {kind?.emoji} {kind?.label.toUpperCase()}
      </AppText>
      {content.media !== null && content.media.type !== "voice" ? (
        <Pressable
          onPress={() => {
            const m = content.media;
            if (m === null || m.type === "voice") return;
            openMedia({
              type: m.type,
              art: m.art,
              caption: content.text,
              ...(m.type === "video" ? { seconds: m.seconds } : {}),
              authorName,
              at,
            });
          }}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${content.media.type === "video" ? "Video" : "Photo"}. Open`}
        >
          <MediaArt
            art={content.media.art}
            {...(content.media.type === "video" ? { seconds: content.media.seconds } : {})}
            height={240}
            radius={radii.lg}
          />
        </Pressable>
      ) : null}
      {content.media?.type === "voice" ? (
        <VoicePlayer seconds={content.media.seconds} wave={content.media.wave} />
      ) : null}
      {content.song === null ? null : (
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={[styles.disc, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="title" accessible={false}>
              🎵
            </AppText>
          </View>
          <View style={[styles.flex, { gap: 2 }]}>
            <AppText variant="headline">{content.song.title}</AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {content.song.link}
            </AppText>
          </View>
          <Pressable
            onPress={() => {
              const link = content.song?.link ?? "";
              void Clipboard.setStringAsync(link);
              toast.show("Link copied. Open it in your music app.");
            }}
            accessibilityRole="button"
            accessibilityLabel="Copy song link"
            hitSlop={8}
          >
            <Icon name="copy" size={20} color={colors.accent} />
          </Pressable>
        </View>
      )}
      {words}
      <AppText variant="caption" color="textTertiary">
        — {authorName}
      </AppText>
    </Glass>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  disc: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
