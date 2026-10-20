/**
 * Figure Studio: the temporary home page (owner directions P-41, P-43) for exploring the 2D figures
 * by page scene, cast, mood and occasion until the owner's HOME-01 design exists (B-04).
 */
import * as Haptics from "expo-haptics";
import { type ReactNode, useReducer } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Chip } from "@/components/ui/Chip";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";
import { FigureStage } from "./FigureStage";
import { moods } from "./moods";
import { occasions } from "./occasions";
import { scenes } from "./scenes";
import { SpeechBubble } from "./SpeechBubble";
import { speakerAnchor } from "./stageLayout";
import { initialStudioState, studioReducer, type StudioAction } from "./studioState";
import { castMembers, CASTS, figureNames, MOODS, OCCASIONS, type Cast } from "./types";

const castLabels: Record<Cast, string> = {
  trio: "All three",
  duo: "Ruby & Sapphire",
  ruby: "Ruby",
  sapphire: "Sapphire",
  garnet: "Garnet",
};

function describe(cast: Cast, moodLabel: string, occasionLabel: string): string {
  const names = castMembers(cast).map((id) => figureNames[id]);
  const who =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`
      : (names[0] ?? "");
  return `${who}, ${moodLabel.toLowerCase()}, in a ${occasionLabel.toLowerCase()} scene.`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl }}>
      <AppText
        variant="headline"
        style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ChipRow({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  const { spacing } = useTheme();
  if (wrap) {
    return (
      <View
        accessibilityRole="radiogroup"
        style={[styles.wrapRow, { gap: spacing.sm, paddingHorizontal: spacing.lg }]}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
    >
      {children}
    </ScrollView>
  );
}

export function FigureStudio({
  params = {},
}: {
  params?: Partial<Record<string, string | string[]>>;
}) {
  const theme = useTheme();
  const { colors, spacing, radii, reduceMotion } = theme;
  const [state, dispatch] = useReducer(studioReducer, params, initialStudioState);
  const { height } = useWindowDimensions();
  const stageHeight = Math.round(Math.min(520, Math.max(320, height * 0.52)));

  const act = (action: StudioAction) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    dispatch(action);
  };

  const sharedMood = moods[state.moods[state.speaker]];
  const occasion = occasions[state.occasion];
  const canFuse = state.cast === "duo";
  const canUnfuse = state.cast === "garnet";

  return (
    <Screen edges={["top"]} contentStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View>
          <AppText variant="title">Garnet</AppText>
          <AppText variant="footnote" color="textSecondary">
            Two lives. One space.
          </AppText>
        </View>
        <View
          style={[
            styles.badge,
            { borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md },
          ]}
        >
          <AppText variant="caption" color="textSecondary">
            Figure studio · prototype
          </AppText>
        </View>
      </View>

      <View
        style={[
          styles.stageCard,
          {
            height: stageHeight,
            marginHorizontal: spacing.lg,
            borderRadius: radii.xl,
            borderColor: colors.border,
          },
        ]}
      >
        <LinearGradient colors={occasion.sky} style={StyleSheet.absoluteFill} />
        <FigureStage
          cast={state.cast}
          moods={state.moods}
          occasion={state.occasion}
          speaker={state.speaker}
          talkKey={state.bubble ? state.lineKey : null}
          fusion={state.fusion}
          reduceMotion={reduceMotion}
          accessibilityLabel={describe(state.cast, sharedMood.label, occasion.label)}
        />
        {state.bubble ? (
          <SpeechBubble
            speakerName={figureNames[state.speaker]}
            line={state.line}
            anchor={speakerAnchor(state.cast, state.speaker)}
            lineKey={state.lineKey}
          />
        ) : null}
        {canFuse || canUnfuse ? (
          <Pressable
            onPress={() => {
              act({ type: canFuse ? "fuse" : "unfuse" });
            }}
            accessibilityRole="button"
            accessibilityLabel={
              canFuse
                ? "Fuse Ruby and Sapphire into Garnet"
                : "Unfuse Garnet into Ruby and Sapphire"
            }
            style={({ pressed }) => [
              styles.fuse,
              {
                borderRadius: radii.pill,
                bottom: spacing.lg,
                right: spacing.lg,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={theme.gradients.together}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.fuseFill, { borderRadius: radii.pill, paddingHorizontal: spacing.lg }]}
            >
              <AppText variant="callout" color="onAccent" style={styles.bold}>
                {canFuse ? "✦ Fuse" : "✦ Unfuse"}
              </AppText>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.hero }}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Page scenes">
          <ChipRow>
            {scenes.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                leading={occasions[s.occasion].emoji}
                selected={state.sceneId === s.id}
                onPress={() => {
                  act({ type: "scene", id: s.id });
                }}
                accessibilityHint={`Scene for ${s.pages.join(", ")}`}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Who">
          <ChipRow>
            {CASTS.map((c) => (
              <Chip
                key={c}
                label={castLabels[c]}
                selected={state.cast === c}
                onPress={() => {
                  act({ type: "cast", cast: c });
                }}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Mood">
          <ChipRow wrap>
            {MOODS.map((m) => (
              <Chip
                key={m}
                label={moods[m].label}
                leading={moods[m].emoji}
                selected={castMembers(state.cast).every((id) => state.moods[id] === m)}
                onPress={() => {
                  act({ type: "mood", mood: m });
                }}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Occasion">
          <ChipRow wrap>
            {OCCASIONS.map((o) => (
              <Chip
                key={o}
                label={occasions[o].label}
                leading={occasions[o].emoji}
                selected={state.occasion === o}
                onPress={() => {
                  act({ type: "occasion", occasion: o });
                }}
              />
            ))}
          </ChipRow>
        </Section>

        <View
          style={[
            styles.toggleRow,
            {
              marginTop: spacing.xl,
              marginHorizontal: spacing.lg,
              borderRadius: radii.lg,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <AppText variant="body" style={styles.flex} nativeID="bubble-label">
            Speech bubble
          </AppText>
          <Pressable
            onPress={() => {
              act({ type: "replay" });
            }}
            disabled={!state.bubble}
            accessibilityRole="button"
            accessibilityLabel="Replay line"
            accessibilityState={{ disabled: !state.bubble }}
            style={[
              styles.replay,
              { paddingHorizontal: spacing.md, opacity: state.bubble ? 1 : 0.4 },
            ]}
          >
            <AppText variant="callout" color="accent">
              Replay
            </AppText>
          </Pressable>
          <Switch
            value={state.bubble}
            onValueChange={(on) => {
              act({ type: "bubble", on });
            }}
            accessibilityLabel="Speech bubble"
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>

        <AppText
          variant="footnote"
          color="textTertiary"
          style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}
        >
          Prototype illustrations for internal design work, drawn in code. Character rights are not
          cleared yet (U-10). Tap the stage to make them hop.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  stageCard: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  fuse: { position: "absolute", minHeight: touchTarget },
  fuseFill: { minHeight: touchTarget, justifyContent: "center" },
  bold: { fontWeight: "700" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap" },
  toggleRow: { flexDirection: "row", alignItems: "center", minHeight: 56, paddingHorizontal: 16 },
  flex: { flex: 1 },
  replay: { minHeight: touchTarget, justifyContent: "center" },
});
