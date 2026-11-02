import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { DarkGlass } from "@/components/ui/DarkGlass";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { ChatMedia, ChatMessage } from "@/domain/chat";
import { formatMessageTime } from "@/domain/chat";
import { formatDuration } from "@/domain/days";
import type { GemSide } from "@/domain/identity";
import { MediaArt } from "@/features/days/components/MediaArt";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useMediaPlayer, type PlaybackSpeed } from "@/features/media/MediaPlayerContext";
import { useTheme } from "@/theme/ThemeProvider";
import type { MessageAnchor } from "./MessageMenu";
import { ENTER, EXIT, LAYOUT, POP } from "@/theme/transitions";

const R = 22;
const TIGHT = 7;
const SPEEDS: readonly PlaybackSpeed[] = [1, 1.5, 2];

interface Corners {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
}

/** Small icons riding the time: pinned, edited, saved to Memories. */
function Marks({ message, light }: { message: ChatMessage; light: boolean }) {
  const { colors } = useTheme();
  const tone = light ? "#FFFFFF" : colors.textTertiary;
  return (
    <>
      {message.pinned ? <Icon name="pin" size={11} color={tone} /> : null}
      {message.savedAsMemory === true ? <Icon name="bookmark" size={11} color={tone} /> : null}
      {message.editedAt !== null ? (
        <AppText variant="caption" style={[styles.soft, { color: tone }]}>
          edited
        </AppText>
      ) : null}
    </>
  );
}

/**
 * The upload layer over a picture (P-61): the picture dims under frosted glass, a ring fills
 * with the percentage, and tapping the ring cancels. If the upload stops, a calm glass pill
 * offers to try again (never alarming; nothing is lost).
 */
function UploadLayer({
  message,
  onCancel,
  onRetry,
}: {
  message: ChatMessage;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const failed = message.status === "failed";
  const p = message.uploadProgress ?? 0;
  return (
    <Animated.View entering={ENTER} style={[StyleSheet.absoluteFill, styles.dim]}>
      {failed ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Not sent. Try again"
        >
          <Glass radius={999} contentStyle={styles.retry}>
            <Icon name="refresh" size={16} color={colors.accent} />
            <AppText variant="footnote" weight="600">
              Try again
            </AppText>
          </Glass>
        </Pressable>
      ) : (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`Uploading, ${String(Math.round(p * 100))} percent. Cancel`}
          style={styles.center}
        >
          <DarkGlass radius={34} style={styles.ringWrap}>
            <ProgressRing
              progress={p}
              size={60}
              stroke={3.5}
              color="#FFFFFF"
              track="rgba(255,255,255,0.28)"
              reduceMotion={reduceMotion}
            >
              <Icon name="x" size={20} color="#FFFFFF" />
            </ProgressRing>
          </DarkGlass>
          <View style={styles.percent}>
            <AppText variant="caption" weight="600" style={styles.white}>
              {Math.round(p * 100)}%
            </AppText>
          </View>
        </Pressable>
      )}
    </Animated.View>
  );
}

/** A photo or video as the bubble itself: edge to edge, time on a dark glass pill. */
function MediaBubble({
  message,
  media,
  mine,
  corners,
  zone,
  partnerSide,
  onOpen,
  onLongPress,
  onCancel,
  onRetry,
}: {
  message: ChatMessage;
  media: Extract<ChatMedia, { type: "photo" | "video" }>;
  mine: boolean;
  corners: Corners;
  zone: string;
  partnerSide: GemSide | null;
  onOpen: () => void;
  onLongPress: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const w = Math.min(width * 0.7, 290);
  const h = media.type === "video" ? w * 0.72 : w * 1.2;
  const caption = message.text.length > 0 ? message.text : (media.caption ?? "");
  const busy = message.status !== "sent";
  return (
    <View
      style={[
        corners,
        styles.mediaFrame,
        { width: w, borderColor: colors.glassRimStart, shadowColor: colors.shadow },
      ]}
    >
      <Pressable
        onPress={busy ? undefined : onOpen}
        onLongPress={onLongPress}
        delayLongPress={320}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${media.type === "video" ? "Video" : "Photo"}${caption.length > 0 ? `: ${caption}` : ""}. Open`}
      >
        <MediaArt art={media.art} height={h} radius={0} />
        {media.type === "video" && !busy ? (
          <>
            <View style={styles.centerAbs}>
              <DarkGlass radius={30} style={styles.play}>
                <Icon name="play" size={22} color="#FFFFFF" />
              </DarkGlass>
            </View>
            <View style={[styles.pill, styles.topLeft]}>
              <Icon name="video" size={12} color="#FFFFFF" />
              <AppText variant="caption" weight="600" style={styles.white}>
                {formatDuration(media.seconds)}
              </AppText>
            </View>
          </>
        ) : null}
        {caption.length === 0 ? (
          <View style={[styles.pill, styles.bottomRight]}>
            <Marks message={message} light />
            <AppText variant="caption" weight="600" style={styles.white}>
              {formatMessageTime(message.createdAt, zone)}
            </AppText>
          </View>
        ) : null}
        {busy ? <UploadLayer message={message} onCancel={onCancel} onRetry={onRetry} /> : null}
      </Pressable>
      {caption.length === 0 ? null : mine ? (
        <LinearGradient
          colors={[colors.accentStrong, colors.accentStrongEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
        >
          <AppText variant="callout" color="onAccent">
            {caption}
          </AppText>
          <View style={styles.meta}>
            <Marks message={message} light />
            <AppText variant="caption" color="onAccent" style={styles.soft}>
              {formatMessageTime(message.createdAt, zone)}
            </AppText>
          </View>
        </LinearGradient>
      ) : (
        <Glass
          radius={0}
          shadow={false}
          tint={partnerSide ?? "garnet"}
          contentStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
        >
          <AppText variant="callout">{caption}</AppText>
          <View style={styles.meta}>
            <Marks message={message} light={false} />
            <AppText variant="caption" color="textTertiary">
              {formatMessageTime(message.createdAt, zone)}
            </AppText>
          </View>
        </Glass>
      )}
    </View>
  );
}

/**
 * A voice note (P-61): one player for the whole app (starting one pauses another), a play
 * button, a waveform that fills as it plays — tap anywhere on it to jump — the time, and a
 * speed chip (1×, 1.5×, 2×). While it uploads, the button becomes a ring.
 */
function VoiceBody({
  message,
  media,
  mine,
  onCancel,
  onRetry,
}: {
  message: ChatMessage;
  media: Extract<ChatMedia, { type: "voice" }>;
  mine: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const { colors, spacing, reduceMotion } = useTheme();
  const player = useMediaPlayer();
  const [waveWidth, setWaveWidth] = useState(1);
  const active = player.voice.activeId === message.id;
  const playing = active && player.voice.isPlaying;
  const progress = active && media.seconds > 0 ? player.voice.elapsed / media.seconds : 0;
  const ink = mine ? "#FFFFFF" : colors.accent;
  const faded = mine ? "rgba(255,255,255,0.45)" : colors.textTertiary;
  const busy = message.status === "sending";
  const failed = message.status === "failed";
  return (
    <View style={[styles.voice, { gap: spacing.md }]}>
      {busy ? (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={`Uploading, ${String(Math.round((message.uploadProgress ?? 0) * 100))} percent. Cancel`}
        >
          <ProgressRing
            progress={message.uploadProgress ?? 0}
            size={42}
            color={ink}
            track={faded}
            reduceMotion={reduceMotion}
          >
            <Icon name="x" size={16} color={ink} />
          </ProgressRing>
        </Pressable>
      ) : failed ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Not sent. Try again"
        >
          <View
            style={[
              styles.voicePlay,
              { backgroundColor: mine ? "rgba(255,255,255,0.22)" : colors.accentSoft },
            ]}
          >
            <Icon name="refresh" size={18} color={ink} />
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            player.toggleVoice(message.id, media.seconds);
          }}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause voice note" : "Play voice note"}
        >
          <View style={[styles.voicePlay, { backgroundColor: mine ? "#FFFFFF" : colors.accent }]}>
            <Icon
              name={playing ? "pause" : "play"}
              size={18}
              color={mine ? colors.accentStrong : colors.onAccent}
            />
          </View>
        </Pressable>
      )}
      <View style={styles.flex}>
        <Pressable
          onLayout={(e) => {
            setWaveWidth(Math.max(1, e.nativeEvent.layout.width));
          }}
          onPress={(e) => {
            if (busy || failed) return;
            const at = Math.max(0, Math.min(1, e.nativeEvent.locationX / waveWidth));
            if (!active) player.playVoice(message.id, media.seconds);
            player.seekVoice(at * media.seconds);
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Voice note position"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={styles.wave}
        >
          {media.wave.map((v, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: 4 + v * 24,
                  backgroundColor: i / media.wave.length < progress ? ink : faded,
                },
              ]}
            />
          ))}
        </Pressable>
        <View style={[styles.row, { gap: spacing.sm, marginTop: 2 }]}>
          <AppText variant="caption" weight="600" style={{ color: ink }}>
            {busy
              ? `Uploading ${String(Math.round((message.uploadProgress ?? 0) * 100))}%`
              : failed
                ? "Not sent"
                : formatDuration(active ? player.voice.elapsed : media.seconds)}
          </AppText>
          <View style={styles.flex} />
          {active ? (
            <Pressable
              onPress={() => {
                const i = SPEEDS.indexOf(player.voice.speed);
                player.setVoiceSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Speed ${String(player.voice.speed)} times`}
              hitSlop={8}
              style={[styles.speed, { borderColor: faded }]}
            >
              <AppText variant="caption" weight="600" style={{ color: ink }}>
                {player.voice.speed}×
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * One message (CHAT-01, redesign P-61). Mine: a lip-gradient bubble in my colour on the right;
 * Noah's: glass tinted his colour on the left (alignment too, never colour alone). Photos and
 * videos are the bubble itself; voice notes get a full player; uploads show progress inside.
 * Runs of messages hug each other; reactions sit on the lower edge. Hold it, or right-click on
 * the web, for the reactions and the menu (P-63); double-tap (or double-click) to love it.
 */
export function Bubble({
  message,
  mine,
  partnerSide,
  zone,
  joinAbove,
  joinBelow,
  highlighted,
  onLongPress,
  onOpenMedia,
  onRetry,
  onCancel,
  onReact,
  preview = false,
}: {
  message: ChatMessage;
  mine: boolean;
  partnerSide: GemSide | null;
  zone: string;
  joinAbove: boolean;
  joinBelow: boolean;
  highlighted: boolean;
  /** Opens the menu over the message, given where it is on screen. */
  onLongPress: (anchor: MessageAnchor) => void;
  onOpenMedia: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onReact: (emoji: string) => void;
  /** A still copy drawn by the hold menu: no entrance, no touches. */
  preview?: boolean;
}) {
  const { colors, spacing, reduceMotion } = useTheme();
  const removed = message.deletedForEveryone === true;
  const row = useRef<View>(null);
  const screen = useWindowDimensions();
  const openMenu = () => {
    let opened = false;
    const open = (anchor: MessageAnchor) => {
      if (opened) return;
      opened = true;
      onLongPress(anchor);
    };
    row.current?.measureInWindow((x, y, width, height) => {
      open({ x, y, width, height });
    });
    // Where the view can't be measured (a detached view, tests), open it mid-screen instead.
    setTimeout(() => {
      open({ x: 0, y: screen.height * 0.4, width: screen.width, height: 64 });
    }, 80);
  };
  // Right-click on the web opens the same menu (and not the browser's).
  const onContextMenu = useEffectEvent((e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!removed) openMenu();
  });
  useEffect(() => {
    if (Platform.OS !== "web" || preview) return;
    const node = row.current as unknown as {
      addEventListener?: (type: string, fn: (e: { preventDefault: () => void }) => void) => void;
      removeEventListener?: (type: string, fn: (e: { preventDefault: () => void }) => void) => void;
    } | null;
    const handler = (e: { preventDefault: () => void }) => {
      onContextMenu(e);
    };
    node?.addEventListener?.("contextmenu", handler);
    return () => {
      node?.removeEventListener?.("contextmenu", handler);
    };
  }, [preview]);
  const media = removed ? undefined : message.media;
  const corners: Corners = mine
    ? {
        borderTopLeftRadius: R,
        borderBottomLeftRadius: R,
        borderTopRightRadius: joinAbove ? TIGHT : R,
        borderBottomRightRadius: joinBelow ? TIGHT : R,
      }
    : {
        borderTopRightRadius: R,
        borderBottomRightRadius: R,
        borderTopLeftRadius: joinAbove ? TIGHT : R,
        borderBottomLeftRadius: joinBelow ? TIGHT : R,
      };
  const time = formatMessageTime(message.createdAt, zone);
  const ink = mine && !removed ? "onAccent" : "textPrimary";
  const [hearts, setHearts] = useState(0);
  const lastTap = useRef(0);
  const single = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (single.current !== null) clearTimeout(single.current);
    },
    [],
  );
  /** Double-tap any message to send ❤️ (P-62); a single tap still does its own thing. */
  const tap = (onSingle?: () => void) => {
    if (removed) return;
    const t = Date.now();
    if (t - lastTap.current < 300) {
      if (single.current !== null) clearTimeout(single.current);
      single.current = null;
      lastTap.current = 0;
      if (!message.reactions.some((r) => r.emoji === "❤️" && r.reactedByMe)) onReact("❤️");
      setHearts((h) => h + 1);
      return;
    }
    lastTap.current = t;
    if (onSingle !== undefined) {
      single.current = setTimeout(() => {
        single.current = null;
        onSingle();
      }, 300);
    }
  };
  const heart =
    hearts === 0 ? null : (
      <Animated.View
        key={hearts}
        pointerEvents="none"
        {...(reduceMotion ? {} : { entering: POP, exiting: EXIT })}
        style={[styles.heartPop, mine ? styles.heartMine : styles.heartTheirs]}
      >
        <AppText variant="largeTitle" accessible={false}>
          ❤️
        </AppText>
      </Animated.View>
    );
  const sticker = removed ? undefined : message.sticker;

  const quote =
    message.replyTo === null || removed ? null : (
      <View
        style={[
          styles.quote,
          {
            borderLeftColor: mine ? "rgba(255,255,255,0.85)" : colors.accent,
            backgroundColor: mine ? "rgba(255,255,255,0.16)" : colors.glassVeilSoft,
            marginBottom: spacing.xs,
          },
        ]}
      >
        <AppText variant="caption" weight="600" color={ink}>
          {message.replyTo.senderName}
        </AppText>
        <AppText variant="footnote" color={ink} numberOfLines={2}>
          {message.replyTo.text}
        </AppText>
      </View>
    );

  const textBody = (
    <View>
      {quote}
      {media?.type === "voice" ? (
        <VoiceBody
          message={message}
          media={media}
          mine={mine}
          onCancel={onCancel}
          onRetry={onRetry}
        />
      ) : null}
      {removed || (media?.type !== "voice" && message.text.length > 0) ? (
        <AppText variant="body" color={removed ? "textSecondary" : ink} italic={removed}>
          {removed ? "This message was removed." : message.text}
        </AppText>
      ) : null}
      <View style={styles.meta}>
        {removed ? null : <Marks message={message} light={mine} />}
        <AppText
          variant="caption"
          color={mine && !removed ? "onAccent" : "textTertiary"}
          style={styles.soft}
        >
          {time}
        </AppText>
      </View>
    </View>
  );

  return (
    <Animated.View
      ref={row}
      {...(reduceMotion || preview ? {} : { entering: ENTER })}
      {...(reduceMotion || preview ? {} : { layout: LAYOUT })}
      pointerEvents={preview ? "none" : "auto"}
      style={[
        styles.row2,
        mine ? styles.mineRow : styles.theirRow,
        { marginTop: preview ? 0 : joinAbove ? 2 : spacing.sm },
      ]}
    >
      {sticker !== undefined ? (
        <Pressable
          onPress={() => {
            tap();
          }}
          onLongPress={openMenu}
          delayLongPress={320}
          accessibilityRole="image"
          accessibilityLabel={`${mine ? "You" : "Them"}: ${sticker.character} sticker, ${sticker.mood}, ${time}`}
          accessibilityHint="Double-tap to love it. Long-press for options"
          style={({ pressed }) => [
            styles.stickerMsg,
            { transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        >
          <CharacterSlot
            character={sticker.character}
            look={{ mood: sticker.mood, occasion: "everyday" }}
            size={150}
            aspectRatio={FRAME_ASPECT}
          />
          <View style={[styles.stickerTime, mine ? styles.timeMine : styles.timeTheirs]}>
            <Marks message={message} light={false} />
            <AppText variant="caption" color="textTertiary">
              {time}
            </AppText>
          </View>
        </Pressable>
      ) : media !== undefined && media.type !== "voice" ? (
        <View style={highlighted ? [styles.glow, { shadowColor: colors.accent }] : null}>
          <MediaBubble
            message={message}
            media={media}
            mine={mine}
            corners={corners}
            zone={zone}
            partnerSide={partnerSide}
            onOpen={() => {
              tap(onOpenMedia);
            }}
            onLongPress={openMenu}
            onCancel={onCancel}
            onRetry={onRetry}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => {
            tap();
          }}
          onLongPress={removed ? undefined : openMenu}
          delayLongPress={320}
          accessibilityRole="text"
          accessibilityLabel={`${mine ? "You" : "Them"}: ${removed ? "This message was removed." : message.text || (media === undefined ? "" : "Voice note")}, ${time}`}
          {...(removed
            ? {}
            : { accessibilityHint: "Double-tap to love it. Long-press for options" })}
          style={({ pressed }) => [
            styles.max,
            media?.type === "voice" ? styles.voiceMax : null,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
            highlighted ? [styles.glow, { shadowColor: colors.accent }] : null,
          ]}
        >
          {mine && !removed ? (
            <LinearGradient
              colors={[colors.accentStrong, colors.accentStrongEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[corners, styles.mine]}
            >
              {textBody}
            </LinearGradient>
          ) : (
            <Glass
              radius={R}
              shadow={false}
              tint={removed ? "none" : (partnerSide ?? "garnet")}
              style={corners}
              contentStyle={styles.their}
            >
              {textBody}
            </Glass>
          )}
        </Pressable>
      )}
      {heart}
      {message.reactions.length === 0 || removed ? null : (
        <View style={[styles.reactions, mine ? styles.reactMine : styles.reactTheirs]}>
          {message.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => {
                onReact(r.emoji);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${r.emoji}${r.reactedByMe ? ", yours" : ""}`}
              hitSlop={6}
            >
              <Glass
                radius={999}
                shadow={false}
                tint={r.reactedByMe ? "garnet" : "none"}
                contentStyle={styles.reaction}
              >
                <AppText variant="footnote" accessible={false}>
                  {r.emoji}
                </AppText>
              </Glass>
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  row2: { paddingHorizontal: 14 },
  mineRow: { alignItems: "flex-end" },
  theirRow: { alignItems: "flex-start" },
  max: { maxWidth: "80%", borderRadius: R },
  voiceMax: { width: "76%" },
  mine: { paddingHorizontal: 14, paddingVertical: 9, overflow: "hidden" },
  their: { paddingHorizontal: 14, paddingVertical: 9 },
  quote: { borderLeftWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  soft: { opacity: 0.85 },
  white: { color: "#FFFFFF" },
  glow: { shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  mediaFrame: {
    overflow: "hidden",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  centerAbs: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", justifyContent: "center" },
  play: { width: 60, height: 60, alignItems: "center", justifyContent: "center", paddingLeft: 3 },
  pill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(10,8,20,0.45)",
  },
  topLeft: { top: 10, left: 10 },
  bottomRight: { bottom: 10, right: 10 },
  dim: { backgroundColor: "rgba(10,8,20,0.38)", alignItems: "center", justifyContent: "center" },
  ringWrap: { width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  percent: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(10,8,20,0.45)",
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  voice: { flexDirection: "row", alignItems: "center", paddingVertical: 2 },
  voicePlay: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  wave: { flexDirection: "row", alignItems: "center", gap: 2, height: 30 },
  waveBar: { flex: 1, borderRadius: 2 },
  speed: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    backgroundColor: "rgba(127,127,127,0.16)",
  },
  reactions: { flexDirection: "row", gap: 4, marginTop: -8 },
  reactMine: { marginRight: 10 },
  reactTheirs: { marginLeft: 10 },
  reaction: { paddingHorizontal: 7, paddingVertical: 2 },
  stickerMsg: { alignItems: "center" },
  stickerTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    marginBottom: 10,
  },
  timeMine: { alignSelf: "flex-end" },
  timeTheirs: { alignSelf: "flex-start" },
  heartPop: { position: "absolute", top: -14, zIndex: 5 },
  heartMine: { left: "24%" },
  heartTheirs: { right: "24%" },
});
