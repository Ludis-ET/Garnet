import type { MailOutbox } from "./outbox";
import { isPermanentMailFailure, mailErrorCode, type MailSender } from "./smtp";
import { mailLifetimeMs, type MailJob, type MailKind, type RenderedMail } from "./templates";
import type { Mailer } from "../auth/mailer";

/** What the worker logs: a fixed event and address-free details only (§6 logging rules). */
export type MailLog = (
  level: "info" | "warn" | "error",
  event: "mail_sent" | "mail_retry" | "mail_rejected" | "mail_expired" | "mail_worker_failed",
  detail: { kind?: MailKind; attempt?: number; error?: string },
) => void;

/** Waits between tries: 30 s, 1, 2, 5, 10, 20 min, then every 30 min until the link expires. */
const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000] as const;

export function retryDelayMs(attempt: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempt, 1), BACKOFF_MS.length) - 1] ?? 1_800_000;
}

export interface MailWorkerOptions {
  outbox: MailOutbox;
  sender: MailSender;
  render: (job: MailJob) => RenderedMail;
  log: MailLog;
  now?: () => Date;
  /** How often waiting emails are looked at, besides right after one is asked for. */
  intervalMs?: number;
  batch?: number;
}

export interface MailWorker {
  /** Look now (an email was just asked for). Never throws. */
  kick(): void;
  /** One pass over what is due; resolves when it is done. */
  runOnce(): Promise<void>;
  start(): void;
  stop(): Promise<void>;
}

/** A claim outlasts the slowest try (connection, greeting and socket timeouts). */
const CLAIM_MS = 120_000;

export function createMailWorker(o: MailWorkerOptions): MailWorker {
  const now = o.now ?? (() => new Date());
  const batch = o.batch ?? 10;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running: Promise<void> | null = null;
  let again = false;
  /** Read through a function: the flag changes while a pass awaits. */
  const wanted = () => again;

  async function pass(): Promise<void> {
    await o.outbox.purge(now());
    for (;;) {
      const due = await o.outbox.claim(now(), batch, CLAIM_MS);
      if (due.length === 0) return;
      for (const mail of due) {
        try {
          await o.sender.send({ ...o.render(mail.job), to: mail.to, kind: mail.job.kind });
          await o.outbox.done(mail.id);
          o.log("info", "mail_sent", { kind: mail.job.kind, attempt: mail.attempt });
        } catch (error) {
          const code = mailErrorCode(error);
          if (isPermanentMailFailure(error)) {
            await o.outbox.done(mail.id);
            o.log("warn", "mail_rejected", { kind: mail.job.kind, error: code });
            continue;
          }
          const retryAt = new Date(now().getTime() + retryDelayMs(mail.attempt));
          if (retryAt >= mail.expiresAt) {
            await o.outbox.done(mail.id);
            o.log("error", "mail_expired", {
              kind: mail.job.kind,
              attempt: mail.attempt,
              error: code,
            });
            continue;
          }
          await o.outbox.retry(mail.id, retryAt, code);
          o.log("warn", "mail_retry", { kind: mail.job.kind, attempt: mail.attempt, error: code });
        }
      }
      if (due.length < batch) return;
    }
  }

  function runOnce(): Promise<void> {
    if (running !== null) {
      // A pass is on; one more follows it, for whatever arrived meanwhile.
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        try {
          await pass();
        } catch (error) {
          // The database blinked: the emails stay queued for the next pass.
          o.log("error", "mail_worker_failed", { error: mailErrorCode(error) });
        }
      } while (wanted());
    })().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    kick() {
      void runOnce();
    },
    runOnce,
    start() {
      if (timer !== null) return;
      timer = setInterval(() => {
        void runOnce();
      }, o.intervalMs ?? 30_000);
      timer.unref();
      void runOnce();
    },
    async stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
      await running;
    },
  };
}

/**
 * The Mailer Better Auth calls (auth.ts): each email is written to the outbox, which survives a
 * restart, and the worker is told to send it now. Asking never waits on the mail server and never
 * fails because of it; the request only fails if the database does, so nothing is silently lost.
 */
export function createQueuedMailer(
  outbox: MailOutbox,
  worker: Pick<MailWorker, "kick">,
  now: () => Date = () => new Date(),
): Mailer {
  const queue = async (to: string, job: MailJob) => {
    await outbox.enqueue(to, job, new Date(now().getTime() + mailLifetimeMs(job)));
    worker.kick();
  };
  return {
    verifyEmail: (to, name, token, hours) => queue(to, { kind: "verify", name, token, hours }),
    resetPassword: (to, token, minutes) => queue(to, { kind: "reset", token, minutes }),
    existingAccount: (to) => queue(to, { kind: "exists" }),
    confirmEmailChange: (to, newEmail, token, hours) =>
      queue(to, { kind: "change", newEmail, token, hours }),
  };
}
