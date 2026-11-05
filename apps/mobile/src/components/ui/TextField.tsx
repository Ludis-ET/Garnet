import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type Ref } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useShake } from "@/components/ui/motion";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";
import { ENTER, EXIT } from "@/theme/transitions";

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
  /** A small icon at the start of the field (search, pin, mail…). */
  icon?: IconName;
  /** Shows a clear button while there is text (not for passwords). Default on for one-line fields. */
  clearable?: boolean;
  ref?: Ref<TextInput>;
}

/**
 * Liquid glass text field (P-48, redesign P-62). No outlines: the browser's focus rectangle is
 * gone (`noOutline`), and focus is a soft glow in the person's colour that rises under the pane
 * while the label and the leading icon take the accent and the pane lifts slightly. An error
 * glows ruby and sits under its own field with an icon (never colour alone), is announced, and
 * shakes the field once. Extras: a leading icon, a clear button, a live character counter near
 * the limit, and show/hide for passwords. Reduced motion: no lift.
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
  icon,
  clearable,
  ref,
  ...input
}: TextFieldProps) {
  const { colors, radii, spacing, typography, motion, reduceMotion } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const invalid = error !== undefined;
  const shake = useShake(error);
  const row = appearance === "row";
  const value = typeof input.value === "string" ? input.value : "";
  const canClear =
    (clearable ?? (rows === undefined && !secure)) &&
    value.length > 0 &&
    !disabled &&
    input.onChangeText !== undefined;
  const max = input.maxLength;
  const showCount = max !== undefined && focused && value.length >= Math.floor(max * 0.8);

  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(
      reduceMotion
        ? withTiming(focused ? 1 : 0, { duration: 120 })
        : withSpring(focused ? 1 : 0, motion.spring.smooth),
    );
  }, [focused, reduceMotion, lift, motion.spring.smooth]);
  const paneStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : -lift.get() * 1.5 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: invalid ? 0.55 : lift.get() * 0.6,
    transform: [{ scaleX: 0.9 + lift.get() * 0.1 }],
  }));
  const glow = invalid ? colors.danger : colors.accent;
  const tint = invalid ? colors.danger : focused ? colors.accent : null;

  const field = (
    <View style={[styles.box, { opacity: disabled ? 0.6 : 1 }]}>
      {icon === undefined ? null : (
        <View style={[styles.lead, { paddingLeft: spacing.lg }]}>
          <Icon name={icon} size={19} color={tint ?? colors.textTertiary} />
        </View>
      )}
      <View style={[styles.flex, row && { paddingTop: spacing.sm }]}>
        {row ? (
          <AppText
            variant="caption"
            color={invalid ? "danger" : focused ? "accent" : "textSecondary"}
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
          accessibilityLabel={input.accessibilityLabel ?? label}
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
            noOutline,
            row ? styles.rowInput : null,
            {
              color: colors.textPrimary,
              fontFamily: typography.families.text[large ? "500" : "400"],
              fontSize: large ? 20 : typography.body.fontSize,
              paddingLeft: icon === undefined ? spacing.lg : spacing.sm,
              paddingRight: spacing.lg,
            },
            rows === undefined
              ? null
              : { minHeight: rows * (large ? 28 : 24) + 28, textAlignVertical: "top" },
          ]}
          {...(rows === undefined ? {} : { multiline: true })}
        />
      </View>
      {canClear ? (
        <Animated.View entering={ENTER} exiting={EXIT}>
          <Pressable
            onPress={() => {
              input.onChangeText?.("");
            }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={8}
            style={styles.clear}
          >
            <View style={[styles.clearDot, { backgroundColor: colors.textTertiary }]}>
              <Icon name="x" size={11} color={colors.background} />
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
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
  ) : helper === undefined && !showCount ? null : (
    <View style={[styles.message, { paddingHorizontal: row ? spacing.lg : spacing.xs }]}>
      <AppText variant="footnote" color="textTertiary" style={styles.flex}>
        {helper ?? ""}
      </AppText>
      {showCount ? (
        <AppText
          variant="caption"
          weight="600"
          color={value.length >= max ? "danger" : "textTertiary"}
          accessibilityLiveRegion="polite"
        >
          {max - value.length}
        </AppText>
      ) : null}
    </View>
  );

  if (row) {
    return (
      <Animated.View style={[{ paddingBottom: invalid ? spacing.sm : 0 }, shake]}>
        {field}
        {message}
      </Animated.View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText
        variant="footnote"
        weight={focused ? "600" : "500"}
        color={invalid ? "danger" : focused ? "accent" : "textSecondary"}
      >
        {label}
      </AppText>
      <Animated.View style={[shake, paneStyle]}>
        {/* The glow: a soft light in the accent rising under the pane — no outline. */}
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
          <LinearGradient
            colors={[`${glow}00`, `${glow}66`, `${glow}00`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radii.lg + 6 }]}
          />
        </Animated.View>
        <Glass radius={radii.lg} shadow={focused} tint={invalid ? "ruby" : "none"}>
          {field}
        </Glass>
      </Animated.View>
      {message}
    </View>
  );
}

/** Removes the browser's focus rectangle (web); native inputs never draw one. */
export const noOutline = { outlineStyle: "none", outlineWidth: 0 } as unknown as object;

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  flex: { flex: 1 },
  lead: { justifyContent: "center" },
  input: { minHeight: 56, paddingVertical: 14 },
  rowInput: { minHeight: 40, paddingTop: 2, paddingBottom: 10 },
  reveal: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: { width: 36, height: touchTarget, alignItems: "center", justifyContent: "center" },
  clearDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  message: { flexDirection: "row", alignItems: "flex-start" },
  glow: { position: "absolute", left: 8, right: 8, bottom: -10, height: 26 },
});
