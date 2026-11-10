/**
 * The notifications that were in the catalogue but never sent (P-102): letters, surprises,
 * reactions, a partner joining, the space opening, and events and birthdays on their day.
 * Never the words of a letter or the contents of a surprise; never twice.
 */
import { Temporal } from "temporal-polyfill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NotificationsService } from "../src/notifications/notifications.service";
import { eventFallsOn, NotificationScheduler } from "../src/notifications/scheduler";
import { DEV_PEOPLE, startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

interface Row {
  category: string;
  user_id: string;
  title: string;
  body: string;
}

async function noticesFor(userId: string, category: string): Promise<Row[]> {
  return (
    await api.db.query<Row>(
      "select category, user_id, title, body from notification where user_id = $1 and category = $2",
      [userId, category],
    )
  ).rows;
}

describe("notifications on an action (P-102)", () => {
  it("tells the recipient a letter is waiting, never what it says", async () => {
    const draft = await api.call("POST", "/v1/letters/draft", {
      cookie: api.cookies.selam,
      body: { prompt: "Open when it rains", body: "An imaginary umbrella for you." },
    });
    const id = draft.json<{ id: string }>().id;
    await api.call("POST", `/v1/letters/${id}/seal`, {
      cookie: api.cookies.selam,
      body: { unlockRule: { type: "manual" } },
    });
    const rows = await noticesFor(DEV_PEOPLE.noah.id, "open-when");
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toMatch(/umbrella|rains/);
  });

  it("announces a surprise that opens now, and keeps a dated one for its day", async () => {
    const before = (await noticesFor(DEV_PEOPLE.selam.id, "surprise")).length;
    await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.noah,
      body: {
        content: { kind: "idea", textContent: "Coffee at sunrise" },
        safeTitle: "Something small",
        reveal: { kind: "now" },
      },
    });
    await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.noah,
      body: {
        content: { kind: "idea", textContent: "Later" },
        reveal: { kind: "date", date: "2099-01-01" },
      },
    });
    const rows = await noticesFor(DEV_PEOPLE.selam.id, "surprise");
    expect(rows).toHaveLength(before + 1);
    expect(JSON.stringify(rows)).not.toContain("Coffee");
  });

  it("tells someone their message got a reaction, not the one who reacted", async () => {
    const sent = await api.call("POST", "/v1/chat/messages", {
      cookie: api.cookies.selam,
      body: { text: "Good morning" },
    });
    const messageId = sent.json<{ id: string }>().id;
    await api.call("POST", `/v1/chat/messages/${messageId}/reactions`, {
      cookie: api.cookies.noah,
      body: { emoji: "❤️" },
    });
    expect(await noticesFor(DEV_PEOPLE.selam.id, "reply-reaction")).toHaveLength(1);
    expect(await noticesFor(DEV_PEOPLE.noah.id, "reply-reaction")).toHaveLength(0);
  });

  it("tells the inviter their person joined", async () => {
    const a = await api.newAccount("Kidist");
    const b = await api.newAccount("Liam");
    const made = await api.call("POST", "/v1/invitations", { cookie: a.cookie });
    const { code } = made.json<{ code: string }>();
    await api.call("POST", "/v1/invitations/accept", { cookie: b.cookie, body: { code } });
    expect(await noticesFor(a.id, "partner-joined")).toHaveLength(1);
    expect(await noticesFor(b.id, "partner-joined")).toHaveLength(0);
  });
});

describe("notifications on a day (P-102)", () => {
  it("knows which days an event falls on", () => {
    const d = (s: string) => Temporal.PlainDate.from(s);
    expect(eventFallsOn("2026-11-10", "none", d("2026-11-10"))).toBe(true);
    expect(eventFallsOn("2026-11-10", "none", d("2027-11-10"))).toBe(false);
    expect(eventFallsOn("1998-04-02", "yearly", d("2026-04-02"))).toBe(true);
    expect(eventFallsOn("2024-02-29", "yearly", d("2027-02-28"))).toBe(true);
    expect(eventFallsOn("2024-02-29", "yearly", d("2028-02-29"))).toBe(true);
    expect(eventFallsOn("2026-01-31", "monthly", d("2026-02-28"))).toBe(true);
    expect(eventFallsOn("2026-01-31", "monthly", d("2026-03-30"))).toBe(false);
    expect(eventFallsOn("2026-12-01", "yearly", d("2026-11-30"))).toBe(false);
    expect(eventFallsOn("not a date", "none", d("2026-11-10"))).toBe(false);
  });

  it("reminds each of the two on the day, from 9:00 their time, once", async () => {
    const saved = await api.call("POST", "/v1/events", {
      cookie: api.cookies.selam,
      body: {
        title: "Our walk",
        kind: "anniversary",
        firstDate: "2025-03-14",
        timeZone: "Africa/Addis_Ababa",
        repeats: "yearly",
      },
    });
    expect(saved.statusCode).toBe(201);
    await api.call("PATCH", "/v1/me/setup", {
      cookie: api.cookies.selam,
      body: { timeZone: "Africa/Addis_Ababa" },
    });
    await api.call("PATCH", "/v1/me/setup", {
      cookie: api.cookies.noah,
      body: { timeZone: "Europe/London" },
    });
    const scheduler = new NotificationScheduler(api.kysely, api.nest.get(NotificationsService));
    // 08:00 in Addis, 05:00 in London: too early for both.
    await scheduler.runOnce(Temporal.Instant.from("2026-03-14T05:00:00Z"));
    expect(await noticesFor(DEV_PEOPLE.selam.id, "birthday")).toHaveLength(0);
    // 09:30 in Addis: Selam, not yet Noah.
    await scheduler.runOnce(Temporal.Instant.from("2026-03-14T06:30:00Z"));
    expect(await noticesFor(DEV_PEOPLE.selam.id, "birthday")).toHaveLength(1);
    expect(await noticesFor(DEV_PEOPLE.noah.id, "birthday")).toHaveLength(0);
    // 09:30 in London, and again later, with a second process: once each.
    const other = new NotificationScheduler(api.kysely, api.nest.get(NotificationsService));
    await Promise.all([
      scheduler.runOnce(Temporal.Instant.from("2026-03-14T09:30:00Z")),
      other.runOnce(Temporal.Instant.from("2026-03-14T09:30:00Z")),
    ]);
    await scheduler.runOnce(Temporal.Instant.from("2026-03-14T15:00:00Z"));
    expect(await noticesFor(DEV_PEOPLE.selam.id, "birthday")).toHaveLength(1);
    expect(await noticesFor(DEV_PEOPLE.noah.id, "birthday")).toHaveLength(1);
    expect(JSON.stringify(await noticesFor(DEV_PEOPLE.noah.id, "birthday"))).not.toContain(
      "Our walk",
    );
  });

  it("announces a dated surprise on its day, once", async () => {
    await api.call("POST", "/v1/surprises", {
      cookie: api.cookies.selam,
      body: {
        content: { kind: "idea", textContent: "A secret" },
        reveal: { kind: "date", date: "2026-06-01" },
      },
    });
    const before = (await noticesFor(DEV_PEOPLE.noah.id, "surprise")).length;
    const scheduler = new NotificationScheduler(api.kysely, api.nest.get(NotificationsService));
    await scheduler.runOnce(Temporal.Instant.from("2026-05-31T12:00:00Z"));
    expect(await noticesFor(DEV_PEOPLE.noah.id, "surprise")).toHaveLength(before);
    await scheduler.runOnce(Temporal.Instant.from("2026-06-01T12:00:00Z"));
    await scheduler.runOnce(Temporal.Instant.from("2026-06-02T12:00:00Z"));
    expect(await noticesFor(DEV_PEOPLE.noah.id, "surprise")).toHaveLength(before + 1);
  });
});
