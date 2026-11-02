import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { findArtwork } from "@/features/figures/art/artwork";
import { artworkFiles } from "@/features/figures/art/artworkFiles";
import type { Mood, Occasion } from "@/features/figures/types";
import { characterAssets, characterNames, type CharacterId, type Pose } from "./characterAssets";

/** Owner images are named by mood (assets/characters/README.md); map each pose to its mood. */
const poseMood: Record<Pose, Mood> = {
  idle: "calm",
  wave: "hello",
  happy: "happy",
  listening: "listening",
  hug: "hug",
  holdingCrystal: "proud",
  nap: "sleepy",
  thinking: "thinking",
  writingLetter: "dreamy",
  celebrating: "celebrating",
  together: "loving",
  goodnight: "sleepy",
};

export interface CharacterSlotProps {
  character: CharacterId;
  pose?: Pose;
  /** Rendered height in points; width follows the art's aspect ratio (placeholder is square). */
  size?: number;
  /** Width ÷ height of the box (default square). Owner images are 2:3 (FRAME_ASPECT). */
  aspectRatio?: number;
  /** Decorative by default. Pass a label only when the figure carries meaning. */
  accessibilityLabel?: string;
  /** A context look (P-57): overrides the pose's mood, and picks an occasion image if any. */
  look?: { mood: Mood; occasion: Occasion };
}

/**
 * The single way screens show Ruby, Sapphire or Garnet. Art stays replaceable (spec §10:
 * "keep character art replaceable"), missing art degrades gracefully, and reduced motion is the
 * caller's concern (static by default).
 */
export function CharacterSlot({
  character,
  pose = "idle",
  size = 160,
  aspectRatio = 1,
  accessibilityLabel,
  look,
}: CharacterSlotProps) {
  const theme = useTheme();
  const source =
    (look === undefined ? characterAssets[character]?.[pose] : undefined) ??
    findArtwork(
      artworkFiles,
      character,
      look?.mood ?? poseMood[pose],
      look?.occasion ?? "everyday",
      false,
    );
  const a11y =
    accessibilityLabel === undefined
      ? { accessible: false, importantForAccessibility: "no-hide-descendants" as const }
      : { accessible: true, accessibilityRole: "image" as const, accessibilityLabel };

  if (source !== undefined) {
    return (
      <Image
        source={source}
        contentFit="contain"
        contentPosition="bottom"
        style={{ height: size, aspectRatio }}
        transition={theme.reduceMotion ? 0 : 180}
        {...a11y}
      />
    );
  }

  const colors =
    character === "ruby"
      ? theme.gradients.ruby
      : character === "sapphire"
        ? theme.gradients.sapphire
        : theme.gradients.together;
  return (
    <View style={[styles.placeholder, { width: size * aspectRatio, height: size }]} {...a11y}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.crystal,
          {
            borderRadius: size * aspectRatio * 0.2,
            transform: [{ rotate: "45deg" }],
            width: size * aspectRatio * 0.5,
            height: size * aspectRatio * 0.5,
          },
        ]}
      />
      {__DEV__ ? (
        <AppText variant="caption" color="textTertiary" style={styles.devLabel}>
          {characterNames[character]} · {pose}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: "center", justifyContent: "center" },
  crystal: { opacity: 0.6 },
  devLabel: { position: "absolute", bottom: 0, alignSelf: "center" },
});
