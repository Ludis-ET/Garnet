import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/useAuth";
import { getGarnetAuthClient } from "@/data/http/authClient";
import { API_URL } from "@/data/http/config";
import { clearLocal } from "@/data/http/localState";
import { redeemHandoff } from "@/data/http/social";
import { useTheme } from "@/theme/ThemeProvider";

// Web: complete OAuth sessions when returning from Google/Apple sign-in (P-79).
if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
}

/**
 * garnet://auth-callback: where a Google or Apple sign-in in the browser comes back (P-79).
 *
 * The one-time code is traded through redeemHandoff, which the code that opened the browser
 * shares, so the two never race each other for it (production-fix-plan A2). Before moving on,
 * the auth status is fetched again and awaited (A1): navigating first used to land on the
 * entry gate while it still held "signed out", which sent the person to the welcome page.
 */
export default function AuthCallback() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error?: string; linked?: string }>();
  const started = useRef(false);

  useEffect(() => {
    // Expo Router can deliver the same link twice; the first run owns it.
    if (started.current) return;
    started.current = true;

    // Web popup: the opener finishes; this window only closes.
    if (Platform.OS === "web" && typeof window !== "undefined" && window.opener) {
      try {
        window.close();
        return;
      } catch {
        // Fall through and finish here.
      }
    }

    const goTo = async (href: "/" | "/welcome" | "/settings") => {
      // Fresh status first, then the route that reads it.
      await queryClient.refetchQueries({ queryKey: authKeys.status }).catch(() => undefined);
      router.replace(href);
    };

    if (params.linked === "1") {
      void goTo("/settings");
      return;
    }
    if (params.error !== undefined || params.code === undefined || API_URL === null) {
      void (async () => {
        await clearLocal("handoffVerifier");
        await goTo(params.error === undefined && params.code === undefined ? "/" : "/welcome");
      })();
      return;
    }

    const code = params.code;
    void (async () => {
      const client = getGarnetAuthClient(API_URL);
      const ok = await redeemHandoff(client, code);
      if (ok) {
        // A Google or Apple sign-in replaces any email sign-up waiting on this phone.
        await clearLocal("pendingEmail", "justVerified");
        await goTo("/");
        return;
      }
      // The code was already used, or expired: the person may still be signed in from the
      // first use; the gate decides from the server's answer.
      await goTo("/");
    })();
  }, [params.code, params.error, params.linked, queryClient, router]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessible
      accessibilityLabel="Signing you in"
      accessibilityRole="progressbar"
    >
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
