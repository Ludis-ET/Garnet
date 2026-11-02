import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Segmented } from "@/components/ui/Segmented";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useHomeToday } from "@/features/home/useHome";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsSection } from "../components/SettingsList";
import { GREETING, widgetLook } from "@/widgets/look";
import type { DayPart } from "@/widgets/snapshot";
import { DARK, LIGHT, SimpleWidgets, WidgetFrame, type Look, type Size } from "./Gallery";

type Part = DayPart;

/**
 * The character widgets (widgets plan W1 to W8, P-72): one large Garnet, Ruby or Sapphire as the
 * whole widget, Duolingo-style, in a look that follows the time of day and special days. Never a
 * streak, a count of signals or a sad face, and never content (§5). Previews only.
 */
function CharacterWidgets({
  platform,
  scheme,
}: {
  platform: "ios" | "android";
  scheme: "light" | "dark";
}) {
  const toast = useToast();
  const { spacing } = useTheme();
  const people = useHomeToday().data;
  const partner = people?.partner.name ?? "Noah";
  const mySide = people?.me.side ?? "ruby";
  const theirSide = people?.partner.side ?? "sapphire";
  const [part, setPart] = useState<Part>("evening");
  const [special, setSpecial] = useState(false);
  const [somethingNew, setSomethingNew] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [materialYou, setMaterialYou] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const android = platform === "android";
  const base = scheme === "dark" || part === "night" ? DARK : LIGHT;
  const sideTint = mySide === "sapphire" ? palette.sapphire400 : palette.ruby400;
  // Material You: Android tints the widget with the wallpaper; the person's gem stands in here.
  const look: Look =
    android && materialYou
      ? {
          ...base,
          bg: scheme === "dark" ? ["#2A1F33", "#1A1422"] : [`${sideTint}33`, "#FFF7FA"],
        }
      : base;
  const frame = (size: Size) => ({ size, look, android, stale: false });
  const char = widgetLook(part, special, somethingNew, false);
  const ink = { color: look.ink };
  const soft = { color: look.soft };
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <View style={[styles.toggleRow, { padding: spacing.md }]}>
      <AppText variant="callout" style={styles.flex}>
        {label}
      </AppText>
      <Toggle value={value} onValueChange={set} accessibilityLabel={label} />
    </View>
  );
  const heading = (t: string) => (
    <AppText variant="caption" weight="600" color="textSecondary" style={styles.heading}>
      {t}
    </AppText>
  );
  return (
    <>
      <Segmented
        label="Time of day"
        options={[
          { label: "Morning", value: "morning" },
          { label: "Day", value: "day" },
          { label: "Evening", value: "evening" },
          { label: "Night", value: "night" },
        ]}
        value={part}
        onChange={setPart}
      />
      <SettingsSection footer="The character changes with your day. It never looks sad and never counts anything about the two of you.">
        {toggle("A special day", special, setSpecial)}
        {toggle("Something new arrived", somethingNew, setSomethingNew)}
        {toggle("A letter or surprise is waiting", waiting, setWaiting)}
        {android ? toggle("Material You colours", materialYou, setMaterialYou) : null}
      </SettingsSection>

      <View style={[styles.wall, { gap: spacing.md }]}>
        {heading("W1 · GARNET TODAY")}
        <View style={[styles.row, { gap: spacing.md }]}>
          <WidgetFrame {...frame("small")} label={`Garnet, ${GREETING[part]}`}>
            <View style={styles.charFill}>
              <CharacterSlot character="garnet" look={char} size={118} aspectRatio={FRAME_ASPECT} />
            </View>
            <AppText variant="caption" weight="600" style={ink}>
              {GREETING[part]}
            </AppText>
          </WidgetFrame>
          <WidgetFrame {...frame("small")} label="Garnet, large picture">
            <View style={styles.charFill}>
              <CharacterSlot character="garnet" look={char} size={150} aspectRatio={FRAME_ASPECT} />
            </View>
          </WidgetFrame>
        </View>
        <WidgetFrame {...frame("medium")} label={`Garnet, ${GREETING[part]}, medium`}>
          <View style={[styles.row, styles.flex, { gap: 12 }]}>
            <View style={styles.charSide}>
              <CharacterSlot character="garnet" look={char} size={150} aspectRatio={FRAME_ASPECT} />
            </View>
            <View style={[styles.flex, { gap: 4 }]}>
              <AppText variant="title" serif style={ink}>
                {GREETING[part]}
              </AppText>
              <AppText variant="footnote" style={soft}>
                {special ? "A day that matters to you both 🎉" : "Garnet is with you both"}
              </AppText>
            </View>
          </View>
        </WidgetFrame>

        {heading("W2 · TWO CLOCKS")}
        <WidgetFrame {...frame("medium")} label="Two clocks, both awake for about 3 hours">
          <View style={[styles.row, styles.between, styles.flex]}>
            <View style={styles.centerCol}>
              <CharacterSlot character={mySide} look={char} size={96} aspectRatio={FRAME_ASPECT} />
              <AppText variant="headline" style={ink}>
                20:46
              </AppText>
              <AppText variant="caption" style={soft}>
                You
              </AppText>
            </View>
            <View style={[styles.pill, { backgroundColor: look.pane }]}>
              <AppText variant="caption" weight="600" style={ink}>
                Both awake · ~3 h
              </AppText>
            </View>
            <View style={styles.centerCol}>
              <CharacterSlot
                character={theirSide}
                look={widgetLook(part === "night" ? "evening" : part, special, false, false)}
                size={96}
                aspectRatio={FRAME_ASPECT}
              />
              <AppText variant="headline" style={ink}>
                17:46
              </AppText>
              <AppText variant="caption" style={soft}>
                {partner}
              </AppText>
            </View>
          </View>
        </WidgetFrame>

        {heading("W3 · THINKING OF YOU   ·   W4 · SOMETHING WAITING")}
        <View style={[styles.row, { gap: spacing.md }]}>
          <WidgetFrame {...frame("small")} label="Thinking of you">
            <View style={styles.charFill}>
              <CharacterSlot
                character={mySide}
                look={{ mood: "loving", occasion: "everyday" }}
                size={100}
                aspectRatio={FRAME_ASPECT}
              />
            </View>
            <Pressable
              onPress={() => {
                setConfirm(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Thinking of you"
              style={[styles.action, { backgroundColor: sideTint }]}
            >
              <AppText variant="caption" weight="600" style={styles.white}>
                💭 Thinking of you
              </AppText>
            </Pressable>
          </WidgetFrame>
          <WidgetFrame
            {...frame("small")}
            label={waiting ? "Something waiting for you" : "All caught up"}
          >
            <View style={styles.charFill}>
              <CharacterSlot
                character="garnet"
                look={
                  waiting
                    ? { mood: "surprised", occasion: "surprise" }
                    : widgetLook(part, false, false, false)
                }
                size={100}
                aspectRatio={FRAME_ASPECT}
              />
              {waiting ? <AppText style={styles.floatEmoji}>💌</AppText> : null}
            </View>
            <AppText variant="caption" weight="600" style={ink}>
              {waiting ? "Something's waiting" : "All caught up"}
            </AppText>
          </WidgetFrame>
        </View>

        {heading("W5 · COMING UP   ·   W6 · FAR APART")}
        <View style={[styles.row, { gap: spacing.md }]}>
          <WidgetFrame {...frame("small")} label="Something special in 5 days">
            <AppText variant="largeTitle" accessible={false}>
              🎂
            </AppText>
            <View style={styles.flex} />
            <AppText variant="headline" style={ink}>
              In 5 days
            </AppText>
            <AppText variant="caption" style={soft}>
              Something special
            </AppText>
          </WidgetFrame>
          <WidgetFrame {...frame("small")} label="About 5,900 kilometres apart">
            <View style={[styles.row, styles.between]}>
              <View style={[styles.gem, { backgroundColor: palette.ruby400 }]} />
              <AppText variant="title" accessible={false}>
                ✈️
              </AppText>
              <View style={[styles.gem, { backgroundColor: palette.sapphire400 }]} />
            </View>
            <View style={styles.flex} />
            <AppText variant="headline" style={ink}>
              ≈ 5,900 km
            </AppText>
            <AppText variant="caption" style={soft}>
              Close at heart
            </AppText>
          </WidgetFrame>
        </View>

        {heading(android ? "W7 · LOCK SCREEN (IPHONE ONLY)" : "W7 · LOCK SCREEN")}
        <View style={[styles.lockScreen, { gap: spacing.md }]}>
          <LinearGradient colors={["#2B1A4A", "#1B2D6B"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.row, { gap: spacing.md }]}>
            <View
              accessible
              accessibilityLabel="Circular lock-screen widget"
              style={styles.circular}
            >
              <GarnetMark size={34} animated={false} />
              {somethingNew ? <View style={styles.newDot} /> : null}
            </View>
            <View
              accessible
              accessibilityLabel="Rectangular lock-screen widget"
              style={styles.rect}
            >
              <AppText variant="footnote" weight="600" style={styles.white}>
                💜 {somethingNew ? "Something new for you" : "Garnet"}
              </AppText>
              <AppText variant="caption" style={styles.whiteSoft}>
                {GREETING[part]}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" style={styles.whiteSoft}>
            Garnet · {GREETING[part]}
          </AppText>
        </View>

        {heading(android ? "W8 · STANDBY (IPHONE ONLY)" : "W8 · STANDBY AT NIGHT")}
        <View
          accessible
          accessibilityLabel="StandBy at night: Garnet asleep"
          style={styles.standby}
        >
          <CharacterSlot
            character="garnet"
            look={{ mood: "sleepy", occasion: "goodnight" }}
            size={150}
            aspectRatio={FRAME_ASPECT}
          />
          <AppText style={styles.standbyTime}>23:41</AppText>
        </View>
      </View>
      <ActionSheet
        visible={confirm}
        title="Send 'I thought of you'?"
        body={`To ${partner}. From a widget, Garnet always asks first. (Simulated: nothing is sent.)`}
        icon="send"
        confirmLabel="Send"
        onCancel={() => {
          setConfirm(false);
        }}
        onConfirm={() => {
          setConfirm(false);
          toast.show("Prototype: nothing was sent.");
        }}
      />
    </>
  );
}

/**
 * WIDGET-01 to WIDGET-07 and the widgets plan (docs/design/widgets-plan.md; P-70, P-72): the
 * character widgets (Duolingo-style, guardrailed) and the simple set, on iPhone or Android,
 * light or dark. Previews only.
 */
export function WidgetGalleryPage() {
  const [style, setStyle] = useState<"character" | "simple">("character");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  return (
    <SettingsPage title="Widget gallery" intro="How Garnet's widgets would look. Previews only.">
      <SimulatedBadge text="Simulated — not a real widget" />
      <Segmented
        label="Widget style"
        options={[
          { label: "Character", value: "character" },
          { label: "Simple", value: "simple" },
        ]}
        value={style}
        onChange={setStyle}
      />
      {style === "character" ? (
        <>
          <Segmented
            label="Platform"
            options={[
              { label: "iPhone", value: "ios" },
              { label: "Android", value: "android" },
            ]}
            value={platform}
            onChange={setPlatform}
          />
          <Segmented
            label="Widget scheme"
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]}
            value={scheme}
            onChange={setScheme}
          />
          <CharacterWidgets platform={platform} scheme={scheme} />
        </>
      ) : (
        <SimpleWidgets />
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  between: { justifyContent: "space-between" },
  wall: { alignItems: "center" },
  heading: { alignSelf: "flex-start", marginTop: 6 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  charFill: { flex: 1, alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  charSide: { height: "100%", justifyContent: "flex-end", overflow: "hidden" },
  centerCol: { alignItems: "center" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.8)" },
  floatEmoji: { position: "absolute", top: 4, right: 6, fontSize: 26 },
  gem: { width: 16, height: 16, borderRadius: 4, transform: [{ rotate: "45deg" }] },
  action: { alignItems: "center", paddingVertical: 8, borderRadius: 14 },
  lockScreen: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    padding: 18,
    alignItems: "center",
  },
  circular: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  newDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  rect: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  standby: {
    width: "100%",
    height: 190,
    borderRadius: 24,
    backgroundColor: "#0A0508",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    overflow: "hidden",
    opacity: 0.85,
  },
  standbyTime: { color: "#B3364B", fontSize: 64, fontWeight: "200", marginBottom: 40 },
});
