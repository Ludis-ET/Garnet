import { useEffect, useRef, useState } from "react";
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
  /** Focus the day field when it appears (a step in a flow where the keyboard is already up). */
  autoFocus?: boolean;
}

function parts(iso: string | null): { d: string; m: string; y: string } {
  if (iso === null) return { d: "", m: "", y: "" };
  const [y = "", m = "", d = ""] = iso.split("-");
  return { d, m, y };
}

/** Digits only, at most `n`. */
const digits = (text: string, n: number) => text.replace(/\D/g, "").slice(0, n);

function tryParseFullDate(text: string): { d: string; m: string; y: string } | null {
  const raw = text.trim();
  if (raw.includes("-") || raw.includes("/")) {
    const partsArr = raw.split(/[-/]/);
    if (partsArr.length === 3) {
      const [p1 = "", p2 = "", p3 = ""] = partsArr;
      if (p1.length === 4) {
        // YYYY-MM-DD
        return { y: digits(p1, 4), m: digits(p2, 2), d: digits(p3, 2) };
      }
      // DD-MM-YYYY
      return { d: digits(p1, 2), m: digits(p2, 2), y: digits(p3, 4) };
    }
  }
  const nums = digits(raw, 8);
  if (nums.length === 8) {
    return { d: nums.slice(0, 2), m: nums.slice(2, 4), y: nums.slice(4, 8) };
  }
  return null;
}

/**
 * A calendar date as three liquid-glass fields, day / month / year (the order used in Ethiopia
 * and the UK), with the number pad and the phone's birthday autofill. Typing moves on smoothly
 * only after 2 digits are typed or via keyboard Next. Each part is labelled for screen readers;
 * an error sits under the group with an icon (never colour alone).
 */
export function DateField({
  label,
  value,
  onChange,
  helper,
  error,
  autofill,
  disabled = false,
  autoFocus = false,
}: DateFieldProps) {
  const { colors, spacing } = useTheme();
  const draftRef = useRef(parts(value));
  const [draft, setDraft] = useState(() => parts(value));
  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Sync draft if value changes externally (e.g. form reset or partner loaded)
  useEffect(() => {
    const cur = draftRef.current;
    const curIso =
      cur.y.length === 4 && cur.m !== "" && cur.d !== ""
        ? `${cur.y}-${cur.m.padStart(2, "0")}-${cur.d.padStart(2, "0")}`
        : null;
    if (value !== curIso) {
      const next = parts(value);
      draftRef.current = next;
      setDraft(next);
    }
  }, [value]);

  // Moving to the next part waits for the key event to finish (production-fix-plan K4): focusing
  // inside onChangeText restarts Android's keyboard mid-keystroke, which made it flicker.
  const moveTo = (target: { current: TextInput | null }) => {
    requestAnimationFrame(() => target.current?.focus());
  };

  const update = (next: { d: string; m: string; y: string }) => {
    draftRef.current = next;
    setDraft(next);
    if (next.y.length !== 4 || next.m === "" || next.d === "") {
      onChange(null);
      return;
    }
    onChange(`${next.y}-${next.m.padStart(2, "0")}-${next.d.padStart(2, "0")}`);
  };

  const handleDayChange = (t: string) => {
    const full = tryParseFullDate(t);
    if (full !== null) {
      update(full);
      moveTo(yearRef);
      return;
    }
    const d = digits(t, 2);
    const prevLen = draftRef.current.d.length;
    update({ ...draftRef.current, d });
    // Advance to month ONLY when the user typed the 2nd digit and month is empty
    if (prevLen < 2 && d.length === 2 && draftRef.current.m === "") {
      moveTo(monthRef);
    }
  };

  const handleMonthChange = (t: string) => {
    const m = digits(t, 2);
    const prevLen = draftRef.current.m.length;
    update({ ...draftRef.current, m });
    // Advance to year ONLY when the user typed the 2nd digit and year is empty
    if (prevLen < 2 && m.length === 2 && draftRef.current.y === "") {
      moveTo(yearRef);
    }
  };

  const handleYearChange = (t: string) => {
    const y = digits(t, 4);
    update({ ...draftRef.current, y });
  };

  return (
    <View style={{ gap: spacing.xs }} accessibilityRole="none">
      <AppText variant="callout" weight="600" color="textSecondary" accessibilityRole="header">
        {label}
      </AppText>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <View style={styles.short}>
          <TextField
            ref={dayRef}
            label="Day"
            placeholder="DD"
            value={draft.d}
            onChangeText={handleDayChange}
            keyboardType="number-pad"
            maxLength={2}
            clearable={false}
            disabled={disabled}
            accessibilityLabel={`${label}, day`}
            autoFocus={autoFocus}
            {...(autofill === "birthday" ? { autoComplete: "birthdate-day" as const } : {})}
            returnKeyType="next"
            onSubmitEditing={() => monthRef.current?.focus()}
            submitBehavior="submit"
          />
        </View>
        <View style={styles.short}>
          <TextField
            ref={monthRef}
            label="Month"
            placeholder="MM"
            value={draft.m}
            onChangeText={handleMonthChange}
            keyboardType="number-pad"
            maxLength={2}
            clearable={false}
            disabled={disabled}
            accessibilityLabel={`${label}, month`}
            {...(autofill === "birthday" ? { autoComplete: "birthdate-month" as const } : {})}
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
            submitBehavior="submit"
          />
        </View>
        <View style={styles.long}>
          <TextField
            ref={yearRef}
            label="Year"
            placeholder="YYYY"
            value={draft.y}
            onChangeText={handleYearChange}
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
