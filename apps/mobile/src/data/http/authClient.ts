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
  if (Platform.OS === "web") return "Garnet (Web)";
  if (Platform.OS === "ios") return "Garnet (iOS)";
  const constants = Platform.constants as { Model?: unknown } | undefined;
  const model = constants?.Model;
  return typeof model === "string" ? `Garnet (Android; ${model})` : "Garnet (Android)";
}

const webStorage = {
  getItem: (key: string): string | null =>
    typeof localStorage !== "undefined" ? localStorage.getItem(key) : null,
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  getItemAsync: (key: string): Promise<string | null> =>
    Promise.resolve(typeof localStorage !== "undefined" ? localStorage.getItem(key) : null),
  setItemAsync: (key: string, value: string): Promise<void> => {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return Promise.resolve();
  },
};

export function createGarnetAuthClient(baseURL: string) {
  const isWeb = Platform.OS === "web";
  const storage = isWeb ? webStorage : SecureStore;
  return createAuthClient({
    baseURL,
    basePath: "/v1/auth",
    fetchOptions: {
      credentials: isWeb ? "include" : "omit",
      headers: {
        [CLIENT_HEADER.name]: CLIENT_HEADER.value,
        ...(isWeb ? {} : { "user-agent": deviceAgent() }),
      },
    },
    plugins: [expoClient({ scheme: "garnet", storagePrefix: "garnet", storage })],
  });
}

export type GarnetAuthClient = ReturnType<typeof createGarnetAuthClient>;

const shared = new Map<string, GarnetAuthClient>();

/**
 * The one auth client per API address (production-fix-plan A1). Several clients each kept their
 * own copy of the session in memory, so one could hold a fresh sign-in while another still said
 * "signed out"; every caller in the app goes through this instead.
 */
export function getGarnetAuthClient(baseURL: string): GarnetAuthClient {
  const key = baseURL.replace(/\/+$/, "");
  let client = shared.get(key);
  if (client === undefined) {
    client = createGarnetAuthClient(key);
    shared.set(key, client);
  }
  return client;
}
