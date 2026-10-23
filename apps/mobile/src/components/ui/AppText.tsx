import { Text, type TextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { ColorTokens, TypeVariant } from "@/theme/tokens";

type TextColor = keyof Pick<
  ColorTokens,
  | "textPrimary"
  | "textSecondary"
  | "textTertiary"
  | "accent"
  | "onAccent"
  | "danger"
  | "success"
  | "warning"
  | "ruby"
  | "sapphire"
  | "garnet"
  | "disabledText"
>;

export type TextWeight = "400" | "500" | "600";

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: TextColor;
  /** Overrides the variant's weight (UI sans only). */
  weight?: TextWeight;
  /** Use the display serif at this size (emotional lines, wordmarks). */
  serif?: boolean;
  /** Serif italic accent phrase, at most one per screen (P-48), e.g. "One space." */
  italic?: boolean;
  /**
   * Styled text nested inside another AppText (a phrase within a heading). It never becomes a
   * heading itself, so the web doesn't get an <h1> inside an <h1>.
   */
  inline?: boolean;
}

/**
 * The only text component screens use. Respects Dynamic Type / font scaling (never disable
 * `allowFontScaling`), uses tokenized type, and defaults to `accessibilityRole="header"` for titles.
 * Each weight is its own font file (P-46), so the family encodes the weight; `fontWeight` is not
 * set alongside a custom family (it would make platforms synthesise a fake bold).
 */
export function AppText({
  variant = "body",
  color = "textPrimary",
  weight,
  serif = false,
  italic = false,
  inline = false,
  style,
  accessibilityRole,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();
  const scale = typography[variant];
  const display = serif || variant === "hero" || variant === "display" || variant === "title";
  const fontFamily = italic
    ? typography.families.displayItalic
    : display
      ? typography.families.display
      : typography.families.text[weight ?? scale.fontWeight];
  const letterSpacing = "letterSpacing" in scale ? scale.letterSpacing : undefined;
  const isHeading =
    variant === "hero" ||
    variant === "display" ||
    variant === "title" ||
    variant === "headline" ||
    variant === "largeTitle" ||
    variant === "statement" ||
    variant === "question";
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading && !inline ? "header" : undefined)}
      maxFontSizeMultiplier={2}
      style={[
        {
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          fontFamily,
          ...(letterSpacing === undefined ? {} : { letterSpacing }),
        },
        { color: colors[color] },
        style,
      ]}
      {...rest}
    />
  );
}
