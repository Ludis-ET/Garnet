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
  | "ruby"
  | "sapphire"
  | "garnet"
>;

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: TextColor;
}

/**
 * The only text component screens use. Respects Dynamic Type / font scaling (never disable
 * `allowFontScaling`), uses tokenized type, and defaults to `accessibilityRole="header"` for titles.
 */
export function AppText({
  variant = "body",
  color = "textPrimary",
  style,
  accessibilityRole,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();
  const family =
    variant === "display" || variant === "title"
      ? typography.families.display
      : typography.families.text;
  const isHeading = variant === "display" || variant === "title" || variant === "headline";
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading ? "header" : undefined)}
      maxFontSizeMultiplier={2}
      style={[
        typography[variant],
        { color: colors[color] },
        family === undefined ? null : { fontFamily: family },
        style,
      ]}
      {...rest}
    />
  );
}
