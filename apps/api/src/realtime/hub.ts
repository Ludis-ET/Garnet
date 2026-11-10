import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

/**
 * Realtime for the two of a relationship (P-100, production-fix-plan R). Every change, chat
 * event, typing and presence goes out here to the couple's open connections: WebSocket first,
 * the SSE stream as a fallback. Several API processes (Passenger can run more than one) share
 * events through PostgreSQL LISTEN/NOTIFY (the bus), so a partner on another process still
 * hears them. Nothing is stored here: presence lives only in memory, for minutes.
 */
export interface RealtimeEvent {
  relationshipId: string;
  senderId: string;
  type: string;
  payload: unknown;
}

/** Whether someone has Garnet open (online), and whether they are in the chat. */
export interface Presence {
  online: boolean;
  inChat: boolean;
}

/** How the processes reach each other (PostgreSQL NOTIFY); none in tests or with one process. */
export interface RealtimeBus {
  notify(text: string): Promise<void>;
  onMessage(listener: (text: string) => void): void;
}

/** A presence nobody refreshed for this long is "offline" (a process that died says nothing). */
const PRESENCE_TTL_MS = 50_000;
/** How often each process repeats the presence of the people connected to it. */
export const PRESENCE_HEARTBEAT_MS = 20_000;
/** PostgreSQL NOTIFY carries at most 8000 bytes; bigger events become "refresh". */
const NOTIFY_MAX = 7_500;

interface Wire extends RealtimeEvent {
  origin: string;
}

@Injectable()
export class RealtimeHub {
  readonly #local = new EventEmitter();
  readonly #origin = randomUUID();
  #bus: RealtimeBus | null = null;
  /** userId → presence and when it was last heard. */
  readonly #presence = new Map<string, Presence & { at: number; relationshipId: string }>();
  /** userId → connections on this process, and whether any of them is in the chat. */
  readonly #mine = new Map<string, { relationshipId: string; open: number; inChat: number }>();
  #heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.#local.setMaxListeners(0);
  }

  /** Joins the processes together (main.ts). Events from this process are not echoed. */
  attachBus(bus: RealtimeBus): void {
    this.#bus = bus;
    bus.onMessage((text) => {
      let wire: Wire;
      try {
        wire = JSON.parse(text) as Wire;
      } catch {
        return;
      }
      if (wire.origin === this.#origin) return;
      this.#deliver(wire);
    });
  }

  publish(event: RealtimeEvent): void {
    this.#deliver(event);
    if (this.#bus === null) return;
    let text = JSON.stringify({ ...event, origin: this.#origin } satisfies Wire);
    if (Buffer.byteLength(text) > NOTIFY_MAX)
      // Too big to pass between processes: the others are told to fetch it instead.
      text = JSON.stringify({
        relationshipId: event.relationshipId,
        senderId: event.senderId,
        type: "refresh",
        payload: { area: event.type },
        origin: this.#origin,
      } satisfies Wire);
    void this.#bus.notify(text).catch(() => undefined);
  }

  subscribe(relationshipId: string, listener: (event: RealtimeEvent) => void): () => void {
    const channel = `rel:${relationshipId}`;
    this.#local.on(channel, listener);
    return () => {
      this.#local.off(channel, listener);
    };
  }

  /** The last known presence of someone; offline when nothing was heard lately. */
  presenceOf(userId: string, now = Date.now()): Presence {
    const p = this.#presence.get(userId);
    if (p === undefined || now - p.at > PRESENCE_TTL_MS) return { online: false, inChat: false };
    return { online: p.online, inChat: p.inChat };
  }

  /** A connection opened on this process; returns what to call when it closes. */
  connected(relationshipId: string, userId: string): { close(): void; inChat(on: boolean): void } {
    const mine = this.#mine.get(userId) ?? { relationshipId, open: 0, inChat: 0 };
    mine.open += 1;
    mine.relationshipId = relationshipId;
    this.#mine.set(userId, mine);
    this.#announce(userId);
    this.#startHeartbeat();
    let inChat = false;
    let closed = false;
    return {
      inChat: (on) => {
        if (closed || on === inChat) return;
        inChat = on;
        mine.inChat += on ? 1 : -1;
        this.#announce(userId);
      },
      close: () => {
        if (closed) return;
        closed = true;
        if (inChat) mine.inChat -= 1;
        mine.open -= 1;
        this.#announce(userId);
        if (mine.open <= 0) this.#mine.delete(userId);
        if (this.#mine.size === 0) this.#stopHeartbeat();
      },
    };
  }

  /** Stops the heartbeat (app shutdown, tests). */
  stop(): void {
    this.#stopHeartbeat();
  }

  #announce(userId: string): void {
    const mine = this.#mine.get(userId);
    if (mine === undefined) return;
    const state: Presence = { online: mine.open > 0, inChat: mine.inChat > 0 };
    this.publish({
      relationshipId: mine.relationshipId,
      senderId: userId,
      type: "presence_state",
      payload: state,
    });
  }

  #deliver(event: RealtimeEvent): void {
    if (event.type === "presence_state") {
      const p = event.payload as Partial<Presence>;
      this.#presence.set(event.senderId, {
        online: p.online === true,
        inChat: p.inChat === true,
        at: Date.now(),
        relationshipId: event.relationshipId,
      });
    }
    this.#local.emit(`rel:${event.relationshipId}`, event);
  }

  #startHeartbeat(): void {
    if (this.#heartbeat !== null) return;
    this.#heartbeat = setInterval(() => {
      for (const userId of this.#mine.keys()) this.#announce(userId);
    }, PRESENCE_HEARTBEAT_MS);
    this.#heartbeat.unref();
  }

  #stopHeartbeat(): void {
    if (this.#heartbeat !== null) clearInterval(this.#heartbeat);
    this.#heartbeat = null;
  }
}
