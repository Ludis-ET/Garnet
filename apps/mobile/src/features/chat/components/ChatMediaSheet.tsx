import { useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInRight, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import type { DemoArt, DemoMedia } from "@/data/fixtures/demoDays";
import type { ChatMedia } from "@/domain/chat";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useTheme } from "@/theme/ThemeProvider";

const ARTS: readonly DemoArt[] = ["sunrise", "sea", "night", "garden", "city", "coffee"];
const VIDEO_SECONDS = [12, 31, 8, 45, 19, 24];

const SAMPLES: readonly DemoMedia[] = [
  ...ARTS.map((art): DemoMedia => ({ type: "photo", art })),
  ...ARTS.map((art, i): DemoMedia => ({ type: "video", art, seconds: VIDEO_SECONDS[i] ?? 10 })),
];

export function MediaPreviewModal({
  visible,
  media,
  partnerName,
  onClose,
  onSend,
}: {
  visible: boolean;
  media: DemoMedia | null;
  partnerName: string;
  onClose: () => void;
  onSend: (chatMedia: ChatMedia) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();
  const [caption, setCaption] = useState("");

  if (!visible || !media || media.type === "voice") return null;

  const handleSend = () => {
    onSend({
      ...media,
      ...(caption.trim() ? { caption: caption.trim() } : {}),
    });
    setCaption("");
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.previewBackdrop,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.previewCard, { paddingHorizontal: spacing.gutter }]}
        >
          <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            {/* Destination Pill */}
            <View style={styles.destinationRow}>
              <View
                style={[
                  styles.destBadge,
                  { backgroundColor: colors.accentSoft, borderRadius: radii.pill },
                ]}
              >
                <Icon name="chat" size={14} color={colors.accent} />
                <AppText variant="caption" weight="600" color="accent">
                  Chat with {partnerName}
                </AppText>
              </View>
            </View>

            {/* Large Media Preview */}
            <View style={[styles.largeMediaFrame, { borderRadius: radii.md }]}>
              <MediaArt
                art={media.art}
                {...(media.type === "video" ? { seconds: media.seconds } : {})}
                height={220}
                radius={radii.md}
              />
            </View>

            {/* Caption Input */}
            <View
              style={[
                styles.captionBox,
                { backgroundColor: colors.surfaceRaised, borderRadius: radii.md },
              ]}
            >
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a caption…"
                placeholderTextColor={colors.textTertiary}
                multiline
                accessibilityLabel="Caption input"
                style={[styles.captionInput, { color: colors.textPrimary }]}
              />
            </View>

            {/* Privacy note: Sending media in chat does NOT create a memory automatically */}
            <AppText variant="caption" color="textTertiary" style={styles.privacyNote}>
              This won't be saved as a memory unless you choose to.
            </AppText>

            {/* Action Buttons */}
            <View style={[styles.btnRow, { gap: spacing.sm }]}>
              <View style={styles.flex}>
                <Button label="Cancel" variant="text" onPress={onClose} />
              </View>
              <View style={styles.flex}>
                <Button label="Send" variant="primary" onPress={handleSend} />
              </View>
            </View>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ChatMediaSheet({
  visible,
  partnerName,
  onPick,
  onVoice,
  onClose,
}: {
  visible: boolean;
  partnerName: string;
  onPick: (media: ChatMedia) => void;
  onVoice: () => void;
  onClose: () => void;
}) {
  const { radii, spacing } = useTheme();
  const [step, setStep] = useState<"source" | "grid">("source");
  const [chosenMedia, setChosenMedia] = useState<DemoMedia | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const close = () => {
    setStep("source");
    setChosenMedia(null);
    setPreviewOpen(false);
    onClose();
  };

  const handlePickSample = (media: DemoMedia) => {
    setChosenMedia(media);
    setPreviewOpen(true);
  };

  const handleSendFromPreview = (chatMedia: ChatMedia) => {
    onPick(chatMedia);
    close();
  };

  return (
    <>
      <Sheet
        visible={visible && !previewOpen}
        onClose={close}
        title={step === "source" ? "Share in chat" : "Library"}
      >
        <View style={styles.center}>
          <SimulatedBadge text="Simulated picker" />
        </View>

        {step === "source" ? (
          <Animated.View entering={FadeIn} style={{ gap: spacing.xxs }}>
            <SheetAction
              icon="image"
              label="Photo library"
              onPress={() => {
                setStep("grid");
              }}
            />
            <SheetAction
              icon="sparkle"
              label="Take photo"
              onPress={() => {
                setStep("grid");
              }}
            />
            <SheetAction
              icon="video"
              label="Record video"
              onPress={() => {
                setStep("grid");
              }}
            />
            <SheetAction
              icon="mic"
              label="Voice note"
              onPress={() => {
                close();
                onVoice();
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInRight.springify().damping(18)}
            style={[styles.grid, { gap: spacing.sm }]}
          >
            {SAMPLES.map((m, i) => {
              if (m.type === "voice") return null;
              return (
                <Pressable
                  key={`${m.type}-${m.art}-${i}`}
                  onPress={() => {
                    handlePickSample(m);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.type === "video" ? "Video" : "Photo"} ${i + 1}`}
                  style={[styles.cell, { borderRadius: radii.md }]}
                >
                  <MediaArt
                    art={m.art}
                    {...(m.type === "video" ? { seconds: m.seconds } : {})}
                    height={96}
                    radius={radii.md}
                  />
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </Sheet>

      {/* Preview modal prior to sending */}
      <MediaPreviewModal
        visible={previewOpen}
        media={chosenMedia}
        partnerName={partnerName}
        onClose={() => {
          setPreviewOpen(false);
        }}
        onSend={handleSendFromPreview}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cell: {
    width: "31.5%",
    overflow: "hidden",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 4, 9, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCard: {
    width: "100%",
    maxWidth: 380,
  },
  destinationRow: {
    alignItems: "center",
  },
  destBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  largeMediaFrame: {
    overflow: "hidden",
    width: "100%",
  },
  captionBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  captionInput: {
    fontSize: 15,
    minHeight: 40,
  },
  privacyNote: {
    textAlign: "center",
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
});
