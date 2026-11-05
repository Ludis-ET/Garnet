import { Haptics } from "@/components/ui/haptics";
import { useRouter } from "expo-router";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { useToast } from "@/components/ui/Toast";
import type { SocialProvider } from "@/data/repositories/types";
import { useTheme } from "@/theme/ThemeProvider";
import { serviceErrorMessage } from "../authUi";
import { useContinueWith, useSignInMethods } from "../useAuth";
import { AppleLogo, GoogleG } from "./ProviderLogos";

/** The same height and shape as the app's own buttons (Button: 56 pt pills). */
const HEIGHT = 56;

/**
 * Each provider's own button colours (P-79). Google: the "neutral" theme in light mode (no
 * outline, which also suits P-67) and the "dark" theme in dark mode; Apple: black in light
 * mode, white in dark mode. Both brands require these exact surfaces, so the buttons are not
 * glass; the glass is everything around them, and they share the app's shape, shadow and press.
 */
const LOOK = {
  google: {
    light: { fill: "#F2F2F2", text: "#1F1F1F", stroke: null },
    dark: { fill: "#131314", text: "#E3E3E3", stroke: "#8E918F" },
  },
  apple: {
    light: { fill: "#000000", text: "#FFFFFF", stroke: null },
    dark: { fill: "#FFFFFF", text: "#000000", stroke: null },
  },
} as const;

const LABEL: Record<SocialProvider, string> = {
  google: "Continue with Google",
  apple: "Continue with Apple",
};

function ProviderButton({
  provider,
  busy,
  disabled,
  onPress,
}: {
  provider: SocialProvider;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { scheme, radii, spacing, motion, reduceMotion, colors } = useTheme();
  const look = LOOK[provider][scheme === "dark" ? "dark" : "light"];
  const pressed = useSharedValue(0);
  const inactive = busy || disabled;
  const animateTo = (to: number) => {
    pressed.set(
      reduceMotion ? withTiming(to, { duration: 80 }) : withSpring(to, motion.spring.press),
    );
  };
  const face = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.02 }],
    opacity: 1 - pressed.get() * 0.08,
  }));

  return (
    <Pressable
      onPress={() => {
        if (inactive) return;
        if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => {
        if (!inactive) animateTo(1);
      }}
      onPressOut={() => {
        animateTo(0);
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={LABEL[provider]}
      accessibilityState={{ disabled: inactive, busy }}
      testID={`continue-${provider}`}
    >
      <Animated.View
        style={[
          styles.face,
          {
            height: HEIGHT,
            borderRadius: radii.pill,
            backgroundColor: look.fill,
            gap: spacing.md,
            shadowColor: colors.shadow,
            opacity: disabled && !busy ? 0.6 : 1,
          },
          look.stroke === null ? null : { borderWidth: 1, borderColor: look.stroke },
          face,
        ]}
      >
        <View style={styles.mark}>
          {busy ? (
            <ActivityIndicator
              size="small"
              color={look.text}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : provider === "google" ? (
            <GoogleG size={20} />
          ) : (
            <AppleLogo size={20} color={look.text} />
          )}
        </View>
        {/* The system face (Roboto on Android, SF on iPhone), as both brands ask. */}
        <AppText variant="body" style={[styles.label, { color: look.text }]}>
          {LABEL[provider]}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/**
 * "Continue with Apple" and "Continue with Google" (P-79), shown only for the ways this server
 * offers. One account per person: if the email already has a Garnet account, the provider joins
 * it. A first sign-in goes on to the birthday and the terms (AUTH-09); a cancelled one says
 * nothing. Apple comes first on iPhone and Google first elsewhere, as on each platform.
 */
export function SocialButtons({ divider }: { divider: "above" | "below" }) {
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing } = useTheme();
  const methods = useSignInMethods();
  const go = useContinueWith();
  const offered = (
    Platform.OS === "ios" ? (["apple", "google"] as const) : (["google", "apple"] as const)
  ).filter((p) => methods.data?.[p] === true);
  if (offered.length === 0) return null;

  const start = (provider: SocialProvider) => {
    go.mutate(provider, {
      onSuccess: (result) => {
        if (result.ok) {
          router.replace("/");
          return;
        }
        if (result.reason === "cancelled") return;
        toast.show(
          result.reason === "unavailable"
            ? `${provider === "google" ? "Google" : "Apple"} sign-in isn't available right now.`
            : "That didn't work. Please try again.",
          "error",
        );
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  const line = (
    <View
      style={[styles.divider, { gap: spacing.md }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
      <AppText variant="footnote" color="textTertiary">
        or
      </AppText>
      <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
    </View>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      {divider === "above" ? line : null}
      {offered.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          busy={go.isPending && go.variables === provider}
          disabled={go.isPending}
          onPress={() => {
            start(provider);
          }}
        />
      ))}
      {divider === "below" ? line : null}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  mark: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: undefined, fontWeight: "500", letterSpacing: 0.1 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  hairline: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
});
