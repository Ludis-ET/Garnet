import { useState, type Ref } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { useShake } from "@/components/ui/motion";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

export interface TextFieldProps extends Omit<
  TextInputProps,
  "style" | "placeholderTextColor" | "secureTextEntry" | "editable"
> {
  label: string;
  /** Plain helper line under the field (hidden while an error shows). */
  helper?: string;
  /** Error message; marks the field invalid and is announced. Input is never cleared. */
  error?: string;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
  disabled?: boolean;
  /**
   * "field" (default): its own glass pane with the label above.
   * "row": a row inside a FieldGroup (iOS inset group), with the label inside the row.
   */
  appearance?: "field" | "row";
  /** Larger input text for one-question steps. */
  large?: boolean;
  /** A multi-line field this many lines tall (it still grows with its text). */
  rows?: number;
  ref?: Ref<TextInput>;
}

/**
 * Labelled text field in Daylight Glass (P-48). The label is always visible (never
 * placeholder-only); focus shows a violet hairline and a soft halo; an error turns the hairline
 * ruby-red, sits under its own field with an icon (never colour alone), is announced, and shakes
 * the field once (not under reduced motion). Password fields can be revealed.
 */
export function TextField({
  label,
  helper,
  error,
  secure = false,
  disabled = false,
  appearance = "field",
  large = false,
  rows,
  ref,
  ...input
}: TextFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const invalid = error !== undefined;
  const shake = useShake(error);
  const row = appearance === "row";

  const field = (
    <View style={[styles.box, { opacity: disabled ? 0.6 : 1 }]}>
      <View style={[styles.flex, row && { paddingTop: spacing.sm }]}>
        {row ? (
          <AppText
            variant="caption"
            color={invalid ? "danger" : "textSecondary"}
            style={{ paddingHorizontal: spacing.lg }}
          >
            {label}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          {...input}
          editable={!disabled}
          secureTextEntry={secure && !revealed}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          {...(invalid
            ? { accessibilityHint: error }
            : helper === undefined
              ? {}
              : { accessibilityHint: helper })}
          aria-invalid={invalid}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          maxFontSizeMultiplier={2}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[
            styles.input,
            row ? styles.rowInput : null,
            {
              color: colors.textPrimary,
              fontFamily: typography.families.text[large ? "500" : "400"],
              fontSize: large ? 20 : typography.body.fontSize,
              paddingHorizontal: spacing.lg,
            },
            rows === undefined
              ? null
              : { minHeight: rows * (large ? 28 : 24) + 28, textAlignVertical: "top" },
          ]}
          {...(rows === undefined ? {} : { multiline: true })}
        />
      </View>
      {secure ? (
        <Pressable
          onPress={() => {
            setRevealed((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel={revealed ? "Hide password" : "Show password"}
          hitSlop={6}
          style={styles.reveal}
        >
          <Icon name={revealed ? "eye-off" : "eye"} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );

  const message = invalid ? (
    <View
      style={[
        styles.message,
        { gap: spacing.xs, paddingHorizontal: row ? spacing.lg : spacing.xs },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Icon name="alert" size={16} color={colors.danger} />
      <AppText variant="footnote" color="danger" style={styles.flex}>
        {error}
      </AppText>
    </View>
  ) : helper === undefined ? null : (
    <AppText
      variant="footnote"
      color="textTertiary"
      style={{ paddingHorizontal: row ? spacing.lg : spacing.xs }}
    >
      {helper}
    </AppText>
  );

  if (row) {
    return (
      <Animated.View style={[{ paddingBottom: invalid ? spacing.sm : 0 }, shake]}>
        {field}
        {message}
      </Animated.View>
    );
  }

  const ring = invalid ? colors.danger : focused ? colors.accent : null;
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="footnote" weight="500" color="textSecondary">
        {label}
      </AppText>
      <Animated.View style={shake}>
        {/* Focus halo: a soft accent ring just outside the pane. */}
        {ring === null ? null : (
          <View
            pointerEvents="none"
            style={[
              styles.halo,
              { borderRadius: radii.lg + 4, borderColor: ring, opacity: invalid ? 0.35 : 0.25 },
            ]}
          />
        )}
        <Glass radius={radii.lg} shadow={false}>
          {field}
          {ring === null ? null : (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: radii.lg, borderWidth: 1.5, borderColor: ring },
              ]}
            />
          )}
        </Glass>
      </Animated.View>
      {message}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  flex: { flex: 1 },
  input: { minHeight: 56, paddingVertical: 14 },
  rowInput: { minHeight: 40, paddingTop: 2, paddingBottom: 10 },
  reveal: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  message: { flexDirection: "row", alignItems: "flex-start" },
  halo: { position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderWidth: 4 },
});
