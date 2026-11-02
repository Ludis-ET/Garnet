import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { DarkGlass } from "@/components/ui/DarkGlass";
import { Icon } from "@/components/ui/Icon";
import { formatDuration } from "@/domain/days";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useTheme } from "@/theme/ThemeProvider";
import { demoPhotoArt } from "@/theme/tokens";
import type { ActiveMediaItem } from "./MediaPlayerContext";
import { useMediaPlayer } from "./MediaPlayerContext";
import { ENTER } from "@/theme/transitions";

const MAX_ZOOM = 4;

/**
 * The full-screen viewer for photos and videos (MEM-06, CHAT-08; redesign P-61): the picture
 * over a deep wash of its own colours. Pinch or double-tap to zoom, drag to look around while
 * zoomed, swipe down to close, tap to hide or show the controls. Videos get a control bar: play,
 * a scrubber you can tap or drag, time left and a sound toggle (playback is simulated in Phase 2).
 * Private: no share button. Reduced motion: no springs.
 */
export function MediaPlayerLightbox({
  media,
  onClose,
}: {
  media: ActiveMediaItem;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { radii, spacing, motion, reduceMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const { videoPlaying, videoElapsed, toggleVideo, seekVideo } = useMediaPlayer();
  const [chrome, setChrome] = useState(true);
  const [muted, setMuted] = useState(false);
  const [barWidth, setBarWidth] = useState(1);

  const look = demoPhotoArt[media.art];
  const isVideo = media.type === "video";
  const duration = media.seconds ?? 10;
  const progress = duration > 0 ? Math.min(1, videoElapsed / duration) : 0;
  const w = Math.min(width, 520);
  const h = Math.min(height * 0.7, isVideo ? w * 0.62 : w * 1.25);

  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const drag = useSharedValue(0);
  const spring = (v: number) =>
    reduceMotion ? withTiming(v, { duration: 120 }) : withSpring(v, motion.spring.smooth);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(MAX_ZOOM, saved.get() * e.scale)));
    })
    .onEnd(() => {
      saved.set(scale.get());
      if (scale.get() <= 1.02) {
        scale.set(spring(1));
        saved.set(1);
        tx.set(spring(0));
        ty.set(spring(0));
      }
    });
  const pan = Gesture.Pan()
    .onChange((e) => {
      if (scale.get() > 1.02) {
        tx.set(tx.get() + e.changeX);
        ty.set(ty.get() + e.changeY);
      } else {
        drag.set(Math.max(0, drag.get() + e.changeY));
      }
    })
    .onEnd((e) => {
      if (scale.get() > 1.02) return;
      if (drag.get() > 140 || e.velocityY > 1100) scheduleOnRN(onClose);
      else drag.set(spring(0));
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomed = scale.get() > 1.02;
      scale.set(spring(zoomed ? 1 : 2.5));
      saved.set(zoomed ? 1 : 2.5);
      if (zoomed) {
        tx.set(spring(0));
        ty.set(spring(0));
      }
    });
  const singleTap = Gesture.Tap().onEnd(() => {
    scheduleOnRN(setChrome, !chrome);
  });
  const gesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() + drag.get() },
      { scale: scale.get() * interpolate(drag.get(), [0, 400], [1, 0.82], "clamp") },
    ],
  }));
  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(drag.get(), [0, 320], [1, 0.2], "clamp"),
  }));

  const when =
    media.at === undefined
      ? null
      : (() => {
          const t = Temporal.Instant.from(media.at).toZonedDateTimeISO(Temporal.Now.timeZoneId());
          return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
        })();

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, backdrop]}>
          <LinearGradient
            colors={[look.colors[2], "#05040A", "#05040A"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <View style={[styles.fill, styles.center]}>
            <Animated.View
              {...(reduceMotion ? {} : { entering: ENTER })}
              style={[{ width: w, borderRadius: radii.lg }, styles.frame, imageStyle]}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${isVideo ? "Video" : "Photo"}${media.caption === undefined ? "" : `: ${media.caption}`}`}
            >
              <MediaArt art={media.art} height={h} radius={radii.lg} />
              {isVideo && (!videoPlaying || chrome) ? (
                <View style={styles.centerAbs} pointerEvents="box-none">
                  <Pressable
                    onPress={toggleVideo}
                    accessibilityRole="button"
                    accessibilityLabel={videoPlaying ? "Pause" : "Play"}
                  >
                    <DarkGlass radius={36} style={styles.bigPlay}>
                      <Icon name={videoPlaying ? "pause" : "play"} size={28} color="#FFFFFF" />
                    </DarkGlass>
                  </Pressable>
                </View>
              ) : null}
            </Animated.View>
          </View>
        </GestureDetector>

        {chrome ? (
          <Animated.View
            entering={ENTER}
            pointerEvents="box-none"
            style={[
              styles.top,
              { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md },
            ]}
          >
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <DarkGlass radius={22} style={styles.round}>
                <Icon name="x" size={20} color="#FFFFFF" />
              </DarkGlass>
            </Pressable>
            <View style={styles.flex}>
              {media.authorName === undefined ? null : (
                <AppText variant="callout" weight="600" style={styles.white}>
                  {media.authorName}
                </AppText>
              )}
              {when === null ? null : (
                <AppText variant="caption" style={styles.dimText}>
                  {when}
                </AppText>
              )}
            </View>
          </Animated.View>
        ) : null}

        {chrome ? (
          <Animated.View
            entering={ENTER}
            style={[
              styles.bottom,
              {
                paddingBottom: insets.bottom + spacing.md,
                paddingHorizontal: spacing.md,
                gap: spacing.sm,
              },
            ]}
          >
            {media.caption === undefined || media.caption.length === 0 ? null : (
              <AppText variant="body" style={[styles.white, styles.captionText]}>
                {media.caption}
              </AppText>
            )}
            {isVideo ? (
              <DarkGlass
                radius={radii.xl}
                style={styles.controlsPane}
                contentStyle={[styles.controls, { gap: spacing.sm }]}
              >
                <Pressable
                  onPress={toggleVideo}
                  accessibilityRole="button"
                  accessibilityLabel={videoPlaying ? "Pause" : "Play"}
                  hitSlop={8}
                >
                  <Icon name={videoPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
                </Pressable>
                <AppText variant="caption" weight="600" style={[styles.white, styles.time]}>
                  {formatDuration(videoElapsed)}
                </AppText>
                <Pressable
                  onLayout={(e) => {
                    setBarWidth(Math.max(1, e.nativeEvent.layout.width));
                  }}
                  onPress={(e) => {
                    seekVideo(
                      Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth)) * duration,
                    );
                  }}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Video position"
                  accessibilityValue={{
                    min: 0,
                    max: Math.round(duration),
                    now: Math.round(videoElapsed),
                  }}
                  style={styles.scrub}
                >
                  <View style={styles.track}>
                    <View style={[styles.fillBar, { width: progress * barWidth }]} />
                  </View>
                  <View style={[styles.knob, { left: progress * barWidth }]} />
                </Pressable>
                <AppText variant="caption" weight="600" style={[styles.white, styles.time]}>
                  -{formatDuration(Math.max(0, duration - videoElapsed))}
                </AppText>
                <Pressable
                  onPress={() => {
                    setMuted((m) => !m);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={muted ? "Sound off. Turn on" : "Sound on. Turn off"}
                  hitSlop={8}
                >
                  <Icon name={muted ? "mute" : "volume"} size={20} color="#FFFFFF" />
                </Pressable>
              </DarkGlass>
            ) : null}
            <AppText variant="caption" style={[styles.dimText, styles.captionText]}>
              Pinch to zoom · swipe down to close
            </AppText>
          </Animated.View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  frame: { overflow: "hidden" },
  centerAbs: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  bigPlay: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  round: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  white: { color: "#FFFFFF" },
  dimText: { color: "rgba(255,255,255,0.65)" },
  captionText: { textAlign: "center" },
  controlsPane: { alignSelf: "stretch" },
  controls: {
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  time: { minWidth: 36, textAlign: "center" },
  scrub: { flex: 1, height: 28, justifyContent: "center" },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  fillBar: { height: 4, backgroundColor: "#FFFFFF" },
  knob: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: "#FFFFFF",
  },
});
