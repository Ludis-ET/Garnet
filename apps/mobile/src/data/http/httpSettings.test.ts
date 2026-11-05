import { defaultSettingsDoc, settingsPatchSchema, TERMS_VERSION } from "@garnet/contracts";
import { defaultSettings, type UserSettings } from "@/domain/settings";
import type { GarnetAuthClient } from "./authClient";
import { ApiError, type ApiClient } from "./client";
import { createHttpSettings } from "./httpSettings";

jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
}));
jest.mock("expo-crypto", () => ({}));

const VIEW = {
  settings: defaultSettingsDoc(),
  account: {
    email: "ada@example.test",
    birthDate: "1999-04-20",
    termsVersion: TERMS_VERSION,
    termsAcceptedAt: "2026-11-04T10:00:00.000Z",
  },
  me: {
    name: "Ada",
    side: "ruby" as const,
    zone: "Europe/London",
    avatar: { kind: "initials" as const, swatch: 3 },
  },
  partner: { name: "Ben", side: "sapphire" as const, zone: "Africa/Addis_Ababa" },
};

function problem(code: string, issues?: { path: string[]; code: string }[]) {
  return new ApiError("problem", 400, {
    type: "x",
    title: "x",
    status: 400,
    code: code as never,
    ...(issues === undefined ? {} : { issues }),
  });
}

function setup() {
  const api = {
    get: jest.fn((_path: string) => Promise.resolve(VIEW as unknown)),
    post: jest.fn(),
    postNoContent: jest.fn(() => Promise.resolve()),
    patch: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    deleteWith: jest.fn(() => Promise.resolve({ ok: true })),
  };
  const auth = {
    changePassword: jest.fn(() => Promise.resolve({ error: null as { status: number } | null })),
    changeEmail: jest.fn(() => Promise.resolve({ error: null as { status: number } | null })),
    requestPasswordReset: jest.fn(() => Promise.resolve({ error: null })),
  };
  const repo = createHttpSettings(
    api as unknown as ApiClient,
    auth as unknown as GarnetAuthClient,
    "http://127.0.0.1:3000",
  );
  return { api, auth, repo };
}

describe("the app and the server agree on settings", () => {
  it("share one set of defaults", () => {
    const { export: _export, ...rest } = defaultSettings();
    expect(rest).toEqual(defaultSettingsDoc());
  });

  it("every setting a page can change is a patch the server accepts", () => {
    const d = defaultSettings();
    const { export: _export, ...settings } = d;
    for (const [key, value] of Object.entries(settings))
      expect(settingsPatchSchema.safeParse({ [key]: value }).success).toBe(true);
  });
});

describe("reading", () => {
  it("shapes the view for the pages, with data rights off until U-20 and U-23", async () => {
    const view = await setup().repo.get();
    expect(view).toMatchObject({
      email: "ada@example.test",
      birthDate: "1999-04-20",
      termsVersion: TERMS_VERSION,
      dataRights: false,
      me: { name: "Ada", side: "ruby", zone: "Europe/London" },
      partner: { name: "Ben", side: "sapphire" },
    });
    expect(view.settings.export).toEqual({ state: "none", readyAt: null });
  });

  it("copes with no partner yet", async () => {
    const { api, repo } = setup();
    api.get.mockResolvedValue({ ...VIEW, partner: null });
    expect((await repo.get()).partner).toMatchObject({ name: "", zone: "Europe/London" });
  });
});

describe("saving", () => {
  it("sends only what changed, never the export state", async () => {
    const { api, repo } = setup();
    await repo.update({
      sound: false,
      export: { state: "ready", readyAt: null },
    } satisfies Partial<UserSettings>);
    expect(api.patch).toHaveBeenCalledWith("/v1/me/settings", { sound: false });
  });
});

describe("the password", () => {
  it("ends other sessions through Better Auth's client, which keeps the new cookie", async () => {
    const { auth, repo } = setup();
    expect(await repo.changePassword({ current: "old", next: "new" })).toEqual({ ok: true });
    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: "old",
      newPassword: "new",
      revokeOtherSessions: true,
    });
  });

  it.each([
    [400, "wrong-password"],
    [429, "rate-limited"],
    [500, "failed"],
  ] as const)("answers %s as %s", async (status, reason) => {
    const { auth, repo } = setup();
    auth.changePassword.mockResolvedValue({ error: { status } });
    expect(await repo.changePassword({ current: "a", next: "b" })).toEqual({ ok: false, reason });
  });
});

describe("the ways in", () => {
  it("passes on the last-one answer, and asks for a recent sign-in when the API does", async () => {
    const { api, repo } = setup();
    api.deleteWith.mockResolvedValueOnce({ ok: false, reason: "last-one" } as never);
    expect(await repo.disconnect("google")).toEqual({ ok: false, reason: "last-one" });
    api.deleteWith.mockRejectedValueOnce(problem("recent_sign_in_required"));
    expect(await repo.disconnect("google")).toEqual({ ok: false, reason: "sign-in-again" });
    api.deleteWith.mockRejectedValueOnce(new ApiError("offline"));
    await expect(repo.disconnect("google")).rejects.toThrow();
  });

  it("emails a link to set a password to the person's own address", async () => {
    const { auth, repo } = setup();
    await repo.sendPasswordLink();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith({
      email: "ada@example.test",
      redirectTo: "garnet://reset-password",
    });
  });
});

describe("the email", () => {
  it("normalises the address and says when it's already theirs", async () => {
    const { auth, repo } = setup();
    expect(await repo.changeEmail(" ADA@example.test ")).toEqual({ ok: false, reason: "same" });
    expect(auth.changeEmail).not.toHaveBeenCalled();
    expect(await repo.changeEmail(" New@Example.test ")).toEqual({ ok: true });
    expect(auth.changeEmail).toHaveBeenCalledWith({ newEmail: "new@example.test" });
  });

  it.each([
    [403, "sign-in-again"],
    [429, "rate-limited"],
    [500, "failed"],
  ] as const)("answers %s as %s", async (status, reason) => {
    const { auth, repo } = setup();
    auth.changeEmail.mockResolvedValue({ error: { status } });
    expect(await repo.changeEmail("new@example.test")).toEqual({ ok: false, reason });
  });
});

describe("the birthday", () => {
  it("reports under 16 from the server's answer, and passes other failures on", async () => {
    const { api, repo } = setup();
    expect(await repo.changeBirthDate("1999-01-01")).toEqual({ ok: true });
    api.patch.mockRejectedValueOnce(
      problem("validation_failed", [{ path: ["birthDate"], code: "too_young" }]),
    );
    expect(await repo.changeBirthDate("2020-01-01")).toEqual({ ok: false, reason: "too-young" });
    api.patch.mockRejectedValueOnce(new ApiError("offline"));
    await expect(repo.changeBirthDate("1999-01-01")).rejects.toThrow();
  });
});

describe("what waits for U-20 and U-23 (phase B9)", () => {
  it("never pretends: export, ending the space and deleting the account refuse", async () => {
    const { repo } = setup();
    await expect(repo.prepareExport()).rejects.toThrow(/U-20/);
    await expect(repo.endSpace()).rejects.toThrow(/U-20/);
    await expect(repo.deleteAccount()).rejects.toThrow(/U-20/);
  });
});
