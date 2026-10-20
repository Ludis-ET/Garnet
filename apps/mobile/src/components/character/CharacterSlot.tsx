import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { findArtwork } from "@/features/figures/art/artwork";
import { artworkFiles } from "@/features/figures/art/artworkFiles";
import type { Mood } from "@/features/figures/types";
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
  /** Decorative by default. Pass a label only when the figure carries meaning. */
  accessibilityLabel?: string;
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
  accessibilityLabel,
}: CharacterSlotProps) {
  const theme = useTheme();
  const source =
    characterAssets[character]?.[pose] ??
    findArtwork(artworkFiles, character, poseMood[pose], "everyday", false);
  const a11y =
    accessibilityLabel === undefined
      ? { accessible: false, importantForAccessibility: "no-hide-descendants" as const }
      : { accessible: true, accessibilityRole: "image" as const, accessibilityLabel };

  if (source !== undefined) {
    return (
      <Image
        source={source}
        contentFit="contain"
        style={{ height: size, aspectRatio: 1 }}
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
    <View style={{ width: size, height: size }} {...a11y}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.crystal,
          {
            borderRadius: size * 0.28,
            transform: [{ rotate: "45deg" }],
            width: size * 0.62,
            height: size * 0.62,
            top: size * 0.19,
            left: size * 0.19,
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
  crystal: { position: "absolute", opacity: 0.92 },
  devLabel: { position: "absolute", bottom: 0, alignSelf: "center" },
});
