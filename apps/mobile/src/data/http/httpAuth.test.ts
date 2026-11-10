import { TERMS_VERSION } from "@garnet/contracts";
import type { GarnetAuthClient } from "./authClient";
import type { ApiClient } from "./client";
import { createHttpAuth } from "./httpAuth";

const mockLocal = new Map<string, string>();
jest.mock("./localState", () => ({
  readLocal: (key: string) => mockLocal.get(key) ?? null,
  writeLocal: (key: string, value: string) => {
    mockLocal.set(key, value);
  },
  clearLocal: (...keys: string[]) => {
    for (const k of keys) mockLocal.delete(k);
    return Promise.resolve();
  },
  clearAllAuthSessions: () => {
    mockLocal.clear();
    return Promise.resolve();
  },
}));

const getSession = jest.fn();
const client = { getSession } as unknown as GarnetAuthClient;
const auth = createHttpAuth(client, "http://127.0.0.1:3000", {} as ApiClient);

const user = (extra: Record<string, unknown> = {}) => ({
  data: {
    user: {
      name: "Ruby",
      emailVerified: true,
      birthDate: "1998-04-02",
      termsVersion: "2026-10-01",
      ...extra,
    },
    session: { id: "s" },
  },
  error: null,
});

beforeEach(() => {
  mockLocal.clear();
  getSession.mockReset();
});

describe("auth status over the API", () => {
  it("is an error, not 'signed out', when the server can't be reached (A3)", async () => {
    mockLocal.set("hadSession", "yes");
    getSession.mockRejectedValue(new TypeError("Network request failed"));
    await expect(auth.status()).rejects.toThrow();
    // Nothing about this phone's session was forgotten.
    expect(mockLocal.get("hadSession")).toBe("yes");
  });

  it("is an error when the server fails (5xx)", async () => {
    getSession.mockResolvedValue({ data: null, error: { status: 503 } });
    await expect(auth.status()).rejects.toThrow();
  });

  it("says 'signed out for privacy' for a lost session, and keeps saying it (A4)", async () => {
    mockLocal.set("hadSession", "yes");
    getSession.mockResolvedValue({ data: null, error: null });
    expect(await auth.status()).toEqual({ kind: "expired" });
    expect(await auth.status()).toEqual({ kind: "expired" });
  });

  it("is signed out when this phone never had a session", async () => {
    getSession.mockResolvedValue({ data: null, error: { status: 401 } });
    expect(await auth.status()).toEqual({ kind: "signedOut" });
  });

  it("is registering until the birthday and terms are in, then signed in", async () => {
    getSession.mockResolvedValue(user({ birthDate: null }));
    expect(await auth.status()).toMatchObject({ kind: "registering", displayName: "Ruby" });
    expect(mockLocal.get("hadSession")).toBe("yes");
    getSession.mockResolvedValue(user({ termsVersion: TERMS_VERSION }));
    expect(await auth.status()).toEqual({ kind: "signedIn", displayName: "Ruby" });
  });

  it("a pending email sign-up shows as verifying", async () => {
    mockLocal.set("pendingEmail", "ruby@example.com");
    expect(await auth.status()).toMatchObject({ kind: "verifying", verified: false });
  });
});
