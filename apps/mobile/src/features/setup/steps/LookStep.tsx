/** SETUP-06 · Your look. Appearance applies to the whole app at once; accent intensity is stored. */
import { View } from "react-native";
import { Segmented } from "@/components/ui/Segmented";
import type { AccentIntensity, Appearance } from "@/data/fixtures/demoProfile";
import type { GemSide } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { LookPreview } from "../components/LookPreview";

export function LookStep({
  side,
  appearance,
  accent,
  onAppearance,
  onAccent,
}: {
  side: GemSide | null;
  appearance: Appearance;
  accent: AccentIntensity;
  onAppearance: (a: Appearance) => void;
  onAccent: (a: AccentIntensity) => void;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xl }}>
      <LookPreview side={side} appearance={appearance} accent={accent} />
      <Segmented
        label="Appearance"
        options={[
          { label: "System", value: "system" },
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ]}
        value={appearance}
        onChange={onAppearance}
      />
      <Segmented
        label="Accent"
        options={[
          { label: "Subtle", value: "subtle" },
          { label: "Rich", value: "rich" },
        ]}
        value={accent}
        onChange={onAccent}
      />
    </View>
  );
}
