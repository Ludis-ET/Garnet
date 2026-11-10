import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PushPayload, PushResult, PushSender } from "./push-sender";

/**
 * Android push through Firebase Cloud Messaging's HTTP v1 API (P-101): delivery only, no
 * Firebase SDK on the server, no analytics. What goes to Google is a generic title and body and
 * an opaque id (§5, P-17); the phone fetches anything else from Garnet itself. iPhones are not
 * sent through FCM: they wait for Apple's own service (APNs) once the Apple Developer account
 * exists.
 */
export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/** The service account from GARNET_FCM_SERVICE_ACCOUNT_FILE (a path) or …_JSON (base64). */
export function readServiceAccount(env: NodeJS.ProcessEnv): ServiceAccount | null {
  const file = env["GARNET_FCM_SERVICE_ACCOUNT_FILE"];
  const b64 = env["GARNET_FCM_SERVICE_ACCOUNT_JSON"];
  let text: string | null = null;
  if (file !== undefined && file !== "") text = readFileSync(file, "utf8");
  else if (b64 !== undefined && b64 !== "") text = Buffer.from(b64, "base64").toString("utf8");
  if (text === null) return null;
  const parsed = JSON.parse(text) as Partial<ServiceAccount>;
  if (
    typeof parsed.project_id !== "string" ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  )
    throw new Error("The FCM service account is missing project_id, client_email or private_key");
  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key,
  };
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** A signed request for an access token (RFC 7523), as Google's service accounts use. */
export function signedAssertion(account: ServiceAccount, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(account.private_key))}`;
}

/** The app's Android channels (notifications/system.android.ts), one per kind plus quiet. */
export function channelFor(group: string, quiet: boolean): string {
  if (quiet) return "quiet";
  if (group === "messages") return "messages";
  if (group === "signals") return "signals";
  return "reminders";
}

/** The FCM message for a payload: Android only, generic text, quiet hours on a silent channel. */
export function fcmMessage(payload: PushPayload): unknown {
  return {
    message: {
      token: payload.to,
      notification: { title: payload.title, body: payload.body },
      data: {
        id: payload.data.id,
        href: payload.data.href,
        group: payload.data.group,
        category: payload.data.category,
        garnet: "1",
      },
      android: {
        priority: payload.quiet ? "NORMAL" : "HIGH",
        notification: {
          channel_id: channelFor(payload.data.group, payload.quiet),
          // One notification per group replaces the last, so nothing piles up.
          tag: payload.data.group,
          ...(payload.badge === undefined ? {} : { notification_count: payload.badge }),
        },
      },
    },
  };
}

export class FcmPushSender implements PushSender {
  #token: { value: string; until: number } | null = null;

  constructor(
    private readonly account: ServiceAccount,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async #accessToken(): Promise<string> {
    const now = Date.now();
    if (this.#token !== null && this.#token.until > now + 60_000) return this.#token.value;
    const res = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signedAssertion(this.account, Math.floor(now / 1000)),
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`fcm_auth_${String(res.status)}`);
    const body = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== "string") throw new Error("fcm_auth_invalid");
    const seconds = typeof body.expires_in === "number" ? body.expires_in : 3600;
    this.#token = { value: body.access_token, until: now + seconds * 1000 };
    return body.access_token;
  }

  async send(payload: PushPayload): Promise<PushResult> {
    if (payload.platform !== "android") return { ok: false, error: "platform_not_supported" };
    try {
      const token = await this.#accessToken();
      const res = await this.fetchImpl(
        `https://fcm.googleapis.com/v1/projects/${this.account.project_id}/messages:send`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(fcmMessage(payload)),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (res.ok) return { ok: true };
      // A token the phone no longer has (app removed, data cleared): forget it.
      const err = (await res.json().catch(() => ({}))) as {
        error?: { status?: string; details?: { errorCode?: string }[] };
      };
      const code = err.error?.details?.find((d) => d.errorCode !== undefined)?.errorCode;
      if (res.status === 404 || code === "UNREGISTERED") return { ok: false, unregistered: true };
      if (res.status === 401) this.#token = null;
      return { ok: false, error: code ?? `fcm_${String(res.status)}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message.slice(0, 40) : "fcm" };
    }
  }
}
