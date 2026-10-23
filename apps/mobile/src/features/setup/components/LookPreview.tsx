import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, useColorScheme, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { AccentIntensity, Appearance } from "@/data/fixtures/demoProfile";
import type { GemSide } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { colorsFor, palette } from "@/theme/tokens";

/**
 * SETUP-06 live preview: a tiny Garnet screen in a glass phone frame, drawn with the chosen
 * side, appearance and accent intensity (aurora, a glass card, a lip button). Decorative; the
 * controls under it carry the meaning. Cross-fades when a choice changes.
 */
export function LookPreview({
  side,
  appearance,
  accent,
}: {
  side: GemSide | null;
  appearance: Appearance;
  accent: AccentIntensity;
}) {
  const { radii, reduceMotion } = useTheme();
  const system = useColorScheme();
  const scheme = appearance === "system" ? (system === "dark" ? "dark" : "light") : appearance;
  const c = colorsFor(scheme, side ?? "garnet");
  const rich = accent === "rich";
  const W = 200;
  const H = 300;
  const orb = (color: string, x: number, y: number, size: number) => (
    <View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: rich ? 0.95 : 0.6,
      }}
    />
  );
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frame,
        { width: W + 12, height: H + 12, borderRadius: radii.xl + 14, borderColor: c.glassRimEnd },
      ]}
    >
      <Animated.View
        key={`${scheme}-${side ?? "g"}-${accent}`}
        {...(reduceMotion ? {} : { entering: FadeIn.duration(260) })}
        style={[
          styles.screen,
          { width: W, height: H, borderRadius: radii.xl + 8, backgroundColor: c.background },
        ]}
      >
        {orb(side === "sapphire" ? c.auroraSky : c.auroraRose, -40, -30, 170)}
        {orb(side === "ruby" ? c.auroraRose : c.auroraSky, 90, 10, 150)}
        {orb(c.auroraLilac, 20, 170, 190)}
        <View style={styles.island} />
        <View style={[styles.card, { backgroundColor: c.glassVeil, borderColor: c.glassRimStart }]}>
          <View style={[styles.line, { width: 90, backgroundColor: c.textPrimary }]} />
          <View
            style={[styles.line, { width: 120, backgroundColor: c.textTertiary, opacity: 0.6 }]}
          />
          <View
            style={[styles.line, { width: 70, backgroundColor: c.textTertiary, opacity: 0.6 }]}
          />
          <View style={[styles.dot, { backgroundColor: c.accent }]} />
        </View>
        <View
          style={[
            styles.card,
            styles.small,
            { backgroundColor: c.glassVeil, borderColor: c.glassRimStart },
          ]}
        >
          <View style={[styles.line, { width: 60, backgroundColor: c.textSecondary }]} />
        </View>
        <View style={styles.buttonWrap}>
          <View style={[styles.lip, { backgroundColor: c.accentLip }]} />
          <LinearGradient
            colors={[c.accentStrong, c.accentStrongEnd]}
            style={[styles.button, rich ? styles.richGlow : null, { shadowColor: c.accentStrong }]}
          >
            <View
              style={[styles.line, { width: 50, backgroundColor: palette.white, marginTop: 0 }]}
            />
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1.5,
    padding: 5,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  screen: { overflow: "hidden" },
  island: {
    alignSelf: "center",
    marginTop: 8,
    width: 54,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0D0B12",
  },
  card: {
    marginHorizontal: 14,
    marginTop: 22,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  small: { marginTop: 10 },
  line: { height: 6, borderRadius: 3 },
  dot: { position: "absolute", right: 12, top: 12, width: 14, height: 14, borderRadius: 7 },
  buttonWrap: { position: "absolute", left: 14, right: 14, bottom: 20, height: 34 },
  lip: { position: "absolute", left: 0, right: 0, bottom: 0, height: 30, borderRadius: 15 },
  button: { height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  richGlow: { shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
});
