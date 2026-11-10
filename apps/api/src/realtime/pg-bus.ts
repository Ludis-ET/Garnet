import pg from "pg";
import type { RealtimeBus } from "./hub";

const CHANNEL = "garnet_rt";

/**
 * The realtime bus over PostgreSQL LISTEN/NOTIFY (P-100): every API process listens on one
 * channel and sends through the shared pool, so events cross processes with no extra service.
 * The listening connection reconnects by itself; while it is down, events still reach the
 * people on this process, and the others catch up from the change feed when they reconnect.
 */
export function createPgBus(
  connectionString: string,
  pool: pg.Pool,
  log: (event: "realtime_bus_up" | "realtime_bus_down") => void,
): RealtimeBus & { close(): Promise<void> } {
  const listeners: ((text: string) => void)[] = [];
  let client: pg.Client | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const listen = async () => {
    if (closed) return;
    const next = new pg.Client({ connectionString, application_name: "garnet-realtime" });
    next.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || msg.payload === undefined) return;
      for (const l of listeners) l(msg.payload);
    });
    next.on("error", () => {
      reconnect();
    });
    next.on("end", () => {
      reconnect();
    });
    try {
      await next.connect();
      await next.query(`listen ${CHANNEL}`);
      client = next;
      log("realtime_bus_up");
    } catch {
      await next.end().catch(() => undefined);
      reconnect();
    }
  };

  const reconnect = () => {
    if (closed || retry !== null) return;
    if (client !== null) log("realtime_bus_down");
    const old = client;
    client = null;
    void old?.end().catch(() => undefined);
    retry = setTimeout(() => {
      retry = null;
      void listen();
    }, 3000);
    retry.unref();
  };

  void listen();

  return {
    async notify(text) {
      await pool.query("select pg_notify($1, $2)", [CHANNEL, text]);
    },
    onMessage(listener) {
      listeners.push(listener);
    },
    async close() {
      closed = true;
      if (retry !== null) clearTimeout(retry);
      await client?.end().catch(() => undefined);
    },
  };
}
