/**
 * Account emails always go out (P-96, production-fix-plan A10): written to the outbox first,
 * sent by the worker, retried with back-off when the mail server fails, dropped only when the
 * link inside would have expired or the server refuses the address for good, and never sent
 * twice. The templates escape what comes from people and carry the https opener link.
 */
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDatabase } from "@garnet/db/testing";
import { Kysely, PostgresDialect } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../src/db/database";
import { parseEnvLine } from "../src/mail/env-file";
import { createMailOutbox, type MailOutbox } from "../src/mail/outbox";
import {
  isPermanentMailFailure,
  mailErrorCode,
  type MailSender,
  type OutgoingMail,
} from "../src/mail/smtp";
import { renderMail } from "../src/mail/templates";
import {
  createMailWorker,
  createQueuedMailer,
  retryDelayMs,
  type MailLog,
} from "../src/mail/worker";
import { pglitePool } from "./pglite-pool";

let pglite: PGlite;
let db: Kysely<Database>;
let outbox: MailOutbox;

beforeAll(async () => {
  pglite = await createMigratedDatabase();
  db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: pglitePool(pglite) }) });
  outbox = createMailOutbox(db);
});
afterAll(async () => {
  await db.destroy();
});
beforeEach(async () => {
  await pglite.query("delete from mail_outbox");
});

/** A mail server we control: it can fail the next tries, or refuse an address for good. */
function fakeServer() {
  const sent: OutgoingMail[] = [];
  const failures: Error[] = [];
  const sender: MailSender = {
    send: (mail) => {
      const failure = failures.shift();
      if (failure !== undefined) return Promise.reject(failure);
      sent.push(mail);
      return Promise.resolve();
    },
    verify: () => Promise.resolve(null),
  };
  return { sender, sent, failures };
}

function setup(start = new Date("2026-11-10T12:00:00Z")) {
  let clock = start;
  const server = fakeServer();
  const events: { event: string; detail: Record<string, unknown> }[] = [];
  const log: MailLog = (_level, event, detail) => {
    events.push({ event, detail });
  };
  const worker = createMailWorker({
    outbox,
    sender: server.sender,
    render: (job) => renderMail(job, "https://garnet.example"),
    log,
    now: () => clock,
  });
  const mailer = createQueuedMailer(outbox, { kick: () => undefined }, () => clock);
  return {
    server,
    events,
    worker,
    mailer,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
  };
}

const waiting = async () =>
  (await pglite.query<{ n: number }>("select count(*)::int as n from mail_outbox")).rows[0]?.n;

describe("the account-email outbox (P-96)", () => {
  it("sends a confirmation email and forgets the address and token once sent", async () => {
    const t = setup();
    await t.mailer.verifyEmail("ruby@example.com", "Ruby", "tok-1", 24);
    expect(await waiting()).toBe(1);
    await t.worker.runOnce();
    expect(t.server.sent).toHaveLength(1);
    const [mail] = t.server.sent;
    expect(mail?.to).toBe("ruby@example.com");
    expect(mail?.subject).toBe("Confirm your email for Garnet");
    expect(mail?.html).toContain("https://garnet.example/v1/open/verify-email?token=tok-1");
    expect(mail?.text).toContain("https://garnet.example/v1/open/verify-email?token=tok-1");
    expect(await waiting()).toBe(0);
    // The log names the kind of email, never the address.
    expect(JSON.stringify(t.events)).not.toContain("ruby@example.com");
    expect(t.events.map((e) => e.event)).toEqual(["mail_sent"]);
  });

  it("keeps trying while the mail server is down, then delivers", async () => {
    const t = setup();
    t.server.failures.push(
      Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }),
      Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535 }),
    );
    await t.mailer.resetPassword("ruby@example.com", "tok-r", 60);

    await t.worker.runOnce();
    expect(t.server.sent).toHaveLength(0);
    // Not due again yet.
    await t.worker.runOnce();
    expect(t.server.sent).toHaveLength(0);

    t.advance(retryDelayMs(1));
    await t.worker.runOnce();
    expect(t.server.sent).toHaveLength(0);

    t.advance(retryDelayMs(2));
    await t.worker.runOnce();
    expect(t.server.sent.map((m) => m.subject)).toEqual(["Reset your Garnet password"]);
    expect(t.events.map((e) => [e.event, e.detail["error"] ?? null])).toEqual([
      ["mail_retry", "ETIMEDOUT"],
      ["mail_retry", "EAUTH 535"],
      ["mail_sent", null],
    ]);
    expect(await waiting()).toBe(0);
  });

  it("gives up only when the link inside would have expired", async () => {
    const t = setup();
    for (let i = 0; i < 20; i++)
      t.server.failures.push(Object.assign(new Error("down"), { code: "ECONNECTION" }));
    await t.mailer.resetPassword("ruby@example.com", "tok-r", 5);
    for (let i = 0; i < 10 && (await waiting()) === 1; i++) {
      await t.worker.runOnce();
      t.advance(retryDelayMs(i + 1));
    }
    expect(await waiting()).toBe(0);
    expect(t.server.sent).toHaveLength(0);
    expect(t.events.at(-1)?.event).toBe("mail_expired");
  });

  it("drops an address the server refuses for good, and only that", async () => {
    const t = setup();
    t.server.failures.push(
      Object.assign(new Error("no such user"), { code: "EENVELOPE", responseCode: 550 }),
    );
    await t.mailer.existingAccount("gone@example.com");
    await t.mailer.existingAccount("ruby@example.com");
    await t.worker.runOnce();
    expect(t.server.sent.map((m) => m.to)).toEqual(["ruby@example.com"]);
    expect(t.events.map((e) => e.event)).toEqual(["mail_rejected", "mail_sent"]);
    expect(await waiting()).toBe(0);
  });

  it("survives a restart: what was asked for before is sent after", async () => {
    const before = setup();
    await before.mailer.confirmEmailChange("ruby@example.com", "new@example.com", "tok-c", 24);
    // The API stopped before sending; a new process starts its own worker.
    const after = setup();
    await after.worker.runOnce();
    expect(after.server.sent.map((m) => m.subject)).toEqual(["Change your Garnet email?"]);
  });

  it("never sends the same email twice, even with two workers at once", async () => {
    const one = setup();
    const two = setup();
    for (let i = 0; i < 12; i++) await one.mailer.existingAccount(`p${String(i)}@example.com`);
    await Promise.all([one.worker.runOnce(), two.worker.runOnce()]);
    const all = [...one.server.sent, ...two.server.sent].map((m) => m.to).sort();
    expect(all).toHaveLength(12);
    expect(new Set(all).size).toBe(12);
  });
});

describe("what the emails say", () => {
  it("escapes a display name, and keeps it on one line", () => {
    const mail = renderMail(
      { kind: "verify", name: '<img src=x onerror="alert(1)">\r\nBcc: x', token: "t", hours: 24 },
      null,
    );
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
    expect(mail.text).not.toMatch(/\r|\nBcc/);
    expect(mail.html).toContain("garnet://verify-email?token=t");
  });

  it("loads nothing from anywhere: no images, trackers or remote styles", () => {
    for (const job of [
      { kind: "verify", name: "Ruby", token: "t", hours: 24 },
      { kind: "reset", token: "t", minutes: 60 },
      { kind: "exists" },
      { kind: "change", newEmail: "n@example.com", token: "t", hours: 24 },
    ] as const) {
      const { html, text, subject } = renderMail(job, "https://garnet.example");
      expect(html).not.toMatch(/<img|<link|<script|url\(/i);
      expect(text.length).toBeGreaterThan(40);
      expect(subject).not.toBe("");
    }
  });
});

describe("mail errors", () => {
  it("are logged as codes, never with the server's text", () => {
    const e = Object.assign(new Error("550 <ruby@example.com>: no such user"), {
      code: "EENVELOPE",
      responseCode: 550,
      response: "550 <ruby@example.com>: no such user",
    });
    expect(mailErrorCode(e)).toBe("EENVELOPE 550");
    expect(isPermanentMailFailure(e)).toBe(true);
    expect(isPermanentMailFailure({ code: "EAUTH", responseCode: 535 })).toBe(false);
    expect(isPermanentMailFailure({ code: "EENVELOPE", responseCode: 451 })).toBe(false);
  });

  it("back off up to half an hour", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 50].map(retryDelayMs)).toEqual([
      30_000, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000, 1_800_000,
    ]);
  });
});

describe("the .env reader for older Node 20", () => {
  it("reads quoted values, and skips comments and junk", () => {
    expect(parseEnvLine('GARNET_MAIL_FROM="Garnet <noreply@x.com>"')).toEqual([
      "GARNET_MAIL_FROM",
      "Garnet <noreply@x.com>",
    ]);
    expect(parseEnvLine("A=b=c")).toEqual(["A", "b=c"]);
    expect(parseEnvLine("# A=b")).toBeNull();
    expect(parseEnvLine("not a pair")).toBeNull();
  });
});
