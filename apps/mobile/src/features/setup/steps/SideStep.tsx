/**
 * SETUP-03 · Choose your side (P-51, owner direction for U-22): each partner picks Ruby or
 * Sapphire and the two can never match. A side the partner holds is locked; the repository is
 * the authority if both choose at once.
 */
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { isSideAvailable, type GemSide } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { SideCard } from "../components/SideCard";

export function SideStep({
  pick,
  partnerName,
  partnerSide,
  onPick,
}: {
  pick: GemSide | null;
  partnerName: string;
  partnerSide: GemSide | null;
  onPick: (side: GemSide) => void;
}) {
  const { spacing } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((Math.min(width, 440) - spacing.gutter * 2 - spacing.md) / 2);
  const state = (side: GemSide) =>
    !isSideAvailable(side, partnerSide)
      ? ("taken" as const)
      : pick === null
        ? ("idle" as const)
        : pick === side
          ? ("selected" as const)
          : ("receded" as const);
  return (
    <View style={{ gap: spacing.lg }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Your side"
        style={[styles.row, { gap: spacing.md }]}
      >
        {(["ruby", "sapphire"] as const).map((side) => (
          <SideCard
            key={side}
            side={side}
            state={state(side)}
            partnerName={partnerName}
            width={cardWidth}
            onPress={() => {
              onPick(side);
            }}
          />
        ))}
      </View>
      <AppText variant="footnote" color="textSecondary" style={styles.center}>
        Together you're Garnet 💜
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center" },
  center: { textAlign: "center" },
});
