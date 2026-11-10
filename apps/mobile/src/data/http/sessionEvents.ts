/**
 * "The API turned this phone's session down" (production-fix-plan A5). The HTTP layer only
 * reports it; the app's gate asks the server for the auth status again and routes from that
 * answer, so a single refused request never decides on its own that someone is signed out.
 */
import { clearSessionCookie } from "./localState";

type Listener = () => void;

const listeners = new Set<Listener>();
/** One report is enough for a burst of refused requests (several screens load at once). */
const QUIET_MS = 5_000;
let lastAt = Number.NEGATIVE_INFINITY;

export function onSessionLost(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportSessionLost(now: number = Date.now()): void {
  if (now - lastAt < QUIET_MS) return;
  lastAt = now;
  for (const listener of [...listeners]) listener();
}

/**
 * A 401 from the API (production-fix-plan A5). The cookie is forgotten only when it is the one
 * that request carried: a request sent before a fresh sign-in must not wipe the new session.
 * Nothing else is cleared here (no pending email, no invitation code); the gate re-asks the
 * server and routes from its answer.
 */
export async function handleUnauthorized(
  auth: { getCookie: () => string | Promise<string> },
  sent: Readonly<Record<string, string>>,
  clear: () => Promise<void> = clearSessionCookie,
): Promise<void> {
  const cookie = sent.cookie;
  if (cookie !== undefined && cookie !== "" && (await auth.getCookie()) === cookie) {
    await clear();
  }
  reportSessionLost();
}

/** Tests only: forget the last report. */
export function resetSessionEventsForTest(): void {
  lastAt = Number.NEGATIVE_INFINITY;
  listeners.clear();
}
