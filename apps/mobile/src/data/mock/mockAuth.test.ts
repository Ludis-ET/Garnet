import { Temporal } from "temporal-polyfill";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_RESET_TOKENS } from "@/data/fixtures/demoAuth";
import { DEMO_LOCK_SECONDS, DEMO_MAX_ATTEMPTS } from "./mockAuth";
import { createMockRepositories } from "./mockRepositories";
import { MockServiceError, MockStore } from "./MockStore";

function setup() {
  let clock = Temporal.Instant.from("2026-10-21T10:00:00Z");
  const store = new MockStore({ latencyMs: 0 });
  const repos = createMockRepositories(store, () => clock);
  const advance = (seconds: number) => {
    clock = clock.add({ seconds });
  };
  return { store, auth: repos.auth, advance };
}

describe("mock auth (AUTH-01 to AUTH-08)", () => {
  it("starts signed out", async () => {
    const { auth } = setup();
    expect(await auth.status()).toEqual({ kind: "signedOut" });
  });

  it("signs in the demo account and normalises the email", async () => {
    const { auth } = setup();
    const result = await auth.signIn({
      email: ` ${DEMO_EMAIL.toUpperCase()} `,
      password: DEMO_PASSWORD,
      keepSignedIn: true,
    });
    expect(result).toEqual({ ok: true, needsVerification: false });
    expect(await auth.status()).toEqual({ kind: "signedIn", displayName: "Selam" });
  });

  it("answers a wrong email and a wrong password identically (never says which)", async () => {
    const { auth } = setup();
    const wrongEmail = await auth.signIn({
      email: "nobody@example.test",
      password: DEMO_PASSWORD,
      keepSignedIn: false,
    });
    const wrongPassword = await auth.signIn({
      email: DEMO_EMAIL,
      password: "not the password",
      keepSignedIn: false,
    });
    expect(wrongEmail).toEqual({ ok: false, reason: "mismatch" });
    expect(wrongPassword).toEqual(wrongEmail);
  });

  it("backs off after repeated failures, then lets the person try again (no permanent lockout)", async () => {
    const { auth, advance } = setup();
    let last;
    for (let i = 0; i < DEMO_MAX_ATTEMPTS; i++) {
      last = await auth.signIn({ email: DEMO_EMAIL, password: "wrong", keepSignedIn: false });
    }
    expect(last).toEqual({
      ok: false,
      reason: "rate-limited",
      retryAfterSeconds: DEMO_LOCK_SECONDS,
    });
    // Even the right password waits during the back-off.
    expect(
      await auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: false }),
    ).toMatchObject({
      reason: "rate-limited",
    });
    advance(DEMO_LOCK_SECONDS + 1);
    expect(
      await auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: false }),
    ).toEqual({
      ok: true,
      needsVerification: false,
    });
  });

  it("creates an account that must verify, exposing only a masked email", async () => {
    const { auth } = setup();
    const result = await auth.createAccount({
      displayName: " Noah ",
      email: "Noah@Example.test",
      password: "a long passphrase",
    });
    expect(result).toEqual({ ok: true, maskedEmail: "n***@example.test" });
    const status = await auth.status();
    expect(status).toEqual({
      kind: "verifying",
      maskedEmail: "n***@example.test",
      verified: false,
    });
    expect(JSON.stringify(status)).not.toContain("noah@");
  });

  it("answers an existing email with neutral 'may already exist' (no account confirmation)", async () => {
    const { auth } = setup();
    expect(
      await auth.createAccount({
        displayName: "X",
        email: DEMO_EMAIL,
        password: "a long passphrase",
      }),
    ).toEqual({
      ok: false,
      reason: "may-already-exist",
    });
  });

  it("verifies through the demo link, or reports an expired link", async () => {
    const { auth, store } = setup();
    await auth.createAccount({
      displayName: "Noah",
      email: "noah@example.test",
      password: "a long passphrase",
    });
    store.update((s) => ({ ...s, auth: { ...s.auth, nextVerificationLink: "expired" } }));
    expect(await auth.openVerificationLink()).toEqual({ ok: false, reason: "expired" });
    await auth.resendVerification();
    expect(await auth.openVerificationLink()).toEqual({ ok: true });
    expect(await auth.status()).toMatchObject({ kind: "verifying", verified: true });
    await auth.finishVerification();
    expect(await auth.status()).toEqual({ kind: "signedIn", displayName: "Noah" });
  });

  it("an unverified account signs in to the verify step, not the app", async () => {
    const { auth } = setup();
    await auth.createAccount({
      displayName: "Noah",
      email: "noah@example.test",
      password: "a long passphrase",
    });
    await auth.cancelVerification();
    expect(
      await auth.signIn({
        email: "noah@example.test",
        password: "a long passphrase",
        keepSignedIn: false,
      }),
    ).toEqual({
      ok: true,
      needsVerification: true,
    });
  });

  it("treats every reset request the same, whether or not the account exists", async () => {
    const { auth, store } = setup();
    const before = JSON.stringify(store.read().auth);
    await expect(auth.requestPasswordReset(DEMO_EMAIL)).resolves.toBeUndefined();
    await expect(auth.requestPasswordReset("nobody@example.test")).resolves.toBeUndefined();
    expect(JSON.stringify(store.read().auth)).toBe(before);
  });

  it("reports each reset link state and makes a used link single-use", async () => {
    const { auth } = setup();
    expect(await auth.checkResetLink(DEMO_RESET_TOKENS.valid)).toBe("valid");
    expect(await auth.checkResetLink(DEMO_RESET_TOKENS.expired)).toBe("expired");
    expect(await auth.checkResetLink(DEMO_RESET_TOKENS.used)).toBe("used");
    expect(await auth.checkResetLink(DEMO_RESET_TOKENS.invalid)).toBe("invalid");
    expect(await auth.resetPassword(DEMO_RESET_TOKENS.valid, "a brand new passphrase")).toEqual({
      ok: true,
    });
    expect(await auth.resetPassword(DEMO_RESET_TOKENS.valid, "again and again")).toEqual({
      ok: false,
      reason: "used",
    });
    expect(
      await auth.signIn({
        email: DEMO_EMAIL,
        password: "a brand new passphrase",
        keepSignedIn: false,
      }),
    ).toMatchObject({
      ok: true,
    });
  });

  it("a password reset signs out the current session and accepts the new password (ADR-0006, proposed)", async () => {
    const { auth } = setup();
    await auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: true });
    expect((await auth.status()).kind).toBe("signedIn");
    await auth.resetPassword(DEMO_RESET_TOKENS.valid, "a brand new passphrase");
    expect(await auth.status()).toEqual({ kind: "signedOut" });
    expect(
      await auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: false }),
    ).toEqual({ ok: false, reason: "mismatch" });
    expect(
      await auth.signIn({
        email: DEMO_EMAIL,
        password: "a brand new passphrase",
        keepSignedIn: false,
      }),
    ).toEqual({ ok: true, needsVerification: false });
  });

  it("signs out, and fails recoverably when offline without changing state", async () => {
    const { auth, store } = setup();
    await auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: false });
    store.configure({ offline: true });
    await expect(auth.signOut()).rejects.toBeInstanceOf(MockServiceError);
    store.configure({ offline: false });
    expect(await auth.status()).toMatchObject({ kind: "signedIn" });
    await auth.signOut();
    expect(await auth.status()).toEqual({ kind: "signedOut" });
  });
});
