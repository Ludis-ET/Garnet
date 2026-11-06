/**
 * SqliteStore unit tests (Milestone B3, P-81, P-91, ADR-0003).
 *
 * Verifies local-first SQLite persistence for all domains:
 * - Days entries & outbox mutations
 * - Chat messages & reactions
 * - Moments (Letters, Surprises, Memories, Events, Together)
 * - Connection signals & local settings
 */
import { InMemorySqliteDriver, SqliteStore } from "./sqliteStore";

describe("SqliteStore universal persistence", () => {
  let store: SqliteStore;

  beforeEach(async () => {
    store = new SqliteStore(new InMemorySqliteDriver());
    await store.clearAll();
  });

  it("persists days entries and manages outbox queue", async () => {
    await store.saveConfirmedEntry({
      id: "entry_1",
      authorId: "usr_1",
      kind: "text",
      body: "Morning coffee together in London",
      emoji: "☕",
      mood: "calm",
      activity: "coffee",
      place: "London",
      visibility: "shared",
      occurredAt: "2026-11-06T08:00:00Z",
      occurredTimeZone: "Europe/London",
      sharedAt: "2026-11-06T08:05:00Z",
      sharedDay: "2026-11-06",
      version: 1,
      revealedAt: null,
      createdAt: "2026-11-06T08:00:00Z",
      updatedAt: "2026-11-06T08:05:00Z",
    });

    const entries = await store.getConfirmedEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.body).toBe("Morning coffee together in London");

    await store.enqueueMutation({
      mutationId: "mut_1",
      entryId: "entry_1",
      baseVersion: 1,
      kind: "edit",
      body: "Updated morning coffee",
      occurredAt: "2026-11-06T08:00:00Z",
    });

    const outbox = await store.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.mutation.mutationId).toBe("mut_1");

    await store.removeOutboxMutation("mut_1");
    expect(await store.getOutbox()).toHaveLength(0);

    await store.removeConfirmedEntry("entry_1");
    expect(await store.getConfirmedEntries()).toHaveLength(0);
  });

  it("persists and reads chat messages and reactions", async () => {
    const relId = "rel_garnet_0001";
    await store.saveConfirmedMessage({
      id: "msg_1",
      relationshipId: relId,
      senderId: "usr_ruby",
      kind: "text",
      body: "Good morning from Addis Ababa!",
      mediaId: null,
      replyToId: null,
      createdAt: "2026-11-06T06:00:00Z",
      editedAt: null,
      deletedForAll: false,
      pinned: false,
    });

    const messages = await store.getConfirmedMessages(relId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("Good morning from Addis Ababa!");
    expect(messages[0]?.pinned).toBe(false);

    await store.toggleMessagePin("msg_1", true);
    const updated = await store.getConfirmedMessages(relId);
    expect(updated[0]?.pinned).toBe(true);

    await store.saveReaction({
      messageId: "msg_1",
      userId: "usr_sapphire",
      emoji: "💖",
      createdAt: "2026-11-06T06:01:00Z",
    });

    const reactions = await store.getReactions("msg_1");
    expect(reactions).toHaveLength(1);
    expect(reactions[0]?.emoji).toBe("💖");

    await store.removeReaction("msg_1", "usr_sapphire", "💖");
    expect(await store.getReactions("msg_1")).toHaveLength(0);
  });

  it("persists and reads Moments (Letters, Surprises, Memories, Events, Together)", async () => {
    const relId = "rel_garnet_0001";

    // 1. Letters
    await store.saveConfirmedLetter({
      id: "letter_1",
      relationshipId: relId,
      authorId: "usr_ruby",
      recipientId: "usr_sapphire",
      prompt: "Open when you miss me",
      body: null, // sealed under §5
      status: "sealed",
      openedAt: null,
      createdAt: "2026-11-06T10:00:00Z",
    });
    const letters = await store.getConfirmedLetters(relId);
    expect(letters).toHaveLength(1);
    expect(letters[0]?.prompt).toBe("Open when you miss me");
    expect(letters[0]?.status).toBe("sealed");

    // 2. Surprises
    await store.saveConfirmedSurprise({
      id: "surp_1",
      relationshipId: relId,
      authorId: "usr_sapphire",
      recipientId: "usr_ruby",
      title: "Evening flight surprise",
      note: "Pack your warmest scarf",
      status: "scheduled",
      unlockAt: "2026-11-10T18:00:00Z",
      openedAt: null,
      createdAt: "2026-11-06T11:00:00Z",
    });
    const surprises = await store.getConfirmedSurprises(relId);
    expect(surprises).toHaveLength(1);
    expect(surprises[0]?.title).toBe("Evening flight surprise");

    // 3. Memories
    await store.saveConfirmedMemory({
      id: "mem_1",
      relationshipId: relId,
      title: "Our first walk in Bole",
      note: "Warm afternoon sun",
      mediaId: "med_123",
      savedAt: "2026-11-06T12:00:00Z",
    });
    const memories = await store.getConfirmedMemories(relId);
    expect(memories).toHaveLength(1);
    expect(memories[0]?.title).toBe("Our first walk in Bole");

    // 4. Events
    await store.saveConfirmedEvent({
      id: "evt_1",
      relationshipId: relId,
      title: "Flight to London",
      date: "2026-12-15",
      repeats: "yearly",
      inDays: 39,
      createdAt: "2026-11-06T13:00:00Z",
    });
    const events = await store.getConfirmedEvents(relId);
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Flight to London");

    // 5. Together
    await store.saveConfirmedTogether({
      id: "tog_1",
      relationshipId: relId,
      title: "Visit Entoto park at sunrise",
      kind: "place",
      completed: false,
      completedAt: null,
      note: "Bring warm tea",
      createdAt: "2026-11-06T14:00:00Z",
    });
    const together = await store.getConfirmedTogether(relId);
    expect(together).toHaveLength(1);
    expect(together[0]?.title).toBe("Visit Entoto park at sunrise");
  });

  it("persists connection signals and local settings cache", async () => {
    const relId = "rel_garnet_0001";
    await store.saveSyncSignal({
      id: "sig_1",
      relationshipId: relId,
      senderId: "usr_ruby",
      signal: "thought-of-you",
      createdAt: "2026-11-06T15:00:00Z",
      respondedAt: null,
      response: null,
    });
    const signals = await store.getSyncSignals(relId);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.signal).toBe("thought-of-you");

    await store.saveLocalSettings("usr_ruby", JSON.stringify({ quietHours: { enabled: true } }));
    const settings = await store.getLocalSettings("usr_ruby");
    expect(settings).not.toBeNull();
    expect(JSON.parse(settings ?? "{}")).toEqual({ quietHours: { enabled: true } });
  });

  it("handles cursor get and set", async () => {
    expect(await store.getCursor()).toBe("0");
    await store.setCursor("142");
    expect(await store.getCursor()).toBe("142");
  });
});
