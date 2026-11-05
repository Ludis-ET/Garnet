import { Temporal } from "temporal-polyfill";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/data/fixtures/demoAuth";
import { DEMO_INVITE_CODES } from "@/data/fixtures/demoPairing";
import { createMockRepositories } from "./mockRepositories";
import { MockStore } from "./MockStore";

/** P-18 (proposed) is what the mock uses: 24 hours, single use, one answer for every failure. */
async function signedIn() {
  let clock = Temporal.Instant.from("2026-10-22T10:00:00Z");
  const store = new MockStore({ latencyMs: 0 });
  const repos = createMockRepositories(
    store,
    () => clock,
    () => 0.42,
  );
  await repos.auth.signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD, keepSignedIn: true });
  const advance = (hours: number) => {
    clock = clock.add({ hours });
  };
  return { store, pairing: repos.pairing, auth: repos.auth, advance };
}

describe("mock pairing (PAIR-01 to PAIR-07)", () => {
  it("is unpaired before sign-in and after it", async () => {
    const store = new MockStore({ latencyMs: 0 });
    const repos = createMockRepositories(store);
    expect(await repos.pairing.status()).toEqual({ me: "", kind: "unpaired" });
    const { pairing } = await signedIn();
    expect(await pairing.status()).toEqual({ me: "Selam", kind: "unpaired" });
  });

  it("creates an invitation that expires after 24 hours, and a new one replaces it", async () => {
    const { pairing, advance } = await signedIn();
    const first = await pairing.createInvite();
    expect(first.expiresAt).toBe("2026-10-23T10:00:00Z");
    expect(await pairing.status()).toMatchObject({
      kind: "inviting",
      code: first.code,
      expired: false,
    });
    advance(24);
    expect(await pairing.status()).toMatchObject({ kind: "inviting", expired: true });
    const second = await pairing.createInvite();
    expect(await pairing.status()).toMatchObject({ code: second.code, expired: false });
  });

  it("revokes an invitation", async () => {
    const { pairing } = await signedIn();
    await pairing.createInvite();
    await pairing.revokeInvite();
    expect((await pairing.status()).kind).toBe("unpaired");
  });

  it("answers unknown, used and expired codes identically and changes nothing (P-18)", async () => {
    const { pairing } = await signedIn();
    const answers = await Promise.all(
      [DEMO_INVITE_CODES.expired, DEMO_INVITE_CODES.used, "ZZZZ9999", "K7QM"].map((c) =>
        pairing.checkCode(c),
      ),
    );
    for (const answer of answers) expect(answer).toEqual({ ok: false });
    expect((await pairing.status()).kind).toBe("unpaired");
  });

  it("reviews a valid code however it was typed, without exposing the code again", async () => {
    const { pairing } = await signedIn();
    expect(await pairing.checkCode(" k7qm-4xpv ")).toEqual({ ok: true, inviterName: "Noah" });
    const status = await pairing.status();
    expect(status).toEqual({ me: "Selam", kind: "reviewing", inviterName: "Noah" });
    expect(JSON.stringify(status)).not.toContain(DEMO_INVITE_CODES.valid);
  });

  it("accepts once: the code is spent and the person is paired", async () => {
    const { pairing } = await signedIn();
    await pairing.checkCode(DEMO_INVITE_CODES.valid);
    expect(await pairing.accept()).toEqual({ ok: true, partnerName: "Noah" });
    expect(await pairing.status()).toEqual({ me: "Selam", kind: "paired", partnerName: "Noah" });
    // A paired person can't start another pairing.
    expect(await pairing.checkCode(DEMO_INVITE_CODES.valid)).toEqual({ ok: false });
  });

  it("spends the code: someone else, unpaired, can't use it afterwards (single use, P-18)", async () => {
    const { pairing, store } = await signedIn();
    await pairing.checkCode(DEMO_INVITE_CODES.valid);
    await pairing.accept();
    store.update((s) => ({
      ...s,
      auth: {
        ...s.auth,
        accounts: [
          ...s.auth.accounts,
          {
            userId: "someone-else",
            displayName: "Someone",
            email: "someone@example.test",
            password: "a long passphrase",
            verified: true,
            providers: [],
            birthDate: "2000-01-15",
            termsVersion: "2026-11-04",
          },
        ],
        status: { kind: "signedIn", userId: "someone-else", keepSignedIn: false },
      },
    }));
    expect((await pairing.status()).kind).toBe("unpaired");
    expect(await pairing.checkCode(DEMO_INVITE_CODES.valid)).toEqual({ ok: false });
  });

  it("declining returns to the start without pairing", async () => {
    const { pairing } = await signedIn();
    await pairing.checkCode(DEMO_INVITE_CODES.valid);
    await pairing.decline();
    expect((await pairing.status()).kind).toBe("unpaired");
    expect(await pairing.accept()).toEqual({ ok: false });
  });

  it("fails acceptance the same way if the invitation stopped being valid while reviewing", async () => {
    const { pairing, store } = await signedIn();
    await pairing.checkCode(DEMO_INVITE_CODES.valid);
    store.update((s) => ({
      ...s,
      pairing: {
        ...s.pairing,
        incoming: {
          ...s.pairing.incoming,
          [DEMO_INVITE_CODES.valid]: { inviterName: "Noah", state: "expired" },
        },
      },
    }));
    expect(await pairing.accept()).toEqual({ ok: false });
    expect((await pairing.status()).kind).toBe("unpaired");
  });
});
