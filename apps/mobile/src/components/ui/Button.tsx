import { Haptics } from "@/components/ui/haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "text" | "subtle" | "destructive";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner, keeps the label for screen readers, and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Height of the primary button's face and of the lip it sinks onto (P-48). */
const FACE = 56;
const LIP = 4;

/**
 * Buttons in Daylight Glass (P-48).
 * - primary: the one action per screen. A violet pill on a darker "lip"; pressing sinks it onto
 *   the lip with a spring (tactile, Duolingo-like) and a light haptic. Grey when disabled.
 * - secondary: a glass pill. text: a violet link. subtle: prototype-only helpers.
 * - destructive: ruby-red text, for sheet actions such as "Sign out".
 * The label stays the accessible name while loading; disabled and busy states are announced.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors, radii, spacing, motion, reduceMotion } = useTheme();
  const inactive = disabled || loading;
  const pressed = useSharedValue(0);
  const primary = variant === "primary";
  const link = variant === "text" || variant === "subtle" || variant === "destructive";

  const animateTo = (to: number) => {
    pressed.set(
      reduceMotion ? withTiming(to, { duration: 80 }) : withSpring(to, motion.spring.press),
    );
  };
  const press = () => {
    if (inactive) return;
    if (primary && Platform.OS !== "web")
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const faceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: primary ? pressed.get() * (LIP - 1) : 0 },
      { scale: 1 - pressed.get() * (primary ? 0.015 : 0.03) },
    ],
    opacity: link ? 1 - pressed.get() * 0.4 : 1,
  }));

  const labelColor = primary
    ? disabled
      ? "disabledText"
      : "onAccent"
    : variant === "secondary"
      ? "textPrimary"
      : variant === "subtle"
        ? "textTertiary"
        : variant === "destructive"
          ? "danger"
          : "accent";

  const content = (
    <View style={[styles.row, { gap: spacing.sm, paddingHorizontal: spacing.xl }]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary ? colors.onAccent : colors.accent}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
      <AppText
        variant={variant === "subtle" ? "footnote" : "body"}
        weight={variant === "subtle" ? "500" : "600"}
        color={labelColor}
      >
        {label}
      </AppText>
    </View>
  );

  return (
    <Pressable
      onPress={press}
      onPressIn={() => {
        if (!inactive) animateTo(1);
      }}
      onPressOut={() => {
        animateTo(0);
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      {...(testID === undefined ? {} : { testID })}
      hitSlop={link ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
      style={[styles.base, { minHeight: link ? touchTarget : primary ? FACE + LIP : FACE }, style]}
    >
      {primary ? (
        <View style={{ height: FACE + LIP }}>
          <View
            style={[
              styles.lip,
              {
                height: FACE,
                borderRadius: radii.pill,
                backgroundColor: disabled ? colors.disabledLip : colors.accentLip,
              },
            ]}
          />
          <Animated.View style={[{ height: FACE, borderRadius: radii.pill }, faceStyle]}>
            {disabled ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: radii.pill, backgroundColor: colors.disabledFill },
                ]}
              />
            ) : (
              <>
                <LinearGradient
                  colors={[colors.accentStrong, colors.accentStrongEnd]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]}
                />
                {/* A soft gloss along the upper edge; it fades out above the label. */}
                <LinearGradient
                  colors={[colors.glassHighlight, "transparent"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.4 }}
                  style={[StyleSheet.absoluteFill, styles.gloss, { borderRadius: radii.pill }]}
                  pointerEvents="none"
                />
              </>
            )}
            <View style={styles.center}>{content}</View>
          </Animated.View>
        </View>
      ) : variant === "secondary" ? (
        <Animated.View style={faceStyle}>
          <Glass radius={radii.pill} shadow={false} contentStyle={[styles.box, { height: FACE }]}>
            {content}
          </Glass>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.center, faceStyle]}>{content}</Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: "center", alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  // No flex here: inside the glass pane, flex would collapse the fixed height on web.
  box: { alignItems: "center", justifyContent: "center" },
  lip: { position: "absolute", left: 0, right: 0, bottom: 0 },
  gloss: { opacity: 0.25 },
});
