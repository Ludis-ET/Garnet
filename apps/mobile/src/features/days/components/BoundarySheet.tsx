import { sharedDayWindowIn } from "@garnet/domain";
import { StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import type { HomePerson } from "@/data/repositories/types";
import { PROVISIONAL_DAY_POLICY } from "@/domain/days";
import { cityForZone } from "@/domain/identity";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";

const hhmm = (t: Temporal.ZonedDateTime) =>
  `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;

/**
 * DAYS-10 · When does a day end? One shared day on both clocks, worked out for this date from
 * the zone database (so the summer hour shows on its own). The cutoff is PROVISIONAL (U-02) and
 * labelled so.
 */
export function BoundarySheet({
  visible,
  onClose,
  date,
  people,
}: {
  visible: boolean;
  onClose: () => void;
  /** The shared day to explain (ISO). */
  date: string;
  people: readonly HomePerson[];
}) {
  const { colors, radii, spacing } = useTheme();
  const day = Temporal.PlainDate.from(date);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="When does a day end?"
      footer={<Button label="Got it" variant="secondary" onPress={onClose} />}
    >
      {people.map((p) => {
        const w = sharedDayWindowIn(day, PROVISIONAL_DAY_POLICY.sharedDay, p.zone);
        return (
          <Glass
            key={p.zone + p.name}
            radius={radii.lg}
            shadow={false}
            contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
          >
            <View style={[styles.dot, { backgroundColor: sideColor(p.side) }]} />
            <View style={styles.flex}>
              <AppText variant="callout" weight="600">
                {cityForZone(p.zone)}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {p.name}
              </AppText>
            </View>
            <AppText variant="headline">{hhmm(w.start)}</AppText>
            <Icon name="arrow-right" size={16} color={colors.textTertiary} />
            <AppText variant="headline">{hhmm(w.end)}</AppText>
          </Glass>
        );
      })}
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Icon name="info" size={16} color={colors.textSecondary} />
        <AppText variant="footnote" color="textSecondary" style={styles.flex}>
          Provisional: the exact time hasn't been decided yet.
        </AppText>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
