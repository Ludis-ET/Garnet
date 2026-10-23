import { useEffect, useState } from "react";
import { MockServiceError } from "@/data/mock/MockStore";

/** One calm message for any failed call (SYS-02): never technical, input always kept. */
export function serviceErrorMessage(error: unknown): string {
  if (error instanceof MockServiceError && error.kind === "offline") {
    return "You're offline. Try again when you're back online.";
  }
  return "That didn't work. Try again.";
}

/** Counts down whole seconds from `seconds` (re-armed whenever `key` changes). */
export function useCountdown(seconds: number, key: unknown): number {
  const [left, setLeft] = useState(seconds);
  const [armedFor, setArmedFor] = useState({ key, seconds });
  if (armedFor.key !== key || armedFor.seconds !== seconds) {
    setArmedFor({ key, seconds });
    setLeft(seconds);
  }
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => {
      setLeft((v) => Math.max(0, v - 1));
    }, 1000);
    return () => {
      clearTimeout(id);
    };
  }, [left]);
  return left;
}

/** "0:27" */
export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
