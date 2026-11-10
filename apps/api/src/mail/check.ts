/**
 * Checks the email settings on the server (P-96). Run it from the API's folder on the host:
 *
 *   node dist/mail-check.mjs you@example.com
 *
 * It reads .env, logs in to the mail server, sends one test email to the address given, and says
 * what went wrong if anything did, in the server's own words (this is your terminal, not a log).
 * It also counts the account emails still waiting in the outbox and their last error. It prints
 * no password and changes nothing.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { loadEnvFile } from "./env-file";
import { createSmtpSender } from "./smtp";

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function describeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const user = u.username === "" ? "(no login)" : decodeURIComponent(u.username);
    return `${u.protocol}//${user}@${u.hostname}:${u.port === "" ? "(default port)" : u.port}`;
  } catch {
    return "(not a valid URL)";
  }
}

async function main(): Promise<number> {
  const envFile = resolve(process.cwd(), ".env");
  if (existsSync(envFile)) loadEnvFile(envFile);
  const to = process.argv[2];
  const smtpUrl = process.env["GARNET_SMTP_URL"];
  const from = process.env["GARNET_MAIL_FROM"];
  if (smtpUrl === undefined || from === undefined) {
    say("GARNET_SMTP_URL and GARNET_MAIL_FROM must be set in .env.");
    return 1;
  }
  say(`Mail server: ${describeUrl(smtpUrl)}`);
  say(`From:        ${from}`);

  const sender = createSmtpSender(smtpUrl, from);
  const login = await sender.verify();
  if (login !== null) {
    say(`✗ Can't log in to the mail server: ${login.code} (${login.message})`);
    say(
      HINTS[login.code.split(" ")[0] ?? ""] ??
        "Check the host, port and password in GARNET_SMTP_URL.",
    );
  } else say("✓ Logged in to the mail server.");

  if (to !== undefined && login === null) {
    try {
      await sender.send({
        to,
        kind: "exists",
        subject: "Garnet email check",
        text: "If you can read this, Garnet can send email from this server.",
        html: "<p>If you can read this, Garnet can send email from this server.</p>",
      });
      say(`✓ Test email handed to the mail server for ${to}. If it doesn't arrive, look in`);
      say("  spam, and check SPF, DKIM and DMARC in cPanel → Email Deliverability.");
    } catch (error) {
      const e = error as { code?: unknown; responseCode?: unknown; response?: unknown };
      const code = typeof e.code === "string" ? e.code : "error";
      const reply = typeof e.responseCode === "number" ? ` ${String(e.responseCode)}` : "";
      say(`✗ Sending failed: ${code}${reply}`);
      if (typeof e.response === "string") say(`  The server said: ${e.response}`);
    }
  } else if (to === undefined) {
    say("(Give an address to send a test email: node dist/mail-check.mjs you@example.com)");
  }

  const dbUrl = process.env["GARNET_API_DATABASE_URL"];
  if (dbUrl !== undefined) {
    const client = new pg.Client({ connectionString: dbUrl });
    try {
      await client.connect();
      const { rows } = await client.query<{ kind: string; n: number; last_error: string | null }>(
        `select kind, count(*)::int as n, max(last_error) as last_error
         from mail_outbox group by kind order by kind`,
      );
      if (rows.length === 0) say("✓ No account emails waiting in the outbox.");
      for (const r of rows)
        say(
          `… ${String(r.n)} "${r.kind}" email(s) waiting; last error: ${r.last_error ?? "none yet"}`,
        );
    } catch {
      say("(Couldn't read the outbox: is migration 0014 applied?)");
    } finally {
      await client.end().catch(() => undefined);
    }
  }
  return login === null ? 0 : 1;
}

const HINTS: Record<string, string> = {
  EAUTH:
    "The username or password is wrong. The username is the full address (noreply%40garnet.lunafh.com in the URL).",
  ECONNECTION:
    "The server couldn't be reached on that port. On cPanel hosts outgoing mail is often only allowed to the host's own mail server: try its hostname with port 465 (smtps://) or 587 (smtp://).",
  ETIMEDOUT:
    "No answer from the mail server. The port may be blocked by the host's firewall (try 465 or 587, or ask the host to allow it).",
  ESOCKET:
    "The connection was refused or its encryption failed. smtps:// goes with port 465, smtp:// with 587; the host name must match its certificate. On cPanel hosts outgoing mail is often only allowed to the host's own mail server.",
  EDNS: "The mail host name doesn't resolve. Use the server name shown in cPanel → Email Accounts → Connect Devices.",
};

void main().then(
  (code) => {
    process.exit(code);
  },
  (error: unknown) => {
    say(`✗ ${String(error)}`);
    process.exit(1);
  },
);
