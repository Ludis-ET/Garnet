import { Platform, Switch } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: a switch is never announced without its label. */
  accessibilityLabel: string;
}

// react-native-web paints the "on" thumb teal unless told otherwise; this prop only exists there.
const webThumb = (color: string): object =>
  Platform.OS === "web" ? { activeThumbColor: color } : {};

/**
 * The one on/off control. Brand track when on, a white thumb in both states, so the state is
 * carried by position as well as colour (never colour alone).
 */
export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      trackColor={{ true: colors.accentStrong, false: colors.border }}
      thumbColor={colors.onAccent}
      ios_backgroundColor={colors.border}
      {...webThumb(colors.onAccent)}
    />
  );
}
