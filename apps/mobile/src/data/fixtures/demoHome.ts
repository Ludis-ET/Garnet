/**
 * Demo Home and Us data (HOME-01 to HOME-05, US-01 to US-10): signals and events. Moments live
 * with the Days data (demoDays.ts), so Home's "Today" and the Days timeline are the same entries.
 * Seeded signals recur "N minutes ago", so the history always looks recent.
 */
import type { SignalId } from "@garnet/domain";
import type { SignalPayload, SignalResponse } from "@/domain/us";

export interface DemoSignalEvent {
  id: string;
  signal: SignalId;
  /** Instant (ISO); seeded events use `minutesAgo` instead. */
  at: string | null;
  minutesAgo?: number;
  payload?: SignalPayload;
  /** Replies the receiver sent back ("I'm here"…). Never read receipts (§5). */
  responses?: SignalResponse[];
}

export interface DemoEvent {
  id: string;
  title: string;
  /** Recurs yearly on this "MM-DD". */
  monthDay: string;
  emoji: string;
}

export interface DemoHomeState {
  /** Signals this person sent ("Sent" only; nothing about delivery or reading, §5). */
  sent: DemoSignalEvent[];
  /** Signals from the partner, newest last; dismissing one is local to this phone. */
  incoming: DemoSignalEvent[];
  dismissed: string[];
  events: DemoEvent[];
}

export function createDemoHome(): DemoHomeState {
  return {
    sent: [
      {
        id: "s-1",
        signal: "thought-of-you",
        at: null,
        minutesAgo: 35,
        payload: { note: "Saw a yellow tram and thought of you" },
      },
      {
        id: "s-2",
        signal: "missing-you",
        at: null,
        minutesAgo: 60 * 26,
        payload: { level: "A lot" },
      },
      { id: "s-3", signal: "okay-now", at: null, minutesAgo: 60 * 50 },
    ],
    incoming: [
      {
        id: "i-1",
        signal: "thought-of-you",
        at: null,
        minutesAgo: 140,
        payload: { note: "Your favourite song came on" },
        responses: ["thought"],
      },
      {
        id: "i-2",
        signal: "check-on-me",
        at: null,
        minutesAgo: 60 * 52,
        payload: { when: "tonight" },
        responses: ["here"],
      },
    ],
    // Seeded signals were already seen on this phone, so Home doesn't pop them up again.
    dismissed: ["i-1", "i-2"],
    events: [{ id: "e-birthday", title: "Noah's birthday", monthDay: "11-02", emoji: "🎂" }],
  };
}
