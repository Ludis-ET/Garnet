import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import type { LegalDocument } from "@/content/legal";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * AUTH-10 · Terms of use and Privacy notice (P-79): plain sentences on glass, one section per
 * pane, with the version the person is agreeing to and its status (drafts, U-36).
 */
export function LegalScreen({ document }: { document: LegalDocument }) {
  const { radii, spacing } = useTheme();
  return (
    <GlassScreen
      onBack={() => {
        goBack("/welcome");
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <AppText variant="largeTitle" accessibilityRole="header">
          {document.title}
        </AppText>
        <AppText variant="footnote" color="textTertiary">
          Version {document.version} · {document.status}
        </AppText>
      </View>
      {document.sections.map((section) => (
        <Glass
          key={section.heading}
          radius={radii.xl}
          contentStyle={{ padding: spacing.lg, gap: spacing.sm }}
        >
          <AppText variant="headline" accessibilityRole="header">
            {section.heading}
          </AppText>
          {section.paragraphs.map((p) => (
            <AppText key={p} variant="callout" color="textSecondary" style={styles.paragraph}>
              {p}
            </AppText>
          ))}
        </Glass>
      ))}
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  paragraph: { lineHeight: 22 },
});
