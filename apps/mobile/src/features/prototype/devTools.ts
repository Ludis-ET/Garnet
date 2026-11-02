import { useSyncExternalStore } from "react";
import { clearStored, readStored, writeStored } from "@/data/mock/storage";

/**
 * Testing tools (owner direction P-75): the app looks like the finished product, and the
 * prototype controls (the ✦ panel, Settings › Testing, "Simulated" badges) stay hidden until
 * someone taps the version in Settings › About seven times. Saved on this device only.
 */
const KEY = "garnet_testing_tools";
type Listener = () => void;
const listeners = new Set<Listener>();
let unlocked = readStored(KEY) === "on";

export function setTestingTools(on: boolean): void {
  unlocked = on;
  if (on) writeStored(KEY, "on");
  else clearStored(KEY);
  for (const l of listeners) l();
}

/** Taps on the version needed to show the tools. */
export const TAPS_TO_UNLOCK = 7;

export function useTestingTools(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => unlocked,
    () => unlocked,
  );
}
