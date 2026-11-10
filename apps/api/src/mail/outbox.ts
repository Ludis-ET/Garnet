import { sql, type Kysely } from "kysely";
import { z } from "zod";
import type { Database } from "../db/database";
import type { MailJob } from "./templates";

/**
 * The account-email outbox (migration 0014, P-96). An email is written here when it is asked
 * for, and the worker (./worker.ts) sends it. Rows are claimed for a while before sending, so
 * two API processes (Passenger can run several) never send the same email twice.
 */
export interface QueuedMail {
  id: string;
  to: string;
  job: MailJob;
  /** This try's number, from 1. */
  attempt: number;
  expiresAt: Date;
}

export interface MailOutbox {
  /** Due at `now`: the same clock the worker claims by, never the database's own. */
  enqueue(to: string, job: MailJob, expiresAt: Date, now: Date): Promise<void>;
  /** Up to `limit` emails due now, claimed for `claimMs`. */
  claim(now: Date, limit: number, claimMs: number): Promise<QueuedMail[]>;
  /** Sent: the row, with the address and token in it, goes at once. */
  done(id: string): Promise<void>;
  /** Not sent this time: try again at `retryAt`. */
  retry(id: string, retryAt: Date, error: string): Promise<void>;
  /** Emails whose link has expired, and any whose payload can't be read, are removed. */
  purge(now: Date): Promise<number>;
}

const jobSchema: z.ZodType<MailJob> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("verify"),
    name: z.string(),
    token: z.string(),
    hours: z.number(),
  }),
  z.object({ kind: z.literal("reset"), token: z.string(), minutes: z.number() }),
  z.object({ kind: z.literal("exists") }),
  z.object({
    kind: z.literal("change"),
    newEmail: z.string(),
    token: z.string(),
    hours: z.number(),
  }),
]);

interface Row {
  id: string;
  recipient: string;
  kind: string;
  payload: unknown;
  attempts: number;
  expires_at: Date | string;
}

export function createMailOutbox(db: Kysely<Database>): MailOutbox {
  const remove = async (id: string) => {
    await sql`delete from mail_outbox where id = ${id}::uuid`.execute(db);
  };
  return {
    async enqueue(to, job, expiresAt, now) {
      const { kind, ...payload } = job;
      await sql`
        insert into mail_outbox (kind, recipient, payload, expires_at, next_attempt_at)
        values (${kind}, ${to}, ${JSON.stringify(payload)}::jsonb,
                ${expiresAt.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `.execute(db);
    },

    async claim(now, limit, claimMs) {
      const at = now.toISOString();
      const until = new Date(now.getTime() + claimMs).toISOString();
      const { rows } = await sql<Row>`
        update mail_outbox
        set locked_until = ${until}::timestamptz, attempts = attempts + 1
        where id in (
          select id from mail_outbox
          where next_attempt_at <= ${at}::timestamptz
            and (locked_until is null or locked_until <= ${at}::timestamptz)
            and expires_at > ${at}::timestamptz
          order by next_attempt_at
          limit ${limit}
          for update skip locked
        )
        returning id, recipient, kind, payload, attempts, expires_at
      `.execute(db);
      const claimed: QueuedMail[] = [];
      for (const row of rows) {
        const payload =
          typeof row.payload === "string" ? (JSON.parse(row.payload) as unknown) : row.payload;
        const job = jobSchema.safeParse({ ...(payload as object), kind: row.kind });
        if (!job.success) {
          // Unreadable (written by a different version): it can never be sent.
          await remove(row.id);
          continue;
        }
        claimed.push({
          id: row.id,
          to: row.recipient,
          job: job.data,
          attempt: row.attempts,
          expiresAt: new Date(row.expires_at),
        });
      }
      return claimed;
    },

    done: remove,

    async retry(id, retryAt, error) {
      await sql`
        update mail_outbox
        set next_attempt_at = ${retryAt.toISOString()}::timestamptz,
            locked_until = null,
            last_error = ${error.slice(0, 64)}
        where id = ${id}::uuid
      `.execute(db);
    },

    async purge(now) {
      const { rows } = await sql<{ id: string }>`
        delete from mail_outbox where expires_at <= ${now.toISOString()}::timestamptz returning id
      `.execute(db);
      return rows.length;
    },
  };
}
