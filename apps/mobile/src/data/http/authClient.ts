import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { CLIENT_HEADER } from "./client";

/**
 * Better Auth's client (owner direction P-77, B1). Its Expo plugin keeps the session cookie in
 * the phone's secure keystore (Android Keystore, iOS Keychain), never in files or AsyncStorage
 * (ADR-0006), and sends the app's scheme as its origin, the one origin the API trusts. Every
 * request also carries the app header, which the API requires on writes (CSRF, P-78).
 */
/**
 * How this phone names itself, for "Devices" in Settings (SET-12): the platform and, on Android,
 * the model. Only the person themselves ever sees it.
 */
function deviceAgent(): string {
  if (Platform.OS === "ios") return "Garnet (iOS)";
  const model = (Platform.constants as { Model?: unknown }).Model;
  return typeof model === "string" ? `Garnet (Android; ${model})` : "Garnet (Android)";
}

export function createGarnetAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    basePath: "/v1/auth",
    fetchOptions: {
      headers: { [CLIENT_HEADER.name]: CLIENT_HEADER.value, "user-agent": deviceAgent() },
    },
    plugins: [expoClient({ scheme: "garnet", storagePrefix: "garnet", storage: SecureStore })],
  });
}

export type GarnetAuthClient = ReturnType<typeof createGarnetAuthClient>;
