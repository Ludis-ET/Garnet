import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/useAuth";
import { createGarnetAuthClient } from "@/data/http/authClient";
import { API_URL } from "@/data/http/config";
import { writeLocal } from "@/data/http/localState";

// Web: complete OAuth sessions when returning from Google/Apple sign-in (P-79).
if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
}

/**
 * garnet://auth-callback: where a Google or Apple sign-in in the browser comes back (P-79). The
 * sign-in itself finishes in the code that opened the browser, which trades the one-time code
 * for the session; this route closes the popup or redeems if redirected in the same window.
 */
export default function AuthCallback() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [done, setDone] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let cleanup: (() => void) | undefined;

    // Try completing the WebBrowser auth session if opened in popup
    WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
    if (typeof window !== "undefined" && window.opener) {
      // In a popup window: close after messaging opener
      const timer = setTimeout(() => {
        try {
          window.close();
        } catch {
          setDone(true);
        }
      }, 300);
      cleanup = () => {
        clearTimeout(timer);
      };
      return cleanup;
    }

    // Fallback if navigated in same tab without opener: redeem code directly
    const code = params.code;
    const verifier =
      typeof localStorage !== "undefined" ? localStorage.getItem("garnet_handoff_verifier") : null;

    if (code && verifier && API_URL) {
      const client = createGarnetAuthClient(API_URL);
      void client
        .$fetch("/app-handoff/redeem", {
          method: "POST",
          body: { code, verifier },
        })
        .then(() => {
          try {
            localStorage.removeItem("garnet_handoff_verifier");
          } catch {
            // Ignored
          }
          writeLocal("hadSession", "yes");
          void queryClient.invalidateQueries({ queryKey: authKeys.all });
          router.replace("/");
        })
        .catch(() => {
          setDone(true);
        });
      return cleanup;
    }

    const fallback = setTimeout(() => {
      setDone(true);
    }, 0);
    cleanup = () => {
      clearTimeout(fallback);
    };
    return cleanup;
  }, [params.code, queryClient, router]);

  if (done) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF7A8A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0C10",
  },
});
