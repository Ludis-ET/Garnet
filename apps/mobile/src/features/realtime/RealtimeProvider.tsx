import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { getGarnetAuthClient } from "@/data/http/authClient";
import { CLIENT_HEADER } from "@/data/http/client";
import { API_AREAS_ON, API_URL } from "@/data/http/config";
import { reportSessionLost } from "@/data/http/sessionEvents";
import {
  connectRealtime,
  type RealtimeConnection,
  type RealtimeMessage,
  type RealtimeStatus,
} from "@/data/realtime/realtimeClient";
import { useAuthStatus } from "@/features/auth/useAuth";
import { applyChatEvent, CHAT_QUERY_KEYS } from "@/features/chat/useChat";
import { usePairingStatus } from "@/features/pairing/usePairing";

/**
 * Realtime for the couple (P-100). While Garnet is on screen, signed in and paired, one
 * connection carries the partner's presence (online; typing; in the chat, under mutual opt-in)
 * and every chat event. In the background it is closed, so being online means having Garnet
 * open. On mock data there is no connection and the screens use the sample data's presence.
 */
export interface PartnerPresence {
  /** Has Garnet open right now. */
  online: boolean;
  /** Is in the chat (only told when both have turned it on, P-58, P-61). */
  inChat: boolean;
  typing: boolean;
}

interface RealtimeValue {
  /** Null on mock data: no realtime, screens fall back to the sample data. */
  partner: PartnerPresence | null;
  status: RealtimeStatus;
  setTyping(on: boolean): void;
  setInChat(on: boolean): void;
}

const OFFLINE: PartnerPresence = { online: false, inChat: false, typing: false };
/** A typing state nobody repeats ends by itself (the sender repeats every few seconds). */
const TYPING_TTL_MS = 6000;

const RealtimeContext = createContext<RealtimeValue>({
  partner: null,
  status: "closed",
  setTyping: () => undefined,
  setInChat: () => undefined,
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const pairing = usePairingStatus(signedIn);
  const paired = pairing.data?.kind === "paired";
  const live = API_URL !== null && API_AREAS_ON.size > 0;
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [partner, setPartner] = useState<PartnerPresence>(OFFLINE);
  const [status, setStatus] = useState<RealtimeStatus>("closed");
  const connection = useRef<RealtimeConnection | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      setForeground(s === "active");
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!live || API_URL === null || !signedIn || !paired || !foreground) return;
    const baseUrl = API_URL;
    const client = getGarnetAuthClient(baseUrl);
    const headers = async (): Promise<Record<string, string>> => {
      const cookie = await client.getCookie();
      return cookie === "" ? {} : { cookie };
    };
    const stopTyping = () => {
      if (typingTimer.current !== null) clearTimeout(typingTimer.current);
      typingTimer.current = null;
    };
    const onMessage = (m: RealtimeMessage) => {
      switch (m.type) {
        case "hello": {
          const p = (m.payload as { partner?: { online?: unknown } } | undefined)?.partner;
          setPartner((old) => ({ ...old, online: p?.online === true }));
          return;
        }
        case "presence_state": {
          const online = (m.payload as { online?: unknown } | undefined)?.online === true;
          setPartner((old) =>
            online ? { ...old, online } : { online: false, inChat: false, typing: false },
          );
          return;
        }
        case "typing": {
          const on = (m.payload as { typing?: unknown } | undefined)?.typing === true;
          stopTyping();
          setPartner((old) => ({ ...old, typing: on }));
          if (on)
            typingTimer.current = setTimeout(() => {
              setPartner((old) => ({ ...old, typing: false }));
            }, TYPING_TTL_MS);
          return;
        }
        case "presence": {
          const p = m.payload as { watching?: unknown } | undefined;
          if (p !== undefined && typeof p.watching === "boolean")
            setPartner((old) => ({ ...old, inChat: p.watching === true }));
          void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.presence });
          return;
        }
        case "refresh":
          void queryClient.invalidateQueries({ queryKey: ["chat"] });
          return;
        case "message_received":
          // A message ends their typing.
          stopTyping();
          setPartner((old) => ({ ...old, typing: false }));
          applyChatEvent(queryClient, m);
          return;
        default:
          applyChatEvent(queryClient, m);
      }
    };
    const conn = connectRealtime({
      baseUrl,
      headers,
      onMessage,
      onStatus: setStatus,
      onUnauthorized: () => {
        reportSessionLost();
      },
      post: async (path, body) => {
        await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            ...(await headers()),
            [CLIENT_HEADER.name]: CLIENT_HEADER.value,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });
      },
    });
    connection.current = conn;
    return () => {
      conn.close();
      connection.current = null;
      stopTyping();
      setPartner(OFFLINE);
    };
  }, [live, signedIn, paired, foreground, queryClient]);

  const value = useMemo<RealtimeValue>(
    () => ({
      partner: live ? partner : null,
      status,
      setTyping: (on) => {
        connection.current?.send({ t: "typing", on });
      },
      setInChat: (on) => {
        connection.current?.send({ t: "in_chat", on });
      },
    }),
    [live, partner, status],
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** The partner's presence, or null on mock data (use the sample data's then). */
export function usePartnerPresence(): PartnerPresence | null {
  return useContext(RealtimeContext).partner;
}

export function useRealtime(): RealtimeValue {
  return useContext(RealtimeContext);
}
