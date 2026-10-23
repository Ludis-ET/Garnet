/**
 * SETUP-05 · Your time (ADR-0002): IANA zones and the zone database for offsets; daylight
 * saving is detected and explained, never hidden. Times shown here are display only.
 */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import {
  cityForZone,
  hasDaylightSaving,
  localTimeLabel,
  offsetLabel,
  type GemSide,
} from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { AnalogClock } from "../components/AnalogClock";
import { ZoneSheet } from "../components/ZoneSheet";
import { useNow } from "../useNow";

export function TimeStep({
  zone,
  side,
  partnerName,
  partnerZone,
  onZone,
}: {
  zone: string;
  side: GemSide | null;
  partnerName: string;
  partnerZone: string | null;
  onZone: (zone: string) => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const year = now.toZonedDateTimeISO("UTC").year;
  const mine = side === "sapphire" ? palette.sapphire400 : palette.ruby400;
  const theirs = side === "sapphire" ? palette.ruby400 : palette.sapphire400;
  const dst = [zone, partnerZone]
    .filter((z): z is string => z !== null)
    .filter((z, i, all) => all.indexOf(z) === i && hasDaylightSaving(z, year))
    .map((z) =>
      z === "Europe/London"
        ? "London's time changes with UK daylight saving."
        : `${cityForZone(z)}'s clocks change for daylight saving.`,
    );

  return (
    <View style={{ gap: spacing.lg }}>
      <Glass
        radius={radii.xl}
        contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
      >
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Icon name="clock" size={20} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <AppText variant="body" weight="600">
            {cityForZone(zone)}
          </AppText>
          <AppText variant="footnote" color="textSecondary">
            {offsetLabel(zone, now)} · {localTimeLabel(now, zone)}
          </AppText>
        </View>
        <Pressable
          onPress={() => {
            setSheet(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Change city"
          hitSlop={8}
          style={[styles.change, { backgroundColor: colors.accentSoft }]}
        >
          <AppText variant="callout" weight="600" color="accent">
            Change
          </AppText>
        </Pressable>
      </Glass>

      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.row}>
          <AnalogClock zone={zone} now={now} color={mine} label="You" />
          {partnerZone === null ? null : (
            <AnalogClock zone={partnerZone} now={now} color={theirs} label={partnerName} />
          )}
        </View>
      </Glass>

      {dst.map((line) => (
        <View key={line} style={[styles.row, { gap: spacing.xs }]}>
          <Icon name="info" size={15} color={colors.textTertiary} />
          <AppText variant="footnote" color="textTertiary" style={styles.flex}>
            {line}
          </AppText>
        </View>
      ))}

      <ZoneSheet
        visible={sheet}
        selected={zone}
        now={now}
        onClose={() => {
          setSheet(false);
        }}
        onSelect={(z) => {
          onZone(z);
          setSheet(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  change: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
