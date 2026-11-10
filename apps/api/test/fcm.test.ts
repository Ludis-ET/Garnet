/**
 * Android push through FCM (P-101): signed by the service account, generic text only, Android
 * only, and a token the phone dropped is forgotten.
 */
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  FcmPushSender,
  fcmMessage,
  readServiceAccount,
  signedAssertion,
  type ServiceAccount,
} from "../src/notifications/fcm-sender";
import type { PushPayload } from "../src/notifications/push-sender";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account: ServiceAccount = {
  project_id: "garnet-test",
  client_email: "push@garnet-test.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

const payload = (over: Partial<PushPayload> = {}): PushPayload => ({
  to: "device-token",
  platform: "android",
  title: "Garnet",
  body: "Something new in Garnet",
  data: { id: "n1", href: "/inbox", group: "messages", category: "chat", garnet: true },
  quiet: false,
  ...over,
});

/** Google's token and send endpoints, recording what they were sent. */
function google(sendStatus = 200, sendBody: unknown = { name: "projects/x/messages/1" }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.includes("oauth2"))
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: "at-1", expires_in: 3600 }), { status: 200 }),
      );
    return Promise.resolve(new Response(JSON.stringify(sendBody), { status: sendStatus }));
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe("FCM delivery (P-101)", () => {
  it("signs its token request with the service account's key", () => {
    const jwt = signedAssertion(account, 1_800_000_000);
    const [h = "", c = "", sig = ""] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(c, "base64url").toString()) as Record<string, unknown>;
    expect(claims).toMatchObject({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      exp: 1_800_003_600,
    });
    const verify = createVerify("RSA-SHA256");
    verify.update(`${h}.${c}`);
    expect(verify.verify(publicKey, Buffer.from(sig, "base64url"))).toBe(true);
  });

  it("sends generic text and an opaque id, nothing else, to the one device", async () => {
    const { calls, fetchImpl } = google();
    const sender = new FcmPushSender(account, fetchImpl);
    expect(await sender.send(payload())).toEqual({ ok: true });
    expect(await sender.send(payload())).toEqual({ ok: true });
    // One access token, reused.
    expect(calls.filter((c) => c.url.includes("oauth2"))).toHaveLength(1);
    const sent = calls.find((c) => c.url.includes("fcm.googleapis.com"));
    expect(sent?.url).toBe("https://fcm.googleapis.com/v1/projects/garnet-test/messages:send");
    expect((sent?.init.headers as Record<string, string>)["authorization"]).toBe("Bearer at-1");
    const body = JSON.parse(sent?.init.body as string) as {
      message: { token: string; notification: unknown; data: Record<string, string> };
    };
    expect(body.message.token).toBe("device-token");
    expect(body.message.notification).toEqual({ title: "Garnet", body: "Something new in Garnet" });
    expect(Object.keys(body.message.data).sort()).toEqual([
      "category",
      "garnet",
      "group",
      "href",
      "id",
    ]);
  });

  it("uses the silent channel in quiet hours", () => {
    const quiet = fcmMessage(payload({ quiet: true })) as {
      message: { android: { priority: string; notification: { channel_id: string } } };
    };
    expect(quiet.message.android).toMatchObject({
      priority: "NORMAL",
      notification: { channel_id: "quiet" },
    });
  });

  it("forgets a token the phone no longer has", async () => {
    const { fetchImpl } = google(404, {
      error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] },
    });
    expect(await new FcmPushSender(account, fetchImpl).send(payload())).toEqual({
      ok: false,
      unregistered: true,
    });
  });

  it("never sends an iPhone's token through FCM", async () => {
    const { calls, fetchImpl } = google();
    expect(await new FcmPushSender(account, fetchImpl).send(payload({ platform: "ios" }))).toEqual({
      ok: false,
      error: "platform_not_supported",
    });
    expect(calls).toEqual([]);
  });

  it("reads the service account from base64, and refuses an incomplete one", () => {
    const b64 = Buffer.from(JSON.stringify(account)).toString("base64");
    expect(readServiceAccount({ GARNET_FCM_SERVICE_ACCOUNT_JSON: b64 })).toEqual(account);
    expect(readServiceAccount({})).toBeNull();
    const bad = Buffer.from(JSON.stringify({ project_id: "x" })).toString("base64");
    expect(() => readServiceAccount({ GARNET_FCM_SERVICE_ACCOUNT_JSON: bad })).toThrow();
  });
});
