import { useEffect, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { inviteTimeLeft } from "@/domain/pairing";

/**
 * The invitation's remaining time as a label ("23 h 59 m"), or null once expired. Display only:
 * the repository stays the authority on expiry (P-18). Re-renders every 20 s, so the minutes
 * stay honest without a live region.
 */
export function useTimeLeft(expiresAt: string | null): string | null {
  const [now, setNow] = useState(() => Temporal.Now.instant());
  useEffect(() => {
    if (expiresAt === null) return;
    const id = setInterval(() => {
      setNow(Temporal.Now.instant());
    }, 20_000);
    return () => {
      clearInterval(id);
    };
  }, [expiresAt]);
  return expiresAt === null ? null : inviteTimeLeft(now, Temporal.Instant.from(expiresAt));
}
