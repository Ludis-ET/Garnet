/**
 * Demo surprises (SUR-01 to SUR-07): fictional, and dated relative to now so the prototype
 * always shows one ready, one still locked each way, one opened, one withdrawn and one that
 * couldn't be scheduled (a simulated error, the sender's alone).
 */
import { Temporal } from "temporal-polyfill";
import type { SurpriseRecord } from "@/domain/surprises";

const sampleWave = [0.3, 0.6, 0.9, 0.5, 0.7, 0.4, 0.8, 0.6, 0.3, 0.5, 0.9, 0.7, 0.4, 0.6];

export function createDemoSurprises(
  meId: string,
  partnerId: string,
  now: Temporal.Instant = Temporal.Now.instant(),
): SurpriseRecord[] {
  // Whole minutes, so "Reset demo data" restores exactly the same surprises (like the chat).
  const base = Temporal.Instant.fromEpochMilliseconds(
    Math.floor(now.epochMilliseconds / 60_000) * 60_000,
  );
  const at = (days: number) => base.add({ minutes: Math.round(days * 24 * 60) }).toString();
  return [
    {
      id: "sur-ready",
      authorId: partnerId,
      recipientId: meId,
      content: {
        kind: "photo",
        text: "The sky over the river, the evening I missed you most.",
        media: { type: "photo", art: "sunrise" },
        song: null,
      },
      safeTitle: null,
      reveal: { type: "date", at: at(-1) },
      state: "scheduled",
      createdAt: at(-6),
      openedAt: null,
    },
    {
      id: "sur-anniversary",
      authorId: partnerId,
      recipientId: meId,
      content: {
        kind: "letter",
        text: "A whole year of mornings and goodnights across two clocks.",
        media: null,
        song: null,
      },
      safeTitle: "For our anniversary",
      reveal: { type: "event", title: "Our anniversary", at: at(9) },
      state: "scheduled",
      createdAt: at(-2),
      openedAt: null,
    },
    {
      id: "sur-birthday",
      authorId: meId,
      recipientId: partnerId,
      content: {
        kind: "voice",
        text: "",
        media: { type: "voice", seconds: 34, wave: sampleWave },
        song: null,
      },
      safeTitle: null,
      reveal: { type: "event", title: "Noah's birthday", at: at(5) },
      state: "scheduled",
      createdAt: at(-1),
      openedAt: null,
    },
    {
      id: "sur-song",
      authorId: meId,
      recipientId: partnerId,
      content: {
        kind: "song",
        text: "The one from the airport.",
        media: null,
        song: { title: "Our airport song", link: "https://music.example/track/airport" },
      },
      safeTitle: "A little something",
      reveal: { type: "now" },
      state: "opened",
      createdAt: at(-4),
      openedAt: at(-3),
    },
    {
      id: "sur-failed",
      authorId: meId,
      recipientId: partnerId,
      content: {
        kind: "idea",
        text: "Breakfast by the sea, first morning back.",
        media: null,
        song: null,
      },
      safeTitle: null,
      reveal: { type: "date", at: at(14) },
      state: "failed",
      createdAt: at(-0.2),
      openedAt: null,
    },
    {
      id: "sur-withdrawn",
      authorId: meId,
      recipientId: partnerId,
      content: {
        kind: "message",
        text: "Never mind, I'll tell you in person.",
        media: null,
        song: null,
      },
      safeTitle: null,
      reveal: { type: "date", at: at(20) },
      state: "cancelled",
      createdAt: at(-8),
      openedAt: null,
    },
  ];
}
