import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { monthGrid, monthLabel } from "@/domain/days";
import { memoryDateLabel } from "@/domain/memories";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * A glass month to pick a date from (EVT-03, MEM-04). Today has a ring; the chosen day fills
 * with the accent and a bolder number (never colour alone). Year steps for birthdays.
 */
export function DatePickerSheet({
  value,
  today,
  title,
  onPick,
  onClose,
}: {
  value: Temporal.PlainDate;
  today: Temporal.PlainDate;
  title: string;
  onPick: (date: Temporal.PlainDate) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const [month, setMonth] = useState(() => value.toPlainYearMonth());
  const [chosen, setChosen] = useState(value);
  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      footer={
        <Button
          label={memoryDateLabel(chosen)}
          onPress={() => {
            onPick(chosen);
          }}
        />
      }
    >
      <View style={styles.row}>
        <IconButton
          icon="chevron-left"
          label="Previous year"
          onPress={() => {
            setMonth((m) => m.subtract({ years: 1 }));
          }}
        />
        <IconButton
          icon="chevron-left"
          label="Previous month"
          onPress={() => {
            setMonth((m) => m.subtract({ months: 1 }));
          }}
        />
        <AppText variant="headline" style={styles.flexCenter} accessibilityRole="header">
          {monthLabel(month.year, month.month)}
        </AppText>
        <IconButton
          icon="chevron-right"
          label="Next month"
          onPress={() => {
            setMonth((m) => m.add({ months: 1 }));
          }}
        />
        <IconButton
          icon="chevron-right"
          label="Next year"
          onPress={() => {
            setMonth((m) => m.add({ years: 1 }));
          }}
        />
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="caption" color="textTertiary" style={styles.flexCenter}>
            {d}
          </AppText>
        ))}
      </View>
      <Animated.View key={month.toString()} entering={ENTER} style={{ gap: spacing.xxs }}>
        {monthGrid(month.year, month.month).map((week, w) => (
          <View key={w} style={styles.row}>
            {week.map((d, i) => {
              if (d === null) return <View key={i} style={styles.cell} />;
              const on = d.equals(chosen);
              const isToday = d.equals(today);
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    setChosen(d);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={memoryDateLabel(d)}
                  style={[
                    styles.cell,
                    {
                      borderRadius: radii.md,
                      borderWidth: isToday && !on ? 1.5 : 0,
                      borderColor: colors.accent,
                      backgroundColor: on ? colors.accent : "transparent",
                    },
                  ]}
                >
                  <AppText
                    variant="callout"
                    weight={on ? "600" : "400"}
                    color={on ? "onAccent" : "textPrimary"}
                  >
                    {d.day}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flexCenter: { flex: 1, textAlign: "center" },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
});
