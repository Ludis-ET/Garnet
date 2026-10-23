import { StyleSheet, View } from "react-native";
import { SideCharacter } from "@/components/character/SideCharacter";
import type { Pose } from "@/components/character/characterAssets";
import { AppText } from "@/components/ui/AppText";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useTheme } from "@/theme/ThemeProvider";

/** A tab whose pages aren't designed yet (gate B-04): its name and one quiet line. */
export function ComingSoonScreen({
  title,
  pose,
  shared,
}: {
  title: string;
  pose: Pose;
  /** Pages for both partners show Garnet; personal ones the viewer's own gem (P-55). */
  shared: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <GlassScreen tabBar>
      <View style={[styles.fill, { gap: spacing.md }]}>
        <SideCharacter pose={pose} size={220} shared={shared} />
        <AppText variant="largeTitle">{title}</AppText>
        <AppText variant="body" color="textSecondary">
          Designed next.
        </AppText>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
