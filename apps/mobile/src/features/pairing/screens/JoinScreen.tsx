/**
 * PAIR-03 · Enter your code (Daylight Glass, P-49). One hidden field drives eight tiles; it
 * uppercases, drops spaces and dashes, and skips characters that can't be in a code (P-50). Any
 * code that can't be used gets one identical message (P-18, proposed). The input is kept so a
 * typo can be fixed.
 */
import * as Clipboard from "expo-clipboard";
import { Haptics } from "@/components/ui/haptics";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import {
  INVITE_CODE_LENGTH,
  INVITE_NOT_VALID_MESSAGE,
  isInviteCodeComplete,
  normaliseInviteCode,
} from "@/domain/pairing";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { DEMO_INVITE_CODES } from "@/features/prototype/demoActions";
import { useTheme } from "@/theme/ThemeProvider";
import { CodeTiles } from "../components/CodeTiles";
import { useCheckCode, usePairingStatus } from "../usePairing";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

export function JoinScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const status = usePairingStatus();
  const check = useCheckCode();
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [invalidAt, setInvalidAt] = useState<number | null>(null);
  const input = useRef<TextInput>(null);

  if (status.data?.kind === "paired") return <Redirect href="/pair/already" />;

  const change = (text: string) => {
    setCode(normaliseInviteCode(text));
    setInvalidAt(null);
  };
  const submit = () => {
    if (!isInviteCodeComplete(code) || check.isPending) return;
    check.mutate(code, {
      onSuccess: (result) => {
        if (result.ok) {
          if (Platform.OS !== "web") void Haptics.selectionAsync();
          router.push("/pair/review");
        } else {
          if (Platform.OS !== "web")
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setInvalidAt(Date.now());
        }
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };
  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    change(text);
    input.current?.focus();
  };
  const left = INVITE_CODE_LENGTH - code.length;

  return (
    <GlassScreen
      onBack={() => {
        goBack("/pair");
      }}
      footer={
        <Button
          label="Continue"
          onPress={submit}
          loading={check.isPending}
          disabled={!isInviteCodeComplete(code)}
        />
      }
    >
      <Animated.View {...(reduceMotion ? {} : { entering: ENTER })} style={{ gap: spacing.sm }}>
        <AppText variant="largeTitle">Enter your code</AppText>
      </Animated.View>

      <View style={{ gap: spacing.lg }}>
        <Pressable
          onPress={() => input.current?.focus()}
          accessible={false}
          importantForAccessibility="no"
          style={styles.tiles}
        >
          <CodeTiles
            code={code}
            activeIndex={focused ? Math.min(code.length, INVITE_CODE_LENGTH - 1) : -1}
            tone={invalidAt === null ? "normal" : "error"}
            shakeKey={invalidAt ?? undefined}
            checking={check.isPending}
          />
          {/* The real field: invisible, over the tiles, so taps and the keyboard reach it. */}
          <TextInput
            ref={input}
            value={code}
            onChangeText={change}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
            returnKeyType="go"
            onSubmitEditing={submit}
            maxLength={INVITE_CODE_LENGTH + 4}
            caretHidden
            selectionColor="transparent"
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
            }}
            accessibilityLabel="Invitation code"
            accessibilityHint={
              left === 0
                ? "All characters entered"
                : `${left} of ${INVITE_CODE_LENGTH} characters left`
            }
            style={[StyleSheet.absoluteFill, styles.hidden, { color: colors.textPrimary }]}
          />
        </Pressable>

        <Pressable
          onPress={() => {
            void paste();
          }}
          accessibilityRole="button"
          accessibilityLabel="Paste code"
          style={styles.center}
        >
          <Glass
            radius={radii.pill}
            shadow={false}
            contentStyle={[styles.pill, { paddingHorizontal: spacing.lg, gap: spacing.xs }]}
          >
            <Icon name="paste" size={16} color={colors.accent} />
            <AppText variant="callout" weight="600" color="accent">
              Paste
            </AppText>
          </Glass>
        </Pressable>

        {invalidAt === null ? null : <Notice tone="error" text={INVITE_NOT_VALID_MESSAGE} />}

        <Button
          label="Use the demo invitation from Noah (prototype)"
          variant="subtle"
          onPress={() => {
            change(DEMO_INVITE_CODES.valid);
          }}
        />
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  tiles: { justifyContent: "center", minHeight: 64 },
  hidden: { opacity: 0.011 },
  center: { alignSelf: "center" },
  pill: { flexDirection: "row", alignItems: "center", minHeight: 44 },
});
