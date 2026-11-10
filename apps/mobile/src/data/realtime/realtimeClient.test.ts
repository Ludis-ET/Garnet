/**
 * The realtime connection (P-100): WebSocket with the session and the app header, pings,
 * reconnects, "sign in again" on 4401, and the SSE stream when WebSockets never open.
 */
import { connectRealtime, realtimeUrl, type RealtimeMessage } from "./realtimeClient";

class FakeSocket {
  static all: FakeSocket[] = [];
  readonly OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(
    readonly url: string,
    readonly headers: Record<string, string>,
  ) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(m: unknown) {
    this.onmessage?.({ data: JSON.stringify(m) });
  }
  drop(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  FakeSocket.all = [];
  jest.useFakeTimers({ doNotFake: ["setImmediate"] });
});
afterEach(() => {
  jest.useRealTimers();
});

function start(extra: Partial<Parameters<typeof connectRealtime>[0]> = {}) {
  const messages: RealtimeMessage[] = [];
  const fallback = jest.fn(() => ({ close: jest.fn() }));
  const conn = connectRealtime({
    baseUrl: "https://garnet.example",
    headers: () => Promise.resolve({ cookie: "s=1" }),
    onMessage: (m) => messages.push(m),
    createSocket: (url, headers) => new FakeSocket(url, headers) as unknown as WebSocket,
    connectFallback: fallback as never,
    ...extra,
  });
  return { conn, messages, fallback };
}

describe("the realtime connection (P-100)", () => {
  it("connects to wss with the session and the app header, and passes events on", async () => {
    expect(realtimeUrl("https://garnet.example/")).toBe("wss://garnet.example/v1/realtime");
    const { messages, conn } = start();
    await flush();
    const ws = FakeSocket.all[0];
    expect(ws?.url).toBe("wss://garnet.example/v1/realtime");
    expect(ws?.headers).toEqual({ cookie: "s=1", "x-garnet-client": "app" });
    ws?.open();
    ws?.receive({ type: "typing", payload: { typing: true } });
    ws?.receive({ type: "pong" });
    expect(messages).toEqual([{ type: "typing", payload: { typing: true } }]);
    conn.send({ t: "typing", on: true });
    expect(ws?.sent).toContain('{"t":"typing","on":true}');
    jest.advanceTimersByTime(20_000);
    expect(ws?.sent).toContain('{"t":"ping"}');
    conn.close();
  });

  it("reconnects after a drop, and asks to sign in again when the session is gone", async () => {
    const onUnauthorized = jest.fn();
    const { conn } = start({ onUnauthorized });
    await flush();
    FakeSocket.all[0]?.open();
    FakeSocket.all[0]?.drop(1006);
    jest.advanceTimersByTime(1000);
    await flush();
    expect(FakeSocket.all).toHaveLength(2);
    FakeSocket.all[1]?.drop(4401);
    jest.advanceTimersByTime(60_000);
    await flush();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(FakeSocket.all).toHaveLength(2);
    conn.close();
  });

  it("falls back to the SSE stream when WebSockets never open, and posts typing there", async () => {
    const post = jest.fn(() => Promise.resolve());
    const { fallback, conn } = start({ post });
    await flush();
    FakeSocket.all[0]?.drop(1006);
    jest.advanceTimersByTime(1000);
    await flush();
    FakeSocket.all[1]?.drop(1006);
    await flush();
    expect(fallback).toHaveBeenCalledTimes(1);
    conn.send({ t: "in_chat", on: true });
    expect(post).toHaveBeenCalledWith("/v1/chat/presence/watching", { watching: true });
    conn.close();
  });

  it("stops for good when closed", async () => {
    const { conn } = start();
    await flush();
    conn.close();
    FakeSocket.all[0]?.drop(1006);
    jest.advanceTimersByTime(60_000);
    await flush();
    expect(FakeSocket.all).toHaveLength(1);
  });
});
