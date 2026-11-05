import * as WebBrowser from "expo-web-browser";
import type { GarnetAuthClient } from "./authClient";
import { connectProvider, continueWithProvider } from "./social";

jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
}));
jest.mock("expo-crypto", () => {
  const { createHash } = jest.requireActual<typeof import("node:crypto")>("node:crypto");
  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    getRandomBytes: (n: number) => new Uint8Array(n).fill(7),
    digest: (_: string, data: Uint8Array) => {
      const hash = createHash("sha256").update(data).digest();
      return Promise.resolve(hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.length));
    },
  };
});

const BASE = "http://127.0.0.1:3000";
const open = jest.mocked(WebBrowser.openAuthSessionAsync);
const redeem = jest.fn();
const client = {
  $fetch: redeem,
  getCookie: () => Promise.resolve("better-auth.session_token=abc.sig"),
} as unknown as GarnetAuthClient;

function server(status: number, body: unknown = { url: "https://accounts.google.com/auth" }) {
  const fetchMock = jest.fn(() =>
    Promise.resolve({ status, json: () => Promise.resolve(body) } as Response),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function sent(fetchMock: jest.Mock): {
  url: string;
  init: RequestInit;
  body: Record<string, string>;
} {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(String(init.body)) as Record<string, string> };
}

beforeEach(() => {
  jest.clearAllMocks();
  redeem.mockResolvedValue({ error: null });
});

describe("continuing with Google in the browser (P-79)", () => {
  it("sends only the challenge, opens the provider through the proxy, and redeems with the verifier", async () => {
    const fetchMock = server(200);
    open.mockResolvedValue({ type: "success", url: "garnet://auth-callback?code=one-time" });
    expect(await continueWithProvider(client, BASE, "google")).toEqual({ ok: true });

    const { url, init, body } = sent(fetchMock);
    expect(url).toBe(`${BASE}/v1/auth/sign-in/social`);
    expect(init.credentials).toBe("omit");
    expect((init.headers as Record<string, string>)["x-garnet-client"]).toBe("app");
    const challenge = new URL(body["callbackURL"] ?? "").searchParams.get("challenge") ?? "";
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body["errorCallbackURL"]).toBe(`${BASE}/v1/auth/app-handoff/failed`);

    const [proxy, back] = open.mock.calls[0] ?? [];
    expect(proxy).toBe(
      `${BASE}/v1/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent("https://accounts.google.com/auth")}`,
    );
    expect(back).toBe("garnet://auth-callback");

    const [path, options] = redeem.mock.calls[0] as [string, { body: Record<string, string> }];
    expect(path).toBe("/app-handoff/redeem");
    expect(options.body["code"]).toBe("one-time");
    // The verifier hashes to the challenge sent first, and never left in the sign-in request.
    const verifier = options.body["verifier"] ?? "";
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(body)).not.toContain(verifier);
    const { createHash } = jest.requireActual<typeof import("node:crypto")>("node:crypto");
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(challenge);
  });

  it.each([
    ["the person closes the page", { type: "cancel" }, "cancelled"],
    [
      "the person says no",
      { type: "success", url: "garnet://auth-callback?error=cancelled" },
      "cancelled",
    ],
    [
      "the provider fails",
      { type: "success", url: "garnet://auth-callback?error=failed" },
      "failed",
    ],
    ["the link has no code", { type: "success", url: "garnet://auth-callback" }, "failed"],
  ] as const)("reports it when %s, and redeems nothing", async (_, result, reason) => {
    server(200);
    open.mockResolvedValue(result as never);
    expect(await continueWithProvider(client, BASE, "google")).toEqual({ ok: false, reason });
    expect(redeem).not.toHaveBeenCalled();
  });

  it("says unavailable when the server isn't set up, without opening anything", async () => {
    server(404);
    expect(await continueWithProvider(client, BASE, "google")).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(open).not.toHaveBeenCalled();
  });

  it("survives no connection and a bad answer", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
    expect(await continueWithProvider(client, BASE, "google")).toEqual({
      ok: false,
      reason: "failed",
    });
    server(200, { nothing: true });
    expect(await continueWithProvider(client, BASE, "google")).toEqual({
      ok: false,
      reason: "failed",
    });
  });

  it("fails if the code can't be redeemed", async () => {
    server(200);
    open.mockResolvedValue({ type: "success", url: "garnet://auth-callback?code=one-time" });
    redeem.mockResolvedValue({ error: { status: 400 } });
    expect(await continueWithProvider(client, BASE, "google")).toEqual({
      ok: false,
      reason: "failed",
    });
  });
});

describe("connecting Google to this account (P-80)", () => {
  it("sends the session, comes back to the linked page, and redeems nothing", async () => {
    const fetchMock = server(200);
    open.mockResolvedValue({ type: "success", url: "garnet://auth-callback?linked=1" });
    expect(await connectProvider(client, BASE, "google")).toEqual({ ok: true });
    const { url, init, body } = sent(fetchMock);
    expect(url).toBe(`${BASE}/v1/auth/link-social`);
    expect((init.headers as Record<string, string>)["cookie"]).toContain("session_token");
    expect(body["callbackURL"]).toBe(`${BASE}/v1/auth/app-handoff/linked`);
    expect(redeem).not.toHaveBeenCalled();
  });

  it.each([
    [403, undefined, "sign-in-again"],
    [404, undefined, "unavailable"],
    [200, "garnet://auth-callback?error=taken", "taken"],
    [200, "garnet://auth-callback?error=cancelled", "cancelled"],
    [200, "garnet://auth-callback?error=failed", "failed"],
  ] as const)("status %s, link %s: %s", async (status, link, reason) => {
    server(status);
    if (link !== undefined) open.mockResolvedValue({ type: "success", url: link });
    expect(await connectProvider(client, BASE, "google")).toEqual({ ok: false, reason });
  });
});
