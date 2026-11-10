import { CLIENT_HEADER } from "./client";

export interface SseMessage {
  type: string;
  senderId?: string;
  relationshipId?: string;
  payload?: unknown;
}

export type SseListener = (message: SseMessage) => void;

export interface ChatStreamConnection {
  close: () => void;
}

/**
 * Creates a persistent Server-Sent Events (SSE) connection to /v1/chat/stream.
 * Progressively parses stream chunks in React Native via XMLHttpRequest,
 * with exponential reconnect on drop and keepalive ping handling.
 */
export function connectChatStream(
  baseUrl: string,
  getHeaders: () => Promise<Record<string, string>>,
  onMessage: SseListener,
  onError?: (err: unknown) => void,
): ChatStreamConnection {
  let closed = false;
  let xhr: XMLHttpRequest | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = 1000;

  async function connect() {
    if (closed) return;
    try {
      const extraHeaders = await getHeaders();
      const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/stream`;

      let processedIndex = 0;
      let buffer = "";

      xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader(CLIENT_HEADER.name, CLIENT_HEADER.value);
      xhr.setRequestHeader("expo-origin", "garnet://");
      for (const [key, val] of Object.entries(extraHeaders)) {
        xhr.setRequestHeader(key, val);
      }

      xhr.onprogress = () => {
        if (closed || !xhr) return;
        const text = xhr.responseText;
        const chunk = text.slice(processedIndex);
        processedIndex = text.length;

        buffer += chunk;
        const parts = buffer.split("\n\n");
        // Keep the last partial line in buffer
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr) {
                try {
                  const data = JSON.parse(jsonStr) as SseMessage;
                  // Reset backoff on successful data
                  backoffMs = 1000;
                  onMessage(data);
                } catch {
                  // Non-JSON or malformed data
                }
              }
            }
          }
        }
      };

      xhr.onload = () => {
        scheduleReconnect();
      };

      xhr.onerror = (e) => {
        onError?.(e);
        scheduleReconnect();
      };

      xhr.send();
    } catch (e) {
      onError?.(e);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (closed) return;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      backoffMs = Math.min(backoffMs * 1.5, 15000);
      void connect();
    }, backoffMs);
  }

  void connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (xhr) {
        xhr.abort();
        xhr = null;
      }
    },
  };
}
