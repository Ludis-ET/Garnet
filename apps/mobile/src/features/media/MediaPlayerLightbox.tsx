import { LinearGradient } from "expo-linear-gradient";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { useOptionalToast } from "@/components/ui/Toast";
import { formatDuration } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";
import { demoPhotoArt } from "@/theme/tokens";
import type { ActiveMediaItem } from "./MediaPlayerContext";
import { useMediaPlayer } from "./MediaPlayerContext";

export function MediaPlayerLightbox({
  media,
  onClose,
}: {
  media: ActiveMediaItem;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();
  const toast = useOptionalToast();
  const { videoPlaying, videoElapsed, toggleVideo, seekVideo } = useMediaPlayer();

  const look = demoPhotoArt[media.art];
  const isVideo = media.type === "video";
  const duration = media.seconds ?? 10;
  const progress = duration > 0 ? Math.min(1, videoElapsed / duration) : 0;

  const handleSaveMemory = () => {
    toast?.show("Saved to Memories 💜", "success");
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss media preview"
        />

        {/* Top bar with back/close, info, and Save as Memory */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.topBar,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingHorizontal: spacing.gutter,
            },
          ]}
        >
          <IconButton icon="x" label="Close media preview" onPress={onClose} />

          <View style={styles.centerInfo}>
            {media.authorName ? (
              <AppText variant="headline" weight="600" style={styles.whiteText}>
                {media.authorName}
              </AppText>
            ) : null}
            {media.at ? (
              <AppText variant="caption" color="textSecondary" style={styles.softWhiteText}>
                {media.at}
              </AppText>
            ) : null}
          </View>

          <IconButton icon="heart" label="Save as memory" onPress={handleSaveMemory} />
        </Animated.View>

        {/* Media Frame in center */}
        <Animated.View
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(180)}
          style={[
            styles.mediaContainer,
            { paddingHorizontal: spacing.gutter, marginVertical: spacing.xl },
          ]}
        >
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${isVideo ? "Video" : "Photo"}: ${look.label}`}
            style={[styles.mediaCard, { borderRadius: radii.xl }]}
          >
            <LinearGradient
              colors={look.colors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Soft celestial glow circle */}
            <View style={styles.celestialGlow} />

            {/* Video center play/pause glass button */}
            {isVideo ? (
              <Pressable
                onPress={toggleVideo}
                accessibilityRole="button"
                accessibilityLabel={videoPlaying ? "Pause video" : "Play video"}
                style={styles.centerPlayButton}
              >
                <Glass radius={36} shadow contentStyle={styles.playDisc}>
                  <Icon
                    name={videoPlaying ? "pause" : "play"}
                    size={28}
                    color={colors.textPrimary}
                  />
                </Glass>
              </Pressable>
            ) : null}

            {/* In-frame bottom controls for video */}
            {isVideo ? (
              <View
                style={[
                  styles.videoControlBar,
                  {
                    paddingHorizontal: spacing.md,
                    paddingBottom: spacing.sm,
                  },
                ]}
              >
                <Pressable
                  onPress={(e) => {
                    const width = 280; // approx width
                    const x = e.nativeEvent.locationX;
                    const fraction = Math.max(0, Math.min(1, x / width));
                    seekVideo(fraction * duration);
                  }}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Video scrubber"
                  style={styles.scrubberTouchArea}
                >
                  <View style={styles.scrubberTrack}>
                    <View
                      style={[
                        styles.scrubberFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: colors.accent,
                        },
                      ]}
                    />
                  </View>
                </Pressable>

                <View style={styles.timeRow}>
                  <AppText variant="caption" weight="600" style={styles.whiteBadgeText}>
                    {formatDuration(videoElapsed)}
                  </AppText>
                  <AppText variant="caption" style={styles.softWhiteText}>
                    {formatDuration(duration)}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Caption at bottom if present */}
        {media.caption ? (
          <Animated.View
            entering={FadeIn.delay(100).duration(200)}
            style={[
              styles.captionContainer,
              {
                paddingBottom: Math.max(insets.bottom, 24),
                paddingHorizontal: spacing.gutter,
              },
            ]}
          >
            <Glass radius={radii.lg} contentStyle={{ padding: spacing.md }}>
              <AppText variant="body" style={styles.captionText}>
                {media.caption}
              </AppText>
            </Glass>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 8, 16, 0.94)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  centerInfo: {
    alignItems: "center",
    justifyContent: "center",
  },
  whiteText: {
    color: "#FFFFFF",
  },
  softWhiteText: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  whiteBadgeText: {
    color: "#FFFFFF",
  },
  mediaContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCard: {
    width: "100%",
    maxWidth: 420,
    aspectRatio: 0.85,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  celestialGlow: {
    position: "absolute",
    top: "-15%",
    right: "-15%",
    width: "70%",
    height: "70%",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  centerPlayButton: {
    zIndex: 5,
  },
  playDisc: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  videoControlBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingTop: 8,
  },
  scrubberTouchArea: {
    height: 20,
    justifyContent: "center",
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    borderRadius: 2,
    overflow: "hidden",
  },
  scrubberFill: {
    height: "100%",
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  captionContainer: {
    zIndex: 10,
  },
  captionText: {
    textAlign: "center",
  },
});
