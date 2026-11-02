import { Haptics } from "@/components/ui/haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { useOptionalToast } from "@/components/ui/Toast";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { formatPromptTitle, type OpenWhenView } from "@/domain/openWhen";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";
import { GemCapsule, type CapsuleSide } from "./components/GemCapsule";
import { LetterPaper } from "./components/LetterPaper";
import { useHomeToday } from "@/features/home/useHome";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { Temporal } from "temporal-polyfill";
import { useOpenLetter, useLetterSides, useOpenWhenLetter } from "./useOpenWhen";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

/** Both names from setup, for "From …" lines and signatures (never hard-coded, P-63). */
function useNames(): { partner: string; me: string; myZone: string; partnerZone: string } {
  const d = useHomeToday().data;
  return {
    partner: d?.partner.name ?? "your person",
    me: d?.me.name ?? "you",
    myZone: d?.me.zone ?? "UTC",
    partnerZone: d?.partner.zone ?? "UTC",
  };
}

export function OpenWhenDetailScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing, radii, reduceMotion } = useTheme();
  const toast = useOptionalToast();

  const { data: letter, isLoading, isError } = useOpenWhenLetter(id);
  const sides = useLetterSides();
  const partnerName = useHomeToday().data?.partner.name ?? "your person";
  const openMutation = useOpenLetter();

  // Dialog & Storyboard Animation States (OPEN-06)
  const [confirmOpenModal, setConfirmOpenModal] = useState(false);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const [animationFrame, setAnimationFrame] = useState<1 | 2 | 3 | 4 | 5>(1);

  const splitProgress = useSharedValue(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => {
        clearTimeout(t);
      });
    };
  }, []);

  // Storyboard runner (5 frames in ≤ 1.5s)
  const startOpeningSequence = () => {
    setConfirmOpenModal(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (reduceMotion) {
      // Reduced motion: immediate cross-fade to opened letter
      openMutation.mutate(id);
      return;
    }

    setIsAnimatingOpen(true);
    setAnimationFrame(1);
    splitProgress.value = withTiming(0, { duration: 100 });

    timersRef.current.forEach((t) => {
      clearTimeout(t);
    });
    timersRef.current = [
      setTimeout(() => {
        setAnimationFrame(2);
        splitProgress.value = withTiming(0.3, { duration: 250 });
      }, 250),
      setTimeout(() => {
        setAnimationFrame(3);
        splitProgress.value = withTiming(0.65, { duration: 300 });
      }, 550),
      setTimeout(() => {
        setAnimationFrame(4);
        splitProgress.value = withTiming(1, { duration: 350 });
      }, 900),
      setTimeout(() => {
        setAnimationFrame(5);
      }, 1250),
      setTimeout(() => {
        setIsAnimatingOpen(false);
        openMutation.mutate(id);
      }, 1500),
    ];
  };

  const handleSkipAnimation = () => {
    timersRef.current.forEach((t) => {
      clearTimeout(t);
    });
    timersRef.current = [];
    setIsAnimatingOpen(false);
    openMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <GlassScreen>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </GlassScreen>
    );
  }

  if (isError || !letter || letter.kind === "unavailable") {
    return (
      <GlassScreen>
        {/* OPEN-08 · Unavailable, removed, access denied */}
        <View
          style={[
            styles.container,
            styles.centerBox,
            { paddingHorizontal: spacing.xl, paddingTop: insets.top },
          ]}
        >
          <GemCapsule state="unavailable" size="lg" />
          <AppText
            variant="headline"
            weight="600"
            style={{ textAlign: "center", marginTop: spacing.xl }}
          >
            This item isn't available here.
          </AppText>
          <AppText
            variant="body"
            color="textSecondary"
            style={{ textAlign: "center", marginTop: spacing.xs }}
          >
            It may have been removed or is no longer accessible.
          </AppText>
          <Button
            label="Back to letters"
            variant="primary"
            onPress={() => {
              goBack("/moments/open-when");
            }}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </GlassScreen>
    );
  }

  // The letter wears its author's gem colour (P-57).
  const side: CapsuleSide =
    letter.kind === "draft" || !letter.viewerIsRecipient ? sides.mine : sides.theirs;

  return (
    <GlassScreen>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Navigation Bar */}
        <View
          style={[styles.navBar, { paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm }]}
        >
          <Pressable
            onPress={() => {
              goBack("/moments/open-when");
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.navTitleWrap}>
            <AppText variant="callout" weight="600" color="textSecondary" numberOfLines={1}>
              {formatPromptTitle(letter.safePrompt)}
            </AppText>
          </View>

          <View style={styles.backButton} />
        </View>

        {/* STATE DISPATCH */}
        {letter.kind === "sealed" ? (
          <SealedLetterContent
            letter={letter}
            side={side}
            onOpenPress={() => {
              setConfirmOpenModal(true);
            }}
          />
        ) : letter.kind === "opened" ? (
          <OpenedLetterContent
            letter={letter}
            onSaveMemory={() => toast?.show("Saved to Memories 💜", "success")}
            onReplyThought={() => {
              toast?.show("Thought sent to partner ✨", "success");
              router.push("/us/chat");
            }}
          />
        ) : (
          <DraftLetterContent
            letter={letter}
            onEdit={() => {
              router.push("/moments/open-when/new");
            }}
          />
        )}

        {/* OPEN-06: Confirmation Dialog */}
        <Modal
          visible={confirmOpenModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setConfirmOpenModal(false);
          }}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                setConfirmOpenModal(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
            <Glass
              radius={radii.xl}
              tint="garnet"
              shadow
              contentStyle={[styles.modalCard, { padding: spacing.xl }]}
            >
              <GemCapsule side={side} state="ready" size="sm" />

              <AppText
                variant="headline"
                weight="600"
                style={{ textAlign: "center", marginTop: spacing.md }}
              >
                Open this letter now?
              </AppText>

              <AppText
                variant="body"
                color="textSecondary"
                style={{ textAlign: "center", marginTop: spacing.xs }}
              >
                "{formatPromptTitle(letter.safePrompt)}"
              </AppText>

              <AppText
                variant="caption"
                color="textTertiary"
                style={{ textAlign: "center", marginTop: 4 }}
              >
                From {partnerName} · Once opened, it will stay in your library
              </AppText>

              <View style={[styles.modalActions, { marginTop: spacing.xl, gap: spacing.sm }]}>
                <Button label="Open letter" variant="primary" onPress={startOpeningSequence} />
                <Button
                  label="Not now"
                  variant="subtle"
                  onPress={() => {
                    setConfirmOpenModal(false);
                  }}
                />
              </View>
            </Glass>
          </View>
        </Modal>

        {/* OPEN-06: 5-Frame Storyboard Animated Overlay */}
        {isAnimatingOpen ? (
          <Pressable
            onPress={handleSkipAnimation}
            accessibilityRole="button"
            accessibilityLabel="Opening letter, tap to skip"
            style={[styles.storyboardBackdrop, { backgroundColor: colors.background }]}
          >
            <View style={styles.storyboardContent}>
              <GemCapsule
                side={side}
                state="opening"
                size="hero"
                splitProgress={
                  animationFrame >= 4
                    ? 1
                    : animationFrame === 3
                      ? 0.65
                      : animationFrame === 2
                        ? 0.3
                        : 0
                }
              />

              {animationFrame >= 3 ? (
                // The entrance and the glow's own opacity live on separate views.
                <Animated.View entering={ENTER} style={styles.glowWrap}>
                  <View style={[styles.storyboardGlow, { backgroundColor: colors.accent }]} />
                </Animated.View>
              ) : null}

              {animationFrame === 5 ? (
                <Animated.View
                  entering={ENTER}
                  style={[styles.storyboardBadge, { marginTop: spacing.xl }]}
                >
                  <CharacterSlot character={side} pose="writingLetter" size={80} />
                  <AppText variant="headline" weight="600" style={{ marginTop: spacing.sm }}>
                    A letter from {partnerName}
                  </AppText>
                </Animated.View>
              ) : null}

              <AppText
                variant="caption"
                color="textTertiary"
                style={{ position: "absolute", bottom: 40 }}
              >
                Tap anywhere to skip
              </AppText>
            </View>
          </Pressable>
        ) : null}
      </View>
    </GlassScreen>
  );
}

/** OPEN-05: Sealed Letter View (Cinematic) */
function SealedLetterContent({
  letter,
  side,
  onOpenPress,
}: {
  letter: Extract<OpenWhenView, { kind: "sealed" }>;
  side: CapsuleSide;
  onOpenPress: () => void;
}) {
  const { spacing, colors } = useTheme();

  const isEligible = letter.eligible;
  const isSender = !letter.viewerIsRecipient;

  let unlockText = "Ready to open";
  if (letter.unlock.type === "date") {
    unlockText = "Opens on 5 January · 06:00 for you";
  } else if (letter.unlock.type === "event") {
    unlockText = "Opens on your first day at work";
  }

  const names = useNames();
  const senderSub = isSender
    ? `Sealed for ${names.partner}`
    : `From ${names.partner} · sealed with care`;

  return (
    <ScrollView contentContainerStyle={[styles.sealedContainer, { padding: spacing.xl }]}>
      {/* Centered Gem Capsule on reflective floor */}
      <View style={styles.heroCapsuleWrap}>
        <GemCapsule side={side} state={isEligible ? "ready" : "sealed"} size="lg" />
      </View>

      {/* Title & Prompt */}
      <AppText variant="title" weight="600" style={styles.sealedPromptText}>
        "{formatPromptTitle(letter.safePrompt)}"
      </AppText>

      {/* Subtitle */}
      <AppText
        variant="callout"
        color="textSecondary"
        style={[styles.sealedSenderText, { marginTop: spacing.xs }]}
      >
        {senderSub}
      </AppText>

      {/* Status indicator */}
      <View style={[styles.statusBadgeRow, { marginTop: spacing.lg }]}>
        <Icon
          name={isEligible ? "sparkle" : "clock"}
          size={16}
          color={isEligible ? colors.accent : colors.textTertiary}
        />
        <AppText variant="footnote" weight="600" color={isEligible ? "accent" : "textSecondary"}>
          {unlockText}
        </AppText>
      </View>

      {/* Action: Open letter if recipient and eligible */}
      {isEligible && !isSender ? (
        <View style={[styles.openActionWrap, { marginTop: spacing.xl * 1.5 }]}>
          <Button label="Open letter" variant="primary" onPress={onOpenPress} />
        </View>
      ) : isSender ? (
        <View style={{ marginTop: spacing.xl }}>
          <AppText variant="footnote" color="textTertiary" style={{ textAlign: "center" }}>
            This letter is safely sealed. {names.partner} will open it when the occasion arrives.
          </AppText>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** OPEN-07: Opened Letter Content */
function OpenedLetterContent({
  letter,
  onSaveMemory,
  onReplyThought,
}: {
  letter: Extract<OpenWhenView, { kind: "opened" }>;
  onSaveMemory: () => void;
  onReplyThought: () => void;
}) {
  const { colors, spacing, radii } = useTheme();
  const { openMedia, toggleVoice, voice } = useMediaPlayer();
  const names = useNames();
  const author = letter.viewerIsRecipient ? names.partner : names.me;
  const opened = Temporal.Instant.from(letter.openedAt);

  return (
    <ScrollView
      contentContainerStyle={[styles.openedScroll, { padding: spacing.gutter, paddingBottom: 60 }]}
    >
      {/* OPEN-07: the letter on the paper it was written on (P-71). */}
      <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
        <AppText variant="caption" color="textTertiary" weight="600">
          OPEN WHEN
        </AppText>
        <AppText variant="title" serif italic>
          {formatPromptTitle(letter.safePrompt)}
        </AppText>
      </View>
      <LetterPaper
        readOnly
        body={letter.body}
        paper={letter.paper}
        to={letter.viewerIsRecipient ? names.me : names.partner}
        from={author}
        signedAt={`Opened ${localTimeLabel(opened, names.myZone)} ${cityForZone(names.myZone)} · ${localTimeLabel(opened, names.partnerZone)} ${cityForZone(names.partnerZone)}`}
      />

      {/* Attachments Section */}
      {letter.mediaRefs.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <AppText variant="callout" weight="600" color="textSecondary">
            Enclosed with this letter
          </AppText>

          <View style={[styles.enclosedRow, { marginTop: spacing.sm, gap: spacing.md }]}>
            {letter.mediaRefs.includes("sea") ? (
              <Pressable
                onPress={() => {
                  openMedia({
                    type: "photo",
                    art: "sea",
                    caption: "Enclosed with letter",
                    authorName: author,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="View enclosed photo"
              >
                <Glass radius={radii.md} shadow={false} contentStyle={{ overflow: "hidden" }}>
                  <MediaArt art="sea" height={160} radius={radii.md} />
                </Glass>
              </Pressable>
            ) : null}

            {/* Voice player if present */}
            <Pressable
              onPress={() => {
                toggleVoice("letter-voice", 42);
              }}
              accessibilityRole="button"
              accessibilityLabel="Play enclosed voice message"
              style={[
                styles.enclosedVoice,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.voicePlayIcon,
                  { backgroundColor: colors.accent, borderRadius: radii.pill },
                ]}
              >
                <Icon
                  name={voice.activeId === "letter-voice" && voice.isPlaying ? "pause" : "play"}
                  size={14}
                  color={colors.onAccent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <AppText variant="footnote" weight="600">
                  Voice note from {author}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  0:42 · Recorded for you
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Actions: Save as memory · Reply with a thought (OPEN-07) */}
      <View style={[styles.openedActionsRow, { marginTop: spacing.xl, gap: spacing.sm }]}>
        <Button
          label="Save as memory"
          variant="subtle"
          onPress={onSaveMemory}
          style={{ flex: 1 }}
        />
        <Button
          label="Reply with a thought"
          variant="primary"
          onPress={onReplyThought}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

/** Draft Letter Content */
function DraftLetterContent({
  letter,
  onEdit,
}: {
  letter: Extract<OpenWhenView, { kind: "draft" }>;
  onEdit: () => void;
}) {
  const { spacing } = useTheme();
  const names = useNames();
  const sides = useLetterSides();
  return (
    <View style={[styles.sealedContainer, { padding: spacing.xl }]}>
      <GemCapsule side={sides.mine} state="draft" size="lg" />
      <AppText
        variant="title"
        weight="600"
        style={[styles.sealedPromptText, { marginTop: spacing.lg }]}
      >
        "{formatPromptTitle(letter.safePrompt)}"
      </AppText>
      <AppText variant="callout" color="textSecondary" style={{ marginTop: spacing.xs }}>
        Unfinished draft
      </AppText>
      {letter.body.trim().length === 0 ? null : (
        <View style={[styles.stretch, { marginTop: spacing.xl }]}>
          <LetterPaper
            readOnly
            body={letter.body}
            paper={letter.paper}
            to={names.partner}
            from={names.me}
          />
        </View>
      )}
      <Button
        label="Continue editing"
        variant="primary"
        onPress={onEdit}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: "stretch" },
  container: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: touchTarget,
    justifyContent: "center",
  },
  navTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  sealedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
  },
  heroCapsuleWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  sealedPromptText: {
    textAlign: "center",
    fontSize: 24,
    lineHeight: 32,
  },
  sealedSenderText: {
    textAlign: "center",
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openActionWrap: {
    width: "100%",
    maxWidth: 280,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  modalActions: {
    width: "100%",
  },
  storyboardBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  storyboardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glowWrap: { position: "absolute", width: 200, height: 200 },
  storyboardGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
  },
  storyboardBadge: {
    alignItems: "center",
  },
  openedScroll: {
    paddingTop: 8,
  },
  openedPaper: {},
  openedBodyText: {
    fontSize: 17,
    lineHeight: 27,
  },
  signatureRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 16,
  },
  enclosedRow: {
    flexDirection: "column",
  },
  enclosedVoice: {
    flexDirection: "row",
    alignItems: "center",
  },
  voicePlayIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  openedActionsRow: {
    flexDirection: "row",
  },
});
