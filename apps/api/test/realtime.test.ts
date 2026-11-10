/**
 * Realtime for the couple (P-100): who has Garnet open, typing and chat over one WebSocket,
 * only ever to the two of them, and the same across API processes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RealtimeHub, type RealtimeBus } from "../src/realtime/hub";
import { parseClientMessage } from "../src/realtime/gateway";
import { startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

const settle = () => new Promise((r) => setTimeout(r, 50));

describe("the realtime connection (P-100)", () => {
  it("tells each partner when the other opens and closes Garnet", async () => {
    const selam = await api.realtime(api.cookies.selam);
    expect((await selam.next("hello")).payload).toEqual({ partner: { online: false } });
    const noah = await api.realtime(api.cookies.noah);
    expect((await noah.next("hello")).payload).toEqual({ partner: { online: true } });
    expect((await selam.next("presence_state")).payload).toEqual({ online: true });
    // Being in the chat is not told here (only under mutual opt-in, by the chat itself).
    noah.send({ t: "in_chat", on: true });
    expect((await selam.next("presence_state")).payload).toEqual({ online: true });
    noah.close();
    expect((await selam.next("presence_state")).payload).toEqual({ online: false });
    selam.close();
  });

  it("carries typing and chat messages to the partner, as they happen", async () => {
    const selam = await api.realtime(api.cookies.selam);
    const noah = await api.realtime(api.cookies.noah);
    await selam.next("hello");
    noah.send({ t: "typing", on: true });
    expect((await selam.next("typing")).payload).toEqual({ typing: true });
    await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.noah,
      body: { text: "On my way" },
    });
    const message = await selam.next("message_received");
    expect(message.payload).toMatchObject({ text: "On my way" });
    selam.close();
    noah.close();
  });

  it("never shows someone typing who turned typing indicators off", async () => {
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.noah,
      body: { typingIndicators: false },
    });
    const selam = await api.realtime(api.cookies.selam);
    const noah = await api.realtime(api.cookies.noah);
    await selam.next("hello");
    noah.send({ t: "typing", on: true });
    await settle();
    await settle();
    expect(selam.received.filter((m) => m.type === "typing")).toEqual([]);
    await api.call("PATCH", "/v1/chat/settings", {
      cookie: api.cookies.noah,
      body: { typingIndicators: true },
    });
    selam.close();
    noah.close();
  });

  it("says someone is in the chat only when both have turned it on (P-58, U-35 open)", async () => {
    const selam = await api.realtime(api.cookies.selam);
    const noah = await api.realtime(api.cookies.noah);
    await selam.next("hello");
    noah.send({ t: "in_chat", on: true });
    await settle();
    await settle();
    expect(selam.received.filter((m) => m.type === "presence")).toEqual([]);
    for (const cookie of [api.cookies.selam, api.cookies.noah])
      await api.call("PATCH", "/v1/chat/settings", { cookie, body: { readReceipts: true } });
    noah.send({ t: "in_chat", on: true });
    expect((await selam.next("presence")).payload).toEqual({ watching: true });
    selam.close();
    noah.close();
  });

  it("gives another couple nothing of this one", async () => {
    const stranger = await api.realtime(api.cookies.stranger);
    const code = await stranger.closed;
    // The stranger is not paired in the test data: nothing to join.
    expect(code).toBe(4403);
    expect(stranger.received.filter((m) => m.type !== "hello")).toEqual([]);
  });

  it("refuses no session, a dead one, and a web page riding the cookie", async () => {
    for (const cookie of [undefined, api.cookies.revoked, api.cookies.expired]) {
      const s = await api.realtime(cookie);
      expect(await s.closed).toBe(4401);
      expect(s.received).toEqual([]);
    }
    // A browser page can't set the app's header; its origin isn't the local web build.
    const hijack = await api.realtime(api.cookies.selam, {
      "x-garnet-client": "",
      origin: "https://evil.example",
    });
    expect(await hijack.closed).toBe(4401);
  });

  it("reads only the three things a client may say", () => {
    expect(parseClientMessage('{"t":"ping"}')).toEqual({ t: "ping" });
    expect(parseClientMessage('{"t":"typing","on":true}')).toEqual({ t: "typing", on: true });
    expect(parseClientMessage('{"t":"in_chat","on":false}')).toEqual({ t: "in_chat", on: false });
    for (const junk of ["", "x", '{"t":"typing"}', '{"t":"send","text":"hi"}', "[1]"])
      expect(parseClientMessage(junk)).toBeNull();
  });
});

describe("across API processes", () => {
  /** Two processes joined by a bus, as PostgreSQL NOTIFY joins them. */
  function joined() {
    const listeners: ((text: string) => void)[] = [];
    const bus: RealtimeBus = {
      notify: (text) => {
        for (const l of listeners) l(text);
        return Promise.resolve();
      },
      onMessage: (l) => {
        listeners.push(l);
      },
    };
    const a = new RealtimeHub();
    const b = new RealtimeHub();
    a.attachBus(bus);
    b.attachBus(bus);
    return { a, b };
  }

  it("delivers once on each process, and presence is known everywhere", () => {
    const { a, b } = joined();
    const onA: string[] = [];
    const onB: string[] = [];
    a.subscribe("rel", (e) => onA.push(e.type));
    b.subscribe("rel", (e) => onB.push(e.type));
    a.publish({ relationshipId: "rel", senderId: "u1", type: "message_received", payload: {} });
    expect(onA).toEqual(["message_received"]);
    expect(onB).toEqual(["message_received"]);
    const conn = a.connected("rel", "u1");
    expect(b.presenceOf("u1")).toEqual({ online: true, inChat: false });
    conn.inChat(true);
    expect(b.presenceOf("u1")).toEqual({ online: true, inChat: true });
    conn.close();
    expect(b.presenceOf("u1")).toEqual({ online: false, inChat: false });
    a.stop();
    b.stop();
  });

  it("turns events too big to pass into a refresh, and forgets presence nobody repeats", () => {
    const { a, b } = joined();
    const onB: { type: string; payload: unknown }[] = [];
    b.subscribe("rel", (e) => onB.push(e));
    a.publish({
      relationshipId: "rel",
      senderId: "u1",
      type: "message_received",
      payload: { text: "x".repeat(10_000) },
    });
    expect(onB).toEqual([
      expect.objectContaining({ type: "refresh", payload: { area: "message_received" } }),
    ]);
    a.connected("rel", "u2");
    expect(b.presenceOf("u2", Date.now() + 60_000)).toEqual({ online: false, inChat: false });
    a.stop();
    b.stop();
  });
});
