import { connectChatStream, type ChatStreamConnection } from "@/data/http/chatStream";
import { CLIENT_HEADER } from "@/data/http/client";

/**
 * The app's realtime connection (P-100): a WebSocket to /v1/realtime carrying the session, with
 * the SSE stream as a fallback when the host or a proxy refuses WebSockets. It pings every 20 s,
 * reconnects with back-off, and is opened only while Garnet is on screen (RealtimeProvider), so
 * being connected is what "online" means.
 */
export interface RealtimeMessage {
  type: string;
  senderId?: string;
  payload?: unknown;
}

export type RealtimeStatus = "connecting" | "open" | "fallback" | "closed";

export interface RealtimeConnection {
  /** "typing" and "in the chat"; dropped while not connected by WebSocket. */
  send(message: { t: "typing" | "in_chat"; on: boolean }): void;
  close(): void;
}

export interface RealtimeOptions {
  baseUrl: string;
  headers: () => Promise<Record<string, string>>;
  onMessage: (message: RealtimeMessage) => void;
  onStatus?: (status: RealtimeStatus) => void;
  /** The session is gone (4401): the app re-checks who is signed in. */
  onUnauthorized?: () => void;
  /** On the SSE fallback, "typing" and "in the chat" go to the API's own routes this way. */
  post?: (path: string, body: unknown) => Promise<void>;
  /** Injected in tests. */
  createSocket?: (url: string, headers: Record<string, string>) => WebSocket;
  connectFallback?: typeof connectChatStream;
}

const PING_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;
/** WebSocket tries that never opened before falling back to the stream. */
const TRIES_BEFORE_FALLBACK = 2;

function nativeSocket(url: string, headers: Record<string, string>): WebSocket {
  // React Native's WebSocket takes headers as a third argument (not in the DOM's types).
  const Ctor = WebSocket as unknown as new (
    url: string,
    protocols: string[] | undefined,
    options: { headers: Record<string, string> },
  ) => WebSocket;
  return new Ctor(url, undefined, { headers });
}

export function realtimeUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "").replace(/^http/, "ws")}/v1/realtime`;
}

export function connectRealtime(o: RealtimeOptions): RealtimeConnection {
  const createSocket = o.createSocket ?? nativeSocket;
  const fallback = o.connectFallback ?? connectChatStream;
  let closed = false;
  let socket: WebSocket | null = null;
  let stream: ChatStreamConnection | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let backoff = 1000;
  let everOpened = false;
  let failedTries = 0;

  const status = (s: RealtimeStatus) => o.onStatus?.(s);

  const stopTimers = () => {
    if (ping !== null) clearInterval(ping);
    ping = null;
    if (retry !== null) clearTimeout(retry);
    retry = null;
  };

  const schedule = () => {
    if (closed || retry !== null) return;
    retry = setTimeout(() => {
      retry = null;
      void open();
    }, backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  };

  /** Read through a function: close() may run while a connection is being prepared. */
  const isClosed = () => closed;

  const startFallback = () => {
    status("fallback");
    stream = fallback(o.baseUrl, o.headers, (m) => {
      o.onMessage(m);
    });
  };

  const open = async () => {
    if (closed) return;
    status("connecting");
    let headers: Record<string, string>;
    try {
      headers = { ...(await o.headers()), [CLIENT_HEADER.name]: CLIENT_HEADER.value };
    } catch {
      schedule();
      return;
    }
    if (isClosed()) return;
    const ws = createSocket(realtimeUrl(o.baseUrl), headers);
    socket = ws;
    ws.onopen = () => {
      everOpened = true;
      failedTries = 0;
      backoff = 1000;
      status("open");
      ping = setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: "ping" }));
      }, PING_MS);
    };
    ws.onmessage = (event: MessageEvent) => {
      try {
        const m = JSON.parse(String(event.data)) as RealtimeMessage;
        if (m.type !== "pong") o.onMessage(m);
      } catch {
        // Not ours.
      }
    };
    ws.onclose = (event: CloseEvent) => {
      if (socket === ws) socket = null;
      stopTimers();
      if (closed) return;
      if (event.code === 4401) {
        status("closed");
        o.onUnauthorized?.();
        return;
      }
      // Not paired yet: nothing to listen to; the app opens it again once paired.
      if (event.code === 4403) {
        status("closed");
        return;
      }
      if (!everOpened) {
        failedTries += 1;
        if (failedTries >= TRIES_BEFORE_FALLBACK) {
          startFallback();
          return;
        }
      }
      schedule();
    };
    ws.onerror = () => {
      // onclose follows and decides.
    };
  };

  void open();

  return {
    send(message) {
      if (socket !== null && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
        return;
      }
      if (stream !== null && o.post !== undefined) {
        const [path, body] =
          message.t === "typing"
            ? ["/v1/chat/presence/typing", { typing: message.on }]
            : ["/v1/chat/presence/watching", { watching: message.on }];
        void o.post(path, body).catch(() => undefined);
      }
    },
    close() {
      closed = true;
      stopTimers();
      socket?.close(1000, "bye");
      socket = null;
      stream?.close();
      stream = null;
      status("closed");
    },
  };
}
