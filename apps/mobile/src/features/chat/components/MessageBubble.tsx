import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { formatMessageTime, type ChatMessage } from "@/domain/chat";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { useTheme } from "@/theme/ThemeProvider";
import { ChatVoiceBubble } from "./ChatVoiceBubble";

export function MessageBubble({
  message,
  isMine,
  partnerName,
  viewerZone = "Europe/London",
  readReceiptsEnabled = false,
  onLongPress,
  onToggleReaction,
  onRetry,
}: {
  message: ChatMessage;
  isMine: boolean;
  partnerName: string;
  viewerZone?: string;
  readReceiptsEnabled?: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onToggleReaction?: (emoji: string) => void;
  onRetry?: () => void;
}) {
  const { colors, radii, spacing, scheme } = useTheme();
  const { openMedia } = useMediaPlayer();

  const isDeleted = Boolean(message.deletedForEveryone);
  const timeStr = formatMessageTime(message.createdAt, viewerZone);

  // Micro-spring scale for tactile press
  const pressScale = useSharedValue(1);
  const handlePressIn = () => {
    pressScale.set(withSpring(0.975, { damping: 15, stiffness: 350 }));
  };
  const handlePressOut = () => {
    pressScale.set(withSpring(1, { damping: 15, stiffness: 350 }));
  };
  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.get() }],
  }));

  // Asymmetrical iOS Daylight Glass bubble geometry
  const bubbleRadiusStyle = isMine
    ? {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        borderBottomLeftRadius: radii.xl,
        borderBottomRightRadius: radii.sm,
      }
    : {
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        borderBottomLeftRadius: radii.sm,
        borderBottomRightRadius: radii.xl,
      };

  const bubbleBg = isMine ? colors.tintRuby : colors.tintSapphire;
  const bubbleBorder = isMine ? "rgba(229, 72, 106, 0.38)" : "rgba(79, 123, 255, 0.38)";

  const handleMediaPress = () => {
    if (message.media && (message.media.type === "photo" || message.media.type === "video")) {
      openMedia({
        type: message.media.type,
        art: message.media.art,
        caption: message.media.caption,
        seconds: message.media.type === "video" ? message.media.seconds : undefined,
        authorName: isMine ? "You" : partnerName,
        at: timeStr,
      });
    }
  };

  const hasInnerButtons = message.media !== undefined || message.status === "failed";
  const bubbleRoleProps =
    Platform.OS === "web" && hasInnerButtons ? {} : { accessibilityRole: "button" as const };

  return (
    <View
      style={[
        styles.row,
        {
          justifyContent: isMine ? "flex-end" : "flex-start",
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.gutter,
        },
      ]}
    >
      <View style={[styles.bubbleWrapper, { alignItems: isMine ? "flex-end" : "flex-start" }]}>
        {/* Main interactive message bubble */}
        <Animated.View style={animatedBubbleStyle}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onLongPress?.(message);
            }}
            {...bubbleRoleProps}
            accessibilityLabel={`${isMine ? "You" : partnerName}: ${
              isDeleted ? "This message was removed." : message.text || "Media"
            }, sent at ${timeStr}`}
            style={[
              styles.bubble,
              bubbleRadiusStyle,
              {
                backgroundColor: bubbleBg,
                borderColor: bubbleBorder,
                shadowColor: colors.shadow,
                shadowOpacity: scheme === "dark" ? 0.35 : 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              },
            ]}
          >
            {/* Top liquid specular sheen line catching light */}
            <LinearGradient
              colors={[colors.glassSheen, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.specularSheen, bubbleRadiusStyle]}
              pointerEvents="none"
            />

            {/* Quoted reply preview */}
            {message.replyTo ? (
              <View
                style={[
                  styles.replyQuote,
                  {
                    borderLeftColor: isMine ? colors.ruby : colors.sapphire,
                    backgroundColor: colors.surfaceRaised,
                    borderRadius: radii.sm,
                  },
                ]}
              >
                <AppText variant="caption" weight="600" color="textPrimary">
                  {message.replyTo.senderName}
                </AppText>
                <AppText
                  variant="caption"
                  color="textSecondary"
                  numberOfLines={1}
                  style={styles.replyText}
                >
                  {message.replyTo.text}
                </AppText>
              </View>
            ) : null}

            {/* Media content */}
            {message.media && !isDeleted ? (
              <View style={styles.mediaContainer}>
                {message.media.type === "voice" ? (
                  <ChatVoiceBubble
                    id={message.id}
                    seconds={message.media.seconds}
                    wave={message.media.wave}
                    isMine={isMine}
                  />
                ) : (
                  <Pressable
                    onPress={handleMediaPress}
                    accessibilityRole="image"
                    accessibilityLabel={`${message.media.type === "video" ? "Video" : "Photo"} preview`}
                    style={[styles.mediaFrame, { borderRadius: radii.md }]}
                  >
                    <MediaArt
                      art={message.media.art}
                      {...(message.media.type === "video"
                        ? { seconds: message.media.seconds }
                        : {})}
                      height={160}
                      radius={radii.md}
                    />
                  </Pressable>
                )}
                {message.media.caption ? (
                  <AppText variant="footnote" style={styles.mediaCaption}>
                    {message.media.caption}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {/* Text content or deleted note */}
            {isDeleted ? (
              <AppText variant="body" color="textTertiary" style={styles.deletedText}>
                This message was removed.
              </AppText>
            ) : message.text ? (
              <AppText variant="body" style={styles.bodyText}>
                {message.text}
              </AppText>
            ) : null}

            {/* Bubble bottom info row (time + edited + status) */}
            <View style={[styles.infoRow, { justifyContent: isMine ? "flex-end" : "flex-start" }]}>
              {message.editedAt && !isDeleted ? (
                <AppText variant="caption" color="textTertiary" style={styles.metaLabel}>
                  edited
                </AppText>
              ) : null}

              <AppText variant="caption" color="textTertiary" style={styles.metaLabel}>
                {timeStr}
              </AppText>

              {/* Status indicators for author */}
              {isMine && !isDeleted ? (
                <View style={styles.statusBox}>
                  {message.status === "sending" ? (
                    <View style={styles.statusInline}>
                      <Icon name="clock" size={12} color={colors.textTertiary} />
                      <AppText variant="caption" color="textTertiary">
                        Sending…
                      </AppText>
                    </View>
                  ) : message.status === "failed" ? (
                    <Pressable
                      onPress={onRetry}
                      accessibilityRole="button"
                      accessibilityLabel="Not sent, tap to retry"
                      hitSlop={8}
                      style={styles.statusInline}
                    >
                      <Icon name="alert" size={12} color={colors.danger} />
                      <AppText variant="caption" color="danger" weight="600">
                        Not sent · Retry
                      </AppText>
                    </Pressable>
                  ) : (
                    // U-35: delivery state is shown as "Sent" unless both opted into read receipts
                    <AppText variant="caption" color="textTertiary">
                      {readReceiptsEnabled ? "Read" : "Sent"}
                    </AppText>
                  )}
                </View>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>

        {/* Floating Glass Reaction Pills */}
        {message.reactions.length > 0 && !isDeleted ? (
          <View
            style={[
              styles.reactionPillsRow,
              {
                justifyContent: isMine ? "flex-end" : "flex-start",
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            {message.reactions.map((r) => (
              <Pressable
                key={r.emoji}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleReaction?.(r.emoji);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${r.emoji} reaction, ${r.count} total`}
                style={({ pressed }) => [
                  styles.reactionPill,
                  {
                    backgroundColor: r.reactedByMe ? colors.accentSoft : colors.surfaceRaised,
                    borderColor: r.reactedByMe ? colors.accent : colors.border,
                    borderRadius: radii.pill,
                    transform: [{ scale: pressed ? 1.15 : 1 }],
                    shadowColor: colors.shadow,
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  },
                ]}
              >
                <AppText variant="caption" style={styles.reactionEmoji}>
                  {r.emoji}
                </AppText>
                {r.count > 1 ? (
                  <AppText
                    variant="caption"
                    weight="600"
                    color={r.reactedByMe ? "accent" : "textSecondary"}
                  >
                    {r.count}
                  </AppText>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    width: "100%",
  },
  bubbleWrapper: {
    maxWidth: "82%",
  },
  bubble: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
    minWidth: 84,
    overflow: "hidden",
    position: "relative",
  },
  specularSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    opacity: 0.85,
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  replyText: {
    marginTop: 2,
  },
  mediaContainer: {
    marginBottom: 6,
  },
  mediaFrame: {
    overflow: "hidden",
    width: 220,
    marginBottom: 4,
  },
  mediaCaption: {
    marginTop: 4,
  },
  bodyText: {
    lineHeight: 22,
  },
  deletedText: {
    fontStyle: "italic",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reactionPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: -8,
    zIndex: 2,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionEmoji: {
    fontSize: 13,
  },
});
