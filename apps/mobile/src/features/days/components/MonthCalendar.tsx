import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import type { DaySummary } from "@/data/repositories/types";
import { dayLabel, monthGrid, monthLabel } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * DAYS-01 calendar: a month in glass, Monday first. Days with moments carry two small dots in
 * fixed order (you, then your partner) with a legend and a spoken label, so the dots are never
 * colour-only. Today has a ring.
 */
export function MonthCalendar({
  today,
  days,
  meName,
  partnerName,
  meColor,
  partnerColor,
  onOpen,
}: {
  today: string;
  days: readonly DaySummary[];
  meName: string;
  partnerName: string;
  meColor: string;
  partnerColor: string;
  onOpen: (date: string) => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const t = Temporal.PlainDate.from(today);
  const [month, setMonth] = useState(() => t.toPlainYearMonth());
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weeks = monthGrid(month.year, month.month);
  const shift = (n: number) => {
    setMonth((m) => m.add({ months: n }));
  };
  return (
    <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            shift(-1);
          }}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={10}
          style={styles.nav}
        >
          <Icon name="chevron-left" size={20} color={colors.textSecondary} />
        </Pressable>
        <AppText variant="headline" style={styles.flexCenter} accessibilityRole="header">
          {monthLabel(month.year, month.month)}
        </AppText>
        <Pressable
          onPress={() => {
            shift(1);
          }}
          disabled={Temporal.PlainYearMonth.compare(month, t.toPlainYearMonth()) >= 0}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={10}
          style={[
            styles.nav,
            {
              opacity: Temporal.PlainYearMonth.compare(month, t.toPlainYearMonth()) >= 0 ? 0.3 : 1,
            },
          ]}
        >
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="caption" color="textTertiary" style={styles.cellText}>
            {d}
          </AppText>
        ))}
      </View>
      <Animated.View key={month.toString()} entering={FadeIn.duration(220)} style={{ gap: 4 }}>
        {weeks.map((week, w) => (
          <View key={w} style={styles.row}>
            {week.map((d, i) => {
              if (d === null) return <View key={i} style={styles.cell} />;
              const s = byDate.get(d.toString());
              const isToday = d.equals(t);
              const future = Temporal.PlainDate.compare(d, t) > 0;
              const who = [s?.me === true ? meName : null, s?.partner === true ? partnerName : null]
                .filter((x) => x !== null)
                .join(" and ");
              return (
                <Pressable
                  key={i}
                  disabled={future}
                  onPress={() => {
                    onOpen(d.toString());
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(d)}${isToday ? ", today" : ""}${who.length > 0 ? `, moments from ${who}` : ""}`}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      borderRadius: radii.md,
                      borderWidth: isToday ? 2 : 0,
                      borderColor: colors.accent,
                      backgroundColor: pressed ? colors.accentSoft : "transparent",
                    },
                  ]}
                >
                  <AppText
                    variant="callout"
                    weight={isToday ? "600" : "400"}
                    color={future ? "textTertiary" : "textPrimary"}
                  >
                    {d.day}
                  </AppText>
                  <View style={styles.dots}>
                    {s?.me === true ? (
                      <View style={[styles.dot, { backgroundColor: meColor }]} />
                    ) : null}
                    {s?.partner === true ? (
                      <View style={[styles.dot, { backgroundColor: partnerColor }]} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
      <View style={[styles.legend, { gap: spacing.lg }]}>
        <View style={[styles.row, { gap: spacing.xs }]}>
          <View style={[styles.dot, { backgroundColor: meColor }]} />
          <AppText variant="caption" color="textSecondary">
            {meName}
          </AppText>
        </View>
        <View style={[styles.row, { gap: spacing.xs }]}>
          <View style={[styles.dot, { backgroundColor: partnerColor }]} />
          <AppText variant="caption" color="textSecondary">
            {partnerName}
          </AppText>
        </View>
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  nav: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  flexCenter: { flex: 1, textAlign: "center" },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellText: { flex: 1, textAlign: "center" },
  dots: { flexDirection: "row", gap: 3, height: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: "row", justifyContent: "center" },
});
