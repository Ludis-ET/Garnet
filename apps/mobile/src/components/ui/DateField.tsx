import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/ThemeProvider";

export interface DateFieldProps {
  /** The question, e.g. "Your birthday". */
  label: string;
  /** YYYY-MM-DD once every part is typed (checked by the caller), or null while incomplete. */
  value: string | null;
  onChange: (iso: string | null) => void;
  helper?: string;
  error?: string;
  /** The phone's autofill knows birthdays: "birthday" offers it. */
  autofill?: "birthday";
  disabled?: boolean;
}

function parts(iso: string | null): { d: string; m: string; y: string } {
  if (iso === null) return { d: "", m: "", y: "" };
  const [y = "", m = "", d = ""] = iso.split("-");
  return { d, m, y };
}

/** Digits only, at most `n`. */
const digits = (text: string, n: number) => text.replace(/\D/g, "").slice(0, n);

/**
 * A calendar date as three liquid-glass fields, day / month / year (the order used in Ethiopia
 * and the UK), with the number pad and the phone's birthday autofill. Typing moves on by itself
 * once a part is complete. Each part is labelled for screen readers; an error sits under the
 * group with an icon (never colour alone). Whether the date is real, and old enough, is the
 * caller's rule (P-79).
 */
export function DateField({
  label,
  value,
  onChange,
  helper,
  error,
  autofill,
  disabled = false,
}: DateFieldProps) {
  const { colors, spacing } = useTheme();
  const [draft, setDraft] = useState(() => parts(value));
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const update = (next: { d: string; m: string; y: string }) => {
    setDraft(next);
    if (next.y.length !== 4 || next.m === "" || next.d === "") {
      onChange(null);
      return;
    }
    onChange(`${next.y}-${next.m.padStart(2, "0")}-${next.d.padStart(2, "0")}`);
  };

  return (
    <View style={{ gap: spacing.xs }} accessibilityRole="none">
      <AppText variant="callout" weight="600" color="textSecondary" accessibilityRole="header">
        {label}
      </AppText>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <View style={styles.short}>
          <TextField
            label="Day"
            placeholder="DD"
            value={draft.d}
            onChangeText={(t) => {
              const d = digits(t, 2);
              update({ ...draft, d });
              if (d.length === 2 || Number(d) > 3) monthRef.current?.focus();
            }}
            keyboardType="number-pad"
            maxLength={2}
            clearable={false}
            disabled={disabled}
            accessibilityLabel={`${label}, day`}
            {...(autofill === "birthday" ? { autoComplete: "birthdate-day" as const } : {})}
            returnKeyType="next"
          />
        </View>
        <View style={styles.short}>
          <TextField
            ref={monthRef}
            label="Month"
            placeholder="MM"
            value={draft.m}
            onChangeText={(t) => {
              const m = digits(t, 2);
              update({ ...draft, m });
              if (m.length === 2 || Number(m) > 1) yearRef.current?.focus();
            }}
            keyboardType="number-pad"
            maxLength={2}
            clearable={false}
            disabled={disabled}
            accessibilityLabel={`${label}, month`}
            {...(autofill === "birthday" ? { autoComplete: "birthdate-month" as const } : {})}
            returnKeyType="next"
          />
        </View>
        <View style={styles.long}>
          <TextField
            ref={yearRef}
            label="Year"
            placeholder="YYYY"
            value={draft.y}
            onChangeText={(t) => {
              update({ ...draft, y: digits(t, 4) });
            }}
            keyboardType="number-pad"
            maxLength={4}
            clearable={false}
            disabled={disabled}
            accessibilityLabel={`${label}, year`}
            {...(autofill === "birthday" ? { autoComplete: "birthdate-year" as const } : {})}
            returnKeyType="done"
          />
        </View>
      </View>
      {error !== undefined ? (
        <View style={[styles.note, { gap: spacing.xs }]} accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} color={colors.danger} />
          <AppText variant="footnote" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        </View>
      ) : helper !== undefined ? (
        <AppText variant="footnote" color="textSecondary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  short: { flex: 1 },
  long: { flex: 1.6 },
  note: { flexDirection: "row", alignItems: "center" },
});
