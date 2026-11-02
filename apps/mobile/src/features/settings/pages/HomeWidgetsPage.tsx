import { Platform, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/theme/ThemeProvider";
import type { WidgetName } from "@/widgets/GarnetWidgets";
import { pinWidget, widgetsSupported } from "@/widgets/publish";
import { SettingsPage } from "../components/SettingsList";

const WIDGETS: readonly { name: WidgetName; emoji: string; title: string; detail: string }[] = [
  {
    name: "GarnetToday",
    emoji: "💜",
    title: "Garnet today",
    detail: "Garnet, changing with your day",
  },
  {
    name: "TwoClocks",
    emoji: "🕰️",
    title: "Two clocks",
    detail: "Ruby and Sapphire, each in their own time",
  },
  {
    name: "ThinkingOfYou",
    emoji: "💭",
    title: "Thinking of you",
    detail: "One tap, and Garnet asks before sending",
  },
  {
    name: "SomethingWaiting",
    emoji: "💌",
    title: "Something waiting",
    detail: "When a letter or surprise can be opened",
  },
  { name: "ComingUp", emoji: "📅", title: "Coming up", detail: "Days until something special" },
  {
    name: "FarApart",
    emoji: "✈️",
    title: "Far apart",
    detail: "How far apart you are, if distance is on",
  },
];

/**
 * Home-screen widgets (P-73, P-75): the real Android widgets, each with "Add to home screen".
 * They never show your words, names or anything about your partner's activity (§5).
 */
export function HomeWidgetsPage() {
  const { radii, spacing } = useTheme();
  const toast = useToast();
  const supported = widgetsSupported();
  const fallback = "Long-press your home screen, then Widgets › Garnet.";
  return (
    <SettingsPage
      title="Widgets"
      intro="Put Garnet on your home screen. Widgets never show what you write."
    >
      {supported ? null : (
        <Notice
          tone="info"
          icon="info"
          text={
            Platform.OS === "ios"
              ? "Home-screen widgets are coming to iPhone."
              : "Widgets live on your phone's home screen."
          }
        />
      )}
      {WIDGETS.map((w) => (
        <Glass
          key={w.name}
          radius={radii.xl}
          contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
        >
          <AppText variant="title" accessible={false}>
            {w.emoji}
          </AppText>
          <View style={[styles.flex, { gap: 2 }]}>
            <AppText variant="headline">{w.title}</AppText>
            <AppText variant="footnote" color="textSecondary">
              {w.detail}
            </AppText>
          </View>
          {supported ? (
            <Button
              label="Add"
              variant="secondary"
              accessibilityHint={`Adds ${w.title} to your home screen`}
              onPress={() => {
                void pinWidget(w.name).then((shown) => {
                  if (!shown) toast.show(fallback);
                });
              }}
            />
          ) : null}
        </Glass>
      ))}
      {supported ? (
        <AppText variant="footnote" color="textSecondary" style={styles.center}>
          Or: {fallback}
        </AppText>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  center: { textAlign: "center" },
});
