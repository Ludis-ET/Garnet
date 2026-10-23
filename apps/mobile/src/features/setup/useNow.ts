import { useEffect, useState } from "react";
import { Temporal } from "temporal-polyfill";

/**
 * The current instant, refreshed at the start of every minute (SETUP-05 clocks). Display only;
 * minute-level ticks keep labels honest without a live region.
 */
export function useNow(): Temporal.Instant {
  const [now, setNow] = useState(() => Temporal.Now.instant());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const ms = 60_000 - (Temporal.Now.instant().epochMilliseconds % 60_000);
      id = setTimeout(() => {
        setNow(Temporal.Now.instant());
        schedule();
      }, ms + 50);
    };
    schedule();
    return () => {
      clearTimeout(id);
    };
  }, []);
  return now;
}
