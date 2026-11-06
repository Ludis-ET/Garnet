import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Sheet } from "@/components/ui/Sheet";
import { localTimeLabel } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";

export interface TimePickerSheetProps {
  visible: boolean;
  value?: string | undefined;
  zone: string;
  onSelect: (iso: string | undefined) => void;
  onClose: () => void;
}

/**
 * U-11 / P-81 · Optional timestamp for moments.
 * Authors can leave the moment timestamp as "Now" or choose an earlier time today.
 */
export function TimePickerSheet({ visible, value, zone, onSelect, onClose }: TimePickerSheetProps) {
  const { radii, spacing } = useTheme();
  const [selected, setSelected] = useState<string | undefined>(value);

  const now = Temporal.Now.instant();
  const currentInstant = selected ? Temporal.Instant.from(selected) : now;

  const displayTime = selected ? localTimeLabel(currentInstant, zone) : "Now";

  const adjustMinutes = (deltaMinutes: number) => {
    const base = selected ? Temporal.Instant.from(selected) : Temporal.Now.instant();
    const updated = base.add({ minutes: deltaMinutes });
    // Don't allow times past now + 1 minute
    if (Temporal.Instant.compare(updated, Temporal.Now.instant().add({ minutes: 1 })) > 0) {
      setSelected(undefined);
      onSelect(undefined);
      return;
    }
    const iso = updated.toString();
    setSelected(iso);
    onSelect(iso);
  };

  const setPresetAgo = (minutesAgo: number) => {
    if (minutesAgo === 0) {
      setSelected(undefined);
      onSelect(undefined);
    } else {
      const instant = Temporal.Now.instant().subtract({ minutes: minutesAgo });
      const iso = instant.toString();
      setSelected(iso);
      onSelect(iso);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="When did this happen?"
      footer={<Button label="Done" onPress={onClose} />}
    >
      <View style={[styles.container, { gap: spacing.lg }]}>
        <Glass radius={radii.xl} contentStyle={[styles.displayCard, { gap: spacing.xs }]}>
          <AppText variant="caption" color="textSecondary">
            {selected ? `Recorded for ${displayTime}` : "Recorded for right now"}
          </AppText>
          <AppText variant="display" weight="600" color="accent">
            {displayTime}
          </AppText>
        </Glass>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption" weight="600" color="textTertiary">
            Quick choices
          </AppText>
          <View style={[styles.presetsRow, { gap: spacing.sm }]}>
            <PresetChip
              label="Now"
              selected={selected === undefined}
              onPress={() => {
                setPresetAgo(0);
              }}
            />
            <PresetChip
              label="15m ago"
              selected={false}
              onPress={() => {
                setPresetAgo(15);
              }}
            />
            <PresetChip
              label="30m ago"
              selected={false}
              onPress={() => {
                setPresetAgo(30);
              }}
            />
            <PresetChip
              label="1h ago"
              selected={false}
              onPress={() => {
                setPresetAgo(60);
              }}
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption" weight="600" color="textTertiary">
            Adjust time
          </AppText>
          <View style={[styles.stepperRow, { gap: spacing.sm }]}>
            <StepButton
              label="−1h"
              onPress={() => {
                adjustMinutes(-60);
              }}
              accessibilityLabel="One hour earlier"
            />
            <StepButton
              label="−15m"
              onPress={() => {
                adjustMinutes(-15);
              }}
              accessibilityLabel="15 minutes earlier"
            />
            <StepButton
              label="+15m"
              onPress={() => {
                adjustMinutes(15);
              }}
              accessibilityLabel="15 minutes later"
            />
            <StepButton
              label="+1h"
              onPress={() => {
                adjustMinutes(60);
              }}
              accessibilityLabel="One hour later"
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}

function PresetChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.presetChip,
        {
          borderRadius: radii.md,
          backgroundColor: selected ? colors.accentSoft : colors.glassVeilSoft,
          borderColor: selected ? colors.accent : colors.glassRimEnd,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.sm,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <AppText
        variant="callout"
        weight={selected ? "600" : "500"}
        color={selected ? "accent" : "textPrimary"}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function StepButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.stepButton,
        {
          borderRadius: radii.md,
          backgroundColor: colors.glassVeilSoft,
          borderColor: colors.glassRimEnd,
          paddingVertical: spacing.sm,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <AppText variant="callout" weight="600" color="textPrimary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  displayCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  presetChip: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepButton: {
    flex: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
