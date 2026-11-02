import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { HomePerson } from "@/data/repositories/types";
import type { MessageState } from "@/domain/chat";
import type { CompanionLook } from "@/domain/companion";
import { artworkFiles } from "@/features/figures/art/artworkFiles";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useTheme } from "@/theme/ThemeProvider";
import { gemOf } from "./Presence";
import { ENTER } from "@/theme/transitions";

/**
 * The partner's tiny face beside "Seen", like a little avatar read marker (P-58, P-61): a head
 * cropped from the owner's image by scripts/make-garnet-brand.py, or a crop of the figure when
 * that file isn't there.
 */
export function SeenFace({ side, look }: { side: HomePerson["side"]; look: CompanionLook }) {
  const { colors } = useTheme();
  const gem = gemOf(side);
  const head = artworkFiles[`${gem}-face`];
  return (
    <View
      style={[
        styles.face,
        { borderColor: colors.glassRimStart, backgroundColor: colors.glassVeil },
      ]}
    >
      {head === undefined ? (
        <View style={styles.faceArt}>
          <CharacterSlot character={gem} look={look} size={92} aspectRatio={FRAME_ASPECT} />
        </View>
      ) : (
        <Image source={head} contentFit="contain" style={styles.head} accessible={false} />
      )}
    </View>
  );
}

/**
 * The status under one of my messages (P-61), each with its own icon and words — never colour
 * alone, and never "delivered" (§5):
 * - Uploading 42 % (a small ring), Sending… (a clock), Not sent · Try again (red, tappable);
 * - Sent (a filled arrow in my colour), Seen (a hollow arrow and the partner's tiny face; only
 *   when both said yes, P-58).
 */
export function StatusRow({
  state,
  progress,
  time,
  partnerSide,
  partnerLook,
  onRetry,
}: {
  state: MessageState;
  progress: number;
  time: string;
  partnerSide: HomePerson["side"];
  partnerLook: CompanionLook;
  onRetry: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const body = (() => {
    switch (state) {
      case "uploading":
        return (
          <>
            <ProgressRing
              progress={progress}
              size={14}
              stroke={2}
              color={colors.accent}
              track={colors.glassRimEnd}
              reduceMotion={reduceMotion}
            />
            <AppText variant="caption" weight="600" color="accent">
              Uploading {Math.round(progress * 100)}%
            </AppText>
          </>
        );
      case "sending":
        return (
          <>
            <Icon name="clock" size={13} color={colors.textTertiary} />
            <AppText variant="caption" color="textTertiary" weight="500">
              Sending…
            </AppText>
          </>
        );
      case "failed":
        return (
          <>
            <Icon name="alert" size={14} color={colors.danger} />
            <AppText variant="caption" color="danger" weight="600">
              Not sent · Try again
            </AppText>
          </>
        );
      case "sent":
        return (
          <>
            <View style={[styles.arrow, { backgroundColor: colors.accent }]}>
              <Icon name="send" size={9} color={colors.onAccent} />
            </View>
            <AppText variant="caption" color="textSecondary" weight="500">
              Sent · {time}
            </AppText>
          </>
        );
      case "seen":
        return (
          <>
            <View style={[styles.arrow, styles.hollow, { borderColor: colors.accent }]}>
              <Icon name="send" size={9} color={colors.accent} />
            </View>
            <AppText variant="caption" color="textSecondary" weight="500">
              Seen
            </AppText>
            <SeenFace side={partnerSide} look={partnerLook} />
          </>
        );
    }
  })();
  return state === "failed" ? (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel="Not sent. Try again"
      style={styles.row}
    >
      {body}
    </Pressable>
  ) : (
    <Animated.View entering={ENTER} style={styles.row} accessibilityLiveRegion="polite">
      {body}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingHorizontal: 18,
    marginTop: 5,
  },
  arrow: {
    width: 16,
    height: 16,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  hollow: { borderWidth: 1.5, backgroundColor: "transparent" },
  face: { width: 24, height: 24, borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  head: { width: 24, height: 24, transform: [{ scale: 1.15 }] },
  faceArt: { position: "absolute", top: -10, left: -20 },
});
