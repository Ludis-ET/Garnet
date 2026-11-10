import { createTransport } from "nodemailer";
import type { MailKind, RenderedMail } from "./templates";

/** One email ready to go. */
export interface OutgoingMail extends RenderedMail {
  to: string;
  kind: MailKind;
}

export interface MailSender {
  send(mail: OutgoingMail): Promise<void>;
  /**
   * Connects and logs in without sending: null when it works, else the error code and the
   * connection's own message (host and port, never a recipient).
   */
  verify(): Promise<{ code: string; message: string } | null>;
}

/** No step with the mail server may hang a worker for long (P-96). */
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

/**
 * A short, address-free code for a mail failure, safe for logs: nodemailer's own code (EAUTH,
 * ECONNECTION, ETIMEDOUT, EENVELOPE…) and the server's reply code when there is one ("EAUTH 535").
 * Never the server's text, which can repeat the address.
 */
export function mailErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "unknown";
  const code = "code" in error && typeof error.code === "string" ? error.code : "error";
  const reply =
    "responseCode" in error && typeof error.responseCode === "number"
      ? ` ${String(error.responseCode)}`
      : "";
  return `${code}${reply}`.replace(/[^A-Za-z0-9_ -]/g, "").slice(0, 64);
}

/**
 * A failure that trying again won't fix: the server refused this recipient for good (a 5xx reply
 * to the address, e.g. "no such mailbox"). Login failures, timeouts and 4xx replies are retried:
 * they are the server's or the settings' problem, and may be fixed before the link expires.
 */
export function isPermanentMailFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : undefined;
  const reply = "responseCode" in error ? error.responseCode : undefined;
  return code === "EENVELOPE" && typeof reply === "number" && reply >= 550 && reply <= 553;
}

/**
 * Sends over SMTP (GARNET_SMTP_URL; on the host, the cPanel mailbox, e.g.
 * smtps://noreply%40garnet.lunafh.com:<password>@<mail host>:465). Each email is marked as sent
 * by a machine, so auto-responders don't answer it.
 */
export function createSmtpSender(smtpUrl: string, from: string): MailSender {
  const transport = createTransport({ url: smtpUrl, ...TIMEOUTS });
  return {
    async send(mail) {
      await transport.sendMail({
        from,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
      });
    },
    async verify() {
      try {
        await transport.verify();
        return null;
      } catch (error) {
        return {
          code: mailErrorCode(error),
          message: error instanceof Error ? error.message.slice(0, 200) : "",
        };
      }
    },
  };
}
