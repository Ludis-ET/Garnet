import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { ConnectResult, SocialProvider, SocialSignInResult } from "@/data/repositories/types";
import type { GarnetAuthClient } from "./authClient";
import { CLIENT_HEADER } from "./client";

/** Where the API's hand-off opens the app (apps/api/src/auth/handoff.ts). */
export const APP_CALLBACK = "garnet://auth-callback";

/** 32 random bytes as base64url (43 characters): the verifier, or a nonce. */
function randomSecret(): string {
  const bytes = Crypto.getRandomBytes(32);
  return toBase64Url(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(text: string): Promise<string> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    new TextEncoder().encode(text),
  );
  return toBase64Url(new Uint8Array(digest));
}

/**
 * Google, and Apple off iPhone, in the phone's browser (P-79). The sign-in happens on the
 * provider's own page; the API keeps the PKCE secret and the state, and the session comes back
 * through the hand-off: the app sends only the SHA-256 of a secret `verifier` when it starts,
 * receives a one-time code in the garnet:// link, and trades code + verifier for the session.
 * Someone who catches the link can't use it.
 */
function getWebOrigin(): string {
  if (Platform.OS !== "web") return "";
  try {
    const loc =
      typeof window !== "undefined"
        ? (window as unknown as { location?: { origin?: string } }).location
        : undefined;
    return typeof loc?.origin === "string" ? loc.origin : "";
  } catch {
    return "";
  }
}

async function inBrowser(
  client: GarnetAuthClient,
  baseUrl: string,
  provider: SocialProvider,
): Promise<SocialSignInResult> {
  const auth = `${baseUrl}/v1/auth`;
  const verifier = randomSecret();
  const challenge = await sha256Base64Url(verifier);
  const isWeb = Platform.OS === "web";
  const webOrigin = getWebOrigin();
  const callbackTarget = isWeb && webOrigin ? `${webOrigin}/auth-callback` : APP_CALLBACK;
  const callbackQuery =
    isWeb && webOrigin ? `&redirect_to=${encodeURIComponent(callbackTarget)}` : "";
  const start = await fetch(`${auth}/sign-in/social`, {
    method: "POST",
    headers: {
      [CLIENT_HEADER.name]: CLIENT_HEADER.value,
      "content-type": "application/json",
      "expo-origin": isWeb ? webOrigin : "garnet://",
    },
    body: JSON.stringify({
      provider,
      callbackURL: `${auth}/app-handoff/start?challenge=${challenge}${callbackQuery}`,
      errorCallbackURL: `${auth}/app-handoff/failed${callbackQuery ? `?${callbackQuery.slice(1)}` : ""}`,
      disableRedirect: true,
    }),
    credentials: "omit",
  }).catch(() => null);
  if (start === null) return { ok: false, reason: "failed" };
  if (start.status === 404 || start.status === 400) return { ok: false, reason: "unavailable" };
  const { url } = (await start.json().catch(() => ({}))) as { url?: unknown };
  if (typeof url !== "string") return { ok: false, reason: "failed" };

  if (isWeb && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("garnet_handoff_verifier", verifier);
    } catch {
      // Ignored if storage is blocked
    }
  }

  // The proxy keeps the sign-in's state in this browser session, then opens the provider.
  const proxy = `${auth}/expo-authorization-proxy?authorizationURL=${encodeURIComponent(url)}`;
  const result = await WebBrowser.openAuthSessionAsync(proxy, callbackTarget, {
    // A private session: the browser keeps no cookies of its own afterwards (iOS).
    preferEphemeralSession: true,
  });
  try {
    if (result.type !== "success") return { ok: false, reason: "cancelled" };
    const back = new URL(result.url);
    const error = back.searchParams.get("error");
    if (error !== null)
      return { ok: false, reason: error === "cancelled" ? "cancelled" : "failed" };
    const code = back.searchParams.get("code");
    if (code === null) return { ok: false, reason: "failed" };
    // Through Better Auth's client, which keeps the session cookie in the keystore.
    const { error: redeemError } = await client.$fetch("/app-handoff/redeem", {
      method: "POST",
      body: { code, verifier },
    });
    return redeemError === null ? { ok: true } : { ok: false, reason: "failed" };
  } finally {
    if (isWeb && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem("garnet_handoff_verifier");
      } catch {
        // Ignored
      }
    }
  }
}

/**
 * Apple on iPhone: Apple's own sheet (required there). The nonce goes to Apple hashed and to the
 * API as it is, so an identity token can't be replayed from another sign-in. Apple gives the
 * name only the first time, so it is passed on then.
 */
type AppleCredential =
  | {
      ok: true;
      token: string;
      nonce: string;
      name: { firstName: string; lastName: string } | null;
      email: string | null;
    }
  | { ok: false; reason: "cancelled" | "failed" };

async function appleCredential(): Promise<AppleCredential> {
  const nonce = randomSecret();
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
    });
  } catch (e) {
    const code = (e as { code?: unknown }).code;
    return { ok: false, reason: code === "ERR_REQUEST_CANCELED" ? "cancelled" : "failed" };
  }
  if (credential.identityToken === null) return { ok: false, reason: "failed" };
  const name = credential.fullName;
  return {
    ok: true,
    token: credential.identityToken,
    nonce,
    name:
      name?.givenName == null && name?.familyName == null
        ? null
        : { firstName: name.givenName ?? "", lastName: name.familyName ?? "" },
    email: credential.email,
  };
}

async function appleOnIphone(client: GarnetAuthClient): Promise<SocialSignInResult> {
  const signed = await appleCredential();
  if (!signed.ok) return signed;
  const { error } = await client.signIn.social({
    provider: "apple",
    idToken: {
      token: signed.token,
      nonce: signed.nonce,
      ...(signed.name === null
        ? {}
        : {
            user: {
              name: signed.name,
              ...(signed.email === null ? {} : { email: signed.email }),
            },
          }),
    },
  });
  if (error === null) return { ok: true };
  return { ok: false, reason: error.status === 404 ? "unavailable" : "failed" };
}

/**
 * Connecting Google or Apple to the account that is signed in (P-80). The browser step is the
 * same, but nothing comes back to redeem: the session stays the one this phone already has.
 */
export async function connectProvider(
  client: GarnetAuthClient,
  baseUrl: string,
  provider: SocialProvider,
): Promise<ConnectResult> {
  if (
    provider === "apple" &&
    Platform.OS === "ios" &&
    (await AppleAuthentication.isAvailableAsync())
  ) {
    const signed = await appleCredential();
    if (!signed.ok) return signed;
    const { error } = await client.linkSocial({
      provider: "apple",
      idToken: { token: signed.token, nonce: signed.nonce },
    });
    if (error === null) return { ok: true };
    return { ok: false, reason: error.status === 403 ? "sign-in-again" : "failed" };
  }
  const auth = `${baseUrl}/v1/auth`;
  const isWeb = Platform.OS === "web";
  const webOrigin = getWebOrigin();
  const callbackTarget = isWeb && webOrigin ? `${webOrigin}/auth-callback` : APP_CALLBACK;
  const callbackQuery =
    isWeb && webOrigin ? `?redirect_to=${encodeURIComponent(callbackTarget)}` : "";
  const start = await fetch(`${auth}/link-social`, {
    method: "POST",
    headers: {
      [CLIENT_HEADER.name]: CLIENT_HEADER.value,
      "content-type": "application/json",
      "expo-origin": isWeb ? webOrigin : "garnet://",
      cookie: await client.getCookie(),
    },
    body: JSON.stringify({
      provider,
      callbackURL: `${auth}/app-handoff/linked${callbackQuery}`,
      errorCallbackURL: `${auth}/app-handoff/failed${callbackQuery}`,
      disableRedirect: true,
    }),
    credentials: "omit",
  }).catch(() => null);
  if (start === null) return { ok: false, reason: "failed" };
  if (start.status === 403) return { ok: false, reason: "sign-in-again" };
  if (start.status === 400 || start.status === 404) return { ok: false, reason: "unavailable" };
  const { url } = (await start.json().catch(() => ({}))) as { url?: unknown };
  if (typeof url !== "string") return { ok: false, reason: "failed" };
  const proxy = `${auth}/expo-authorization-proxy?authorizationURL=${encodeURIComponent(url)}`;
  const result = await WebBrowser.openAuthSessionAsync(proxy, callbackTarget, {
    preferEphemeralSession: true,
  });
  if (result.type !== "success") return { ok: false, reason: "cancelled" };
  const back = new URL(result.url);
  if (back.searchParams.get("linked") === "1") return { ok: true };
  const error = back.searchParams.get("error");
  if (error === "cancelled") return { ok: false, reason: "cancelled" };
  return { ok: false, reason: error === "taken" ? "taken" : "failed" };
}

export async function continueWithProvider(
  client: GarnetAuthClient,
  baseUrl: string,
  provider: SocialProvider,
): Promise<SocialSignInResult> {
  if (
    provider === "apple" &&
    Platform.OS === "ios" &&
    (await AppleAuthentication.isAvailableAsync())
  )
    return appleOnIphone(client);
  return inBrowser(client, baseUrl, provider);
}
