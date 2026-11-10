import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { AuthImage } from "@/components/ui/AuthImage";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useSvgId } from "@/components/brand/svgId";
import { AppText } from "@/components/ui/AppText";
import { usePop } from "@/components/ui/motion";
import type { AvatarChoice } from "@/data/fixtures/demoProfile";
import type { GemSide } from "@/domain/identity";
import { avatarSwatches, demoPhotoArt, palette } from "@/theme/tokens";

/** The ring colour: the person's side, or Garnet violet before they choose. */
export function sideColor(side: GemSide | null): string {
  return side === "ruby"
    ? palette.ruby400
    : side === "sapphire"
      ? palette.sapphire400
      : palette.violet400;
}

/**
 * A person's picture (SETUP-04): their own photo (P-98: from their gallery, or their Google
 * account's), or their initial on a swatch gradient from their side's family. Ringed in the side colour; a
 * change pops in with a spring. Decorative: the screen names the person.
 */
export function ProfileAvatar({
  name,
  avatar,
  side,
  size,
}: {
  name: string;
  avatar: AvatarChoice;
  side: GemSide | null;
  size: number;
}) {
  // A picture that can't load (offline before it was ever kept) shows the initial instead.
  const [broken, setBroken] = useState<string | null>(null);
  const key =
    avatar.kind === "photo"
      ? avatar.photo
      : avatar.kind === "image"
        ? avatar.uri
        : `i${String(avatar.swatch)}`;
  const pop = usePop(`${key}-${side ?? "none"}`, 0.1);
  const glow = useSvgId("photo-sun");
  const family = avatarSwatches[side ?? "garnet"];
  const swatch =
    family[avatar.kind === "initials" ? avatar.swatch % family.length : 0] ?? family[0];
  const showImage = avatar.kind === "image" && broken !== avatar.uri;
  const ring = sideColor(side);
  const inner = size - 8;
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";

  return (
    <Animated.View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: ring, shadowColor: ring },
        pop,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: "hidden" }}>
        {showImage ? (
          <AuthImage
            uri={avatar.uri}
            style={StyleSheet.absoluteFill}
            onFailed={() => {
              setBroken(avatar.uri);
            }}
          />
        ) : avatar.kind === "photo" ? (
          <>
            <LinearGradient
              colors={demoPhotoArt[avatar.photo].colors}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* A soft light in the "photo", so it reads as a picture rather than a swatch. */}
            <Svg width={inner} height={inner} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={palette.white} stopOpacity={0.85} />
                  <Stop offset="1" stopColor={palette.white} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={inner * 0.68} cy={inner * 0.34} r={inner * 0.26} fill={`url(#${glow})`} />
            </Svg>
          </>
        ) : (
          <LinearGradient
            colors={swatch.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.center]}
          >
            <AppText
              variant="title"
              serif
              color="onAccent"
              style={{ fontSize: Math.round(inner * 0.42), lineHeight: Math.round(inner * 0.52) }}
            >
              {initial}
            </AppText>
          </LinearGradient>
        )}
        <View style={[StyleSheet.absoluteFill, { borderRadius: inner / 2 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  center: { alignItems: "center", justifyContent: "center" },
});
