import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { getGarnetAuthClient } from "@/data/http/authClient";
import { CLIENT_HEADER } from "@/data/http/client";
import { API_AREAS_ON, API_URL } from "@/data/http/config";
import { useAuthStatus } from "@/features/auth/useAuth";
import { onPushToken, permission, pushToken } from "./system";

/**
 * Push on Android through FCM (P-101). Once the person has allowed notifications (the setup's
 * alerts step asks; nothing is asked here) and is signed in, this phone's token is given to the
 * API, and again whenever Firebase changes it or the app comes back. The API keeps it with the
 * session, so signing out ends it. Renders nothing; does nothing on mock data or on iPhone
 * until Apple's push service is set up.
 */
export function PushRegistration() {
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (API_URL === null || API_AREAS_ON.size === 0 || !signedIn || Platform.OS !== "android")
      return;
    const baseUrl = API_URL;
    let live = true;

    const register = async (token: string) => {
      if (!live || token === sent.current) return;
      const cookie = await getGarnetAuthClient(baseUrl).getCookie();
      const res = await fetch(`${baseUrl}/v1/me/push-devices`, {
        method: "POST",
        headers: {
          [CLIENT_HEADER.name]: CLIENT_HEADER.value,
          "content-type": "application/json",
          ...(cookie === "" ? {} : { cookie }),
        },
        body: JSON.stringify({ token, platform: "android" }),
      }).catch(() => null);
      if (res?.ok === true) sent.current = token;
    };

    const tryNow = async () => {
      if ((await permission(false)) !== "granted") return;
      const token = await pushToken();
      if (token !== null) await register(token);
    };

    void tryNow();
    const offToken = onPushToken((token) => {
      void register(token);
    });
    // Allowed later (in setup or the phone's settings): picked up on coming back.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void tryNow();
    });
    return () => {
      live = false;
      offToken();
      sub.remove();
    };
  }, [signedIn]);

  // A new sign-in is a new session on the server: register again.
  useEffect(() => {
    if (!signedIn) sent.current = null;
  }, [signedIn]);

  return null;
}
