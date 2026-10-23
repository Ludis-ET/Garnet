import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { Glass } from "@/components/ui/Glass";
import { useShake } from "@/components/ui/motion";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * iOS inset group in glass (P-48): several `TextField appearance="row"` (or other rows) in one
 * pane, separated by inset hairlines. `shakeKey` shakes the whole group once when it changes
 * (a wrong sign-in), never naming a single field.
 */
export function FieldGroup({
  children,
  shakeKey,
  style,
}: {
  children: ReactNode;
  shakeKey?: unknown;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radii, spacing } = useTheme();
  const shake = useShake(shakeKey);
  const rows = Children.toArray(children);
  return (
    <Animated.View style={[shake, style]}>
      <Glass radius={radii.xl}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i === 0 ? null : (
              <View
                style={[
                  styles.divider,
                  { marginLeft: spacing.lg, backgroundColor: colors.glassHairline },
                ]}
              />
            )}
            {row}
          </Fragment>
        ))}
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ divider: { height: StyleSheet.hairlineWidth } });
