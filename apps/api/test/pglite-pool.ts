import type { PGlite } from "@electric-sql/pglite";
import type { PostgresPool, PostgresPoolClient, PostgresQueryResult } from "kysely";

const COMMANDS = ["INSERT", "UPDATE", "DELETE", "MERGE", "SELECT"] as const;
type Command = PostgresQueryResult<unknown>["command"];

function commandOf(sql: string): Command {
  const word = /^\s*(\w+)/.exec(sql)?.[1]?.toUpperCase();
  return COMMANDS.find((c) => c === word) ?? "SELECT";
}

/**
 * Lets Kysely's PostgresDialect run on PGlite in tests. PGlite is a single connection, so the
 * pool hands it out to one caller at a time (queued), which keeps transactions from
 * interleaving exactly as separate pooled connections would.
 */
export function pglitePool(db: PGlite): PostgresPool {
  let queue: Promise<void> = Promise.resolve();
  const connect = async (): Promise<PostgresPoolClient> => {
    let release: () => void = () => undefined;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = queue;
    queue = queue.then(() => turn);
    await previous;
    const client = {
      query: async (sql: string, parameters: readonly unknown[]) => {
        const r = await db.query(sql, [...parameters]);
        return {
          command: commandOf(sql),
          rowCount: r.affectedRows ?? r.rows.length,
          rows: r.rows,
        };
      },
      release,
    };
    // Kysely's client type also allows a cursor overload, which these tests never use.
    return client as unknown as PostgresPoolClient;
  };
  return { connect, end: () => Promise.resolve(), options: {} };
}
