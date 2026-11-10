import { isRegistrationComplete } from "@garnet/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { sql, type Kysely } from "kysely";
import type { WebSocket } from "@fastify/websocket";
import type { Auth } from "../auth/auth";
import { sessionDeadline } from "../auth/auth";
import { authHeaders } from "../auth/bridge";
import { CLIENT_HEADER } from "../auth/client-header";
import type { ChatService } from "../chat/chat.service";
import type { AuthPolicy } from "../config";
import { asViewer, type Database, type Viewer } from "../db/database";
import type { RealtimeHub } from "./hub";

/** Close codes the app understands: sign in again, or nothing to join yet. */
export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_NOT_PAIRED = 4403;
/** A client message is a few bytes; anything bigger is not ours. */
const MAX_MESSAGE_BYTES = 1024;
/** A connection that says nothing for this long is gone (the app pings every 20 s). */
const IDLE_MS = 60_000;

type ClientMessage = { t: "ping" } | { t: "typing"; on: boolean } | { t: "in_chat"; on: boolean };

export function parseClientMessage(raw: unknown): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(String(raw));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const m = data as { t?: unknown; on?: unknown };
  if (m.t === "ping") return { t: "ping" };
  if ((m.t === "typing" || m.t === "in_chat") && typeof m.on === "boolean")
    return { t: m.t, on: m.on };
  return null;
}

/** Native apps send the app header; a web page can't set it on a WebSocket (no hijacking). */
function trustedUpgrade(request: FastifyRequest): boolean {
  if (request.headers[CLIENT_HEADER.name] === CLIENT_HEADER.value) return true;
  const origin = request.headers.origin;
  return (
    origin !== undefined &&
    (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
  );
}

export interface RealtimeDeps {
  auth: Auth;
  db: Kysely<Database>;
  policy: AuthPolicy;
  hub: RealtimeHub;
  /** Resolved once Nest is up: typing and "in the chat" go through the chat's own rules. */
  chat: () => ChatService | null;
}

/**
 * `GET /v1/realtime` (WebSocket, P-100). The session is checked like every other route (verified,
 * within its 90 days, registered), and the couple is taken from it, never from the client. The
 * server sends events for the couple only; the client may say only "ping", "typing" and "in the
 * chat". Opening the app is being online; closing it, or losing the connection, is not.
 */
export function registerRealtime(fastify: FastifyInstance, deps: RealtimeDeps): void {
  fastify.get("/v1/realtime", { websocket: true }, (socket: WebSocket, request) => {
    void accept(socket, request, deps);
  });
}

/** Messages kept while the session is being checked (the app may say "typing" at once). */
const EARLY_MAX = 8;

async function accept(socket: WebSocket, request: FastifyRequest, deps: RealtimeDeps) {
  const refuse = (code: number) => {
    socket.close(code, code === CLOSE_NOT_PAIRED ? "not paired" : "unauthorized");
  };
  if (!trustedUpgrade(request)) {
    refuse(CLOSE_UNAUTHORIZED);
    return;
  }

  // Listening starts now; what arrives before the session is confirmed waits (a few at most).
  const early: Buffer[] = [];
  let handle: ((raw: Buffer) => void) | null = null;
  let cleanup: (() => void) | null = null;
  let closed = false;
  socket.on("message", (raw: Buffer) => {
    if (raw.length > MAX_MESSAGE_BYTES) {
      socket.close(1009, "too big");
      return;
    }
    if (handle !== null) handle(raw);
    else if (early.length < EARLY_MAX) early.push(raw);
  });
  socket.on("close", () => {
    closed = true;
    cleanup?.();
  });
  /** Read through a function: the socket may close while the session is being checked. */
  const isClosed = () => closed;

  const found = await deps.auth.api.getSession({ headers: authHeaders(request) }).catch(() => null);
  if (
    found === null ||
    !found.user.emailVerified ||
    sessionDeadline(new Date(found.session.createdAt), deps.policy.sessionMaxDays) <= new Date() ||
    !isRegistrationComplete(found.user.birthDate, found.user.termsVersion)
  ) {
    refuse(CLOSE_UNAUTHORIZED);
    return;
  }
  const viewer: Viewer = {
    userId: found.user.id,
    sessionId: found.session.id,
    name: found.user.name,
  };
  const couple = await asViewer(deps.db, viewer, async (trx) => {
    const r = await sql<{ rel: string | null; partner: string | null }>`
      select my_relationship() as rel, my_partner() as partner`.execute(trx);
    return r.rows[0];
  }).catch(() => undefined);
  if (couple?.rel == null || couple.partner == null) {
    refuse(CLOSE_NOT_PAIRED);
    return;
  }
  if (isClosed() || socket.readyState !== socket.OPEN) return;
  const { rel, partner } = couple;

  const send = (data: unknown) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(data));
  };
  const unsubscribe = deps.hub.subscribe(rel, (event) => {
    if (event.type === "presence_state") {
      // The person's own presence is theirs to know already. The partner learns only whether
      // Garnet is open: "in the chat" goes out by the chat's own rule, under mutual opt-in
      // (P-58, P-61, U-35 open), never here.
      if (event.senderId === viewer.userId) return;
      const online = (event.payload as { online?: unknown }).online === true;
      send({ type: "presence_state", senderId: event.senderId, payload: { online } });
      return;
    }
    send(event);
  });
  const presence = deps.hub.connected(rel, viewer.userId);
  send({
    type: "hello",
    payload: { partner: { online: deps.hub.presenceOf(partner).online } },
  });

  let idle = setTimeout(() => {
    socket.terminate();
  }, IDLE_MS);
  cleanup = () => {
    clearTimeout(idle);
    unsubscribe();
    presence.close();
  };
  handle = (raw) => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      socket.terminate();
    }, IDLE_MS);
    const message = parseClientMessage(raw.toString("utf8"));
    if (message === null) return;
    const chat = deps.chat();
    switch (message.t) {
      case "ping":
        send({ type: "pong" });
        return;
      case "typing":
        if (chat !== null) void chat.sendTyping(viewer, message.on).catch(() => undefined);
        return;
      case "in_chat":
        presence.inChat(message.on);
        if (chat !== null) void chat.setWatching(viewer, message.on).catch(() => undefined);
        return;
    }
  };
  for (const raw of early.splice(0)) handle(raw);
}
