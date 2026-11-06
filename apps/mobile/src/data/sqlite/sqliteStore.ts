/**
 * SQLite durable storage driver and store (B3, P-81, P-91, ADR-0003, F-04).
 *
 * Implements client-side offline persistence and durable outbox for:
 * - confirmed_entries: Days entries & reflections.
 * - outbox_mutations: Ordered queue of pending client writes.
 * - sync_meta: Sync cursor sequence.
 * - confirmed_messages & reactions: Chat history.
 * - confirmed_letters: Open When letters.
 * - confirmed_surprises: Unlockable surprises.
 * - confirmed_memories: Memory archive.
 * - confirmed_events: Calendar events & anniversaries.
 * - confirmed_together: Bucket list plans, places, and soundtrack links.
 * - sync_signals: Gentle connection signals.
 * - local_settings: User and partner settings cache.
 */
import type { EntryDto, Mutation } from "@garnet/contracts";
import * as SQLite from "expo-sqlite";
import { INIT_SQL } from "./schema";

export interface SqliteDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<void>;
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: unknown[]): Promise<T | null>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface StoredMessage {
  id: string;
  relationshipId: string;
  senderId: string;
  kind: string;
  body: string;
  mediaId: string | null;
  replyToId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedForAll: boolean;
  pinned: boolean;
}

export interface StoredReaction {
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface StoredLetter {
  id: string;
  relationshipId: string;
  authorId: string;
  recipientId: string;
  prompt: string;
  body: string | null;
  status: string;
  openedAt: string | null;
  createdAt: string;
}

export interface StoredSurprise {
  id: string;
  relationshipId: string;
  authorId: string;
  recipientId: string;
  title: string;
  note: string | null;
  status: string;
  unlockAt: string | null;
  openedAt: string | null;
  createdAt: string;
}

export interface StoredMemory {
  id: string;
  relationshipId: string;
  title: string;
  note: string | null;
  mediaId: string | null;
  savedAt: string;
}

export interface StoredEvent {
  id: string;
  relationshipId: string;
  title: string;
  date: string | null;
  repeats: string | null;
  inDays: number | null;
  createdAt: string;
}

export interface StoredTogether {
  id: string;
  relationshipId: string;
  title: string;
  kind: string;
  completed: boolean;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface StoredSignal {
  id: string;
  relationshipId: string;
  senderId: string;
  signal: string;
  createdAt: string;
  respondedAt: string | null;
  response: string | null;
}

function toStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return val.toString();
  return "";
}

function toNullableStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return val.toString();
  return null;
}

export class InMemorySqliteDriver implements SqliteDriver {
  private confirmed = new Map<string, EntryDto>();
  private outbox: {
    mutation_id: string;
    entry_id: string;
    kind: string;
    payload: string;
    base_version: number | null;
    created_at: string;
  }[] = [];
  private meta = new Map<string, string>();

  private messages = new Map<string, StoredMessage>();
  private reactions = new Map<string, StoredReaction>();
  private letters = new Map<string, StoredLetter>();
  private surprises = new Map<string, StoredSurprise>();
  private memories = new Map<string, StoredMemory>();
  private events = new Map<string, StoredEvent>();
  private together = new Map<string, StoredTogether>();
  private signals = new Map<string, StoredSignal>();
  private settings = new Map<string, string>();

  exec(sql: string): Promise<void> {
    if (sql.includes("DROP TABLE")) {
      this.confirmed.clear();
      this.outbox = [];
      this.meta.clear();
      this.messages.clear();
      this.reactions.clear();
      this.letters.clear();
      this.surprises.clear();
      this.memories.clear();
      this.events.clear();
      this.together.clear();
      this.signals.clear();
      this.settings.clear();
    }
    return Promise.resolve();
  }

  run(sql: string, params: unknown[] = []): Promise<void> {
    const cleanSql = sql.trim();

    // 1. confirmed_entries
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_entries")) {
      const entry: EntryDto = {
        id: toStr(params[0]),
        authorId: toStr(params[1]),
        kind: params[2] as EntryDto["kind"],
        body: toStr(params[3]),
        emoji: toNullableStr(params[4]),
        mood: toNullableStr(params[5]),
        activity: toNullableStr(params[6]),
        place: toNullableStr(params[7]),
        visibility: params[8] as EntryDto["visibility"],
        occurredAt: toStr(params[9]),
        occurredTimeZone: toStr(params[10]),
        sharedAt: toNullableStr(params[11]),
        sharedDay: toNullableStr(params[12]),
        version: Number(params[13]),
        revealedAt: toNullableStr(params[14]),
        createdAt: toStr(params[15]),
        updatedAt: toStr(params[16]),
      };
      this.confirmed.set(entry.id, entry);
      return Promise.resolve();
    }
    if (cleanSql.startsWith("DELETE FROM confirmed_entries WHERE id =")) {
      this.confirmed.delete(toStr(params[0]));
      return Promise.resolve();
    }

    // 2. outbox_mutations
    if (cleanSql.startsWith("INSERT INTO outbox_mutations")) {
      this.outbox.push({
        mutation_id: toStr(params[0]),
        entry_id: toStr(params[1]),
        kind: toStr(params[2]),
        payload: toStr(params[3]),
        base_version: params[4] !== undefined && params[4] !== null ? Number(params[4]) : null,
        created_at: toStr(params[5]),
      });
      return Promise.resolve();
    }
    if (cleanSql.startsWith("DELETE FROM outbox_mutations WHERE mutation_id =")) {
      this.outbox = this.outbox.filter((m) => m.mutation_id !== toStr(params[0]));
      return Promise.resolve();
    }
    if (cleanSql.startsWith("DELETE FROM outbox_mutations WHERE entry_id =")) {
      if (cleanSql.includes("AND kind <> 'delete'")) {
        this.outbox = this.outbox.filter(
          (m) => !(m.entry_id === toStr(params[0]) && m.kind !== "delete"),
        );
      } else {
        this.outbox = this.outbox.filter((m) => m.entry_id !== toStr(params[0]));
      }
      return Promise.resolve();
    }

    // 3. sync_meta
    if (cleanSql.startsWith("INSERT OR REPLACE INTO sync_meta")) {
      this.meta.set(toStr(params[0]), toStr(params[1]));
      return Promise.resolve();
    }

    // 4. confirmed_messages
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_messages")) {
      const msg: StoredMessage = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        senderId: toStr(params[2]),
        kind: toStr(params[3]),
        body: toStr(params[4]),
        mediaId: toNullableStr(params[5]),
        replyToId: toNullableStr(params[6]),
        createdAt: toStr(params[7]),
        editedAt: toNullableStr(params[8]),
        deletedForAll: Boolean(params[9]),
        pinned: Boolean(params[10]),
      };
      this.messages.set(msg.id, msg);
      return Promise.resolve();
    }
    if (cleanSql.startsWith("UPDATE confirmed_messages SET pinned =")) {
      const msg = this.messages.get(toStr(params[1]));
      if (msg) {
        msg.pinned = Boolean(params[0]);
      }
      return Promise.resolve();
    }

    // 5. confirmed_reactions
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_reactions")) {
      const key = `${toStr(params[0])}:${toStr(params[1])}:${toStr(params[2])}`;
      this.reactions.set(key, {
        messageId: toStr(params[0]),
        userId: toStr(params[1]),
        emoji: toStr(params[2]),
        createdAt: toStr(params[3]),
      });
      return Promise.resolve();
    }
    if (cleanSql.startsWith("DELETE FROM confirmed_reactions WHERE message_id =")) {
      const key = `${toStr(params[0])}:${toStr(params[1])}:${toStr(params[2])}`;
      this.reactions.delete(key);
      return Promise.resolve();
    }

    // 6. confirmed_letters
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_letters")) {
      const letter: StoredLetter = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        authorId: toStr(params[2]),
        recipientId: toStr(params[3]),
        prompt: toStr(params[4]),
        body: toNullableStr(params[5]),
        status: toStr(params[6]),
        openedAt: toNullableStr(params[7]),
        createdAt: toStr(params[8]),
      };
      this.letters.set(letter.id, letter);
      return Promise.resolve();
    }

    // 7. confirmed_surprises
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_surprises")) {
      const surprise: StoredSurprise = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        authorId: toStr(params[2]),
        recipientId: toStr(params[3]),
        title: toStr(params[4]),
        note: toNullableStr(params[5]),
        status: toStr(params[6]),
        unlockAt: toNullableStr(params[7]),
        openedAt: toNullableStr(params[8]),
        createdAt: toStr(params[9]),
      };
      this.surprises.set(surprise.id, surprise);
      return Promise.resolve();
    }

    // 8. confirmed_memories
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_memories")) {
      const memory: StoredMemory = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        title: toStr(params[2]),
        note: toNullableStr(params[3]),
        mediaId: toNullableStr(params[4]),
        savedAt: toStr(params[5]),
      };
      this.memories.set(memory.id, memory);
      return Promise.resolve();
    }

    // 9. confirmed_events
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_events")) {
      const event: StoredEvent = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        title: toStr(params[2]),
        date: toNullableStr(params[3]),
        repeats: toNullableStr(params[4]),
        inDays: params[5] !== undefined && params[5] !== null ? Number(params[5]) : null,
        createdAt: toStr(params[6]),
      };
      this.events.set(event.id, event);
      return Promise.resolve();
    }

    // 10. confirmed_together
    if (cleanSql.startsWith("INSERT OR REPLACE INTO confirmed_together")) {
      const item: StoredTogether = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        title: toStr(params[2]),
        kind: toStr(params[3]),
        completed: Boolean(params[4]),
        completedAt: toNullableStr(params[5]),
        note: toNullableStr(params[6]),
        createdAt: toStr(params[7]),
      };
      this.together.set(item.id, item);
      return Promise.resolve();
    }

    // 11. sync_signals
    if (cleanSql.startsWith("INSERT OR REPLACE INTO sync_signals")) {
      const sig: StoredSignal = {
        id: toStr(params[0]),
        relationshipId: toStr(params[1]),
        senderId: toStr(params[2]),
        signal: toStr(params[3]),
        createdAt: toStr(params[4]),
        respondedAt: toNullableStr(params[5]),
        response: toNullableStr(params[6]),
      };
      this.signals.set(sig.id, sig);
      return Promise.resolve();
    }

    // 12. local_settings
    if (cleanSql.startsWith("INSERT OR REPLACE INTO local_settings")) {
      this.settings.set(toStr(params[0]), toStr(params[1]));
      return Promise.resolve();
    }

    return Promise.resolve();
  }

  getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (sql.includes("FROM confirmed_entries")) {
      return Promise.resolve(Array.from(this.confirmed.values()) as unknown as T[]);
    }
    if (sql.includes("FROM outbox_mutations")) {
      return Promise.resolve([...this.outbox] as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_messages")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.messages.values())
        .filter((m) => relId === null || m.relationshipId === relId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_reactions")) {
      const msgId = toNullableStr(params[0]);
      const list = Array.from(this.reactions.values()).filter(
        (r) => msgId === null || r.messageId === msgId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_letters")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.letters.values()).filter(
        (l) => relId === null || l.relationshipId === relId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_surprises")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.surprises.values()).filter(
        (s) => relId === null || s.relationshipId === relId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_memories")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.memories.values()).filter(
        (m) => relId === null || m.relationshipId === relId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_events")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.events.values()).filter(
        (e) => relId === null || e.relationshipId === relId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM confirmed_together")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.together.values()).filter(
        (t) => relId === null || t.relationshipId === relId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    if (sql.includes("FROM sync_signals")) {
      const relId = toNullableStr(params[0]);
      const list = Array.from(this.signals.values()).filter(
        (s) => relId === null || s.relationshipId === relId,
      );
      return Promise.resolve(list as unknown as T[]);
    }
    return Promise.resolve([]);
  }

  getFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    if (sql.includes("FROM sync_meta WHERE key =")) {
      const val = this.meta.get(toStr(params[0]));
      return Promise.resolve(val ? ({ value: val } as unknown as T) : null);
    }
    if (sql.includes("FROM confirmed_entries WHERE id =")) {
      const e = this.confirmed.get(toStr(params[0]));
      return Promise.resolve(e ? (e as unknown as T) : null);
    }
    if (sql.includes("FROM local_settings WHERE user_id =")) {
      const s = this.settings.get(toStr(params[0]));
      return Promise.resolve(s ? ({ settings_json: s } as unknown as T) : null);
    }
    return Promise.resolve(null);
  }

  withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

export function createDefaultDriver(): SqliteDriver {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
    return new InMemorySqliteDriver();
  }
  try {
    if (typeof SQLite.openDatabaseSync === "function") {
      const db = SQLite.openDatabaseSync("garnet_sync.db");
      return {
        exec: (sql) => {
          db.execSync(sql);
          return Promise.resolve();
        },
        run: (sql, params = []) => {
          db.runSync(sql, ...(params as SQLite.SQLiteBindValue[]));
          return Promise.resolve();
        },
        getAll: <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
          const rows = db.getAllSync<T>(sql, ...(params as SQLite.SQLiteBindValue[]));
          return Promise.resolve(rows);
        },
        getFirst: <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
          const row = db.getFirstSync<T>(sql, ...(params as SQLite.SQLiteBindValue[]));
          return Promise.resolve(row ?? null);
        },
        withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
          db.execSync("BEGIN");
          try {
            const result = await fn();
            db.execSync("COMMIT");
            return result;
          } catch (err) {
            db.execSync("ROLLBACK");
            throw err;
          }
        },
      };
    }
  } catch {
    // Fall back to in-memory if native module is absent
  }
  return new InMemorySqliteDriver();
}

export class SqliteStore {
  private ready: Promise<void> | null = null;

  constructor(private readonly driver: SqliteDriver = createDefaultDriver()) {}

  private async ensureInit(): Promise<void> {
    this.ready ??= this.driver.exec(INIT_SQL);
    await this.ready;
  }

  // --- 1. Days Entries ---
  async saveConfirmedEntry(entry: EntryDto): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_entries (
        id, author_id, kind, body, emoji, mood, activity, place,
        visibility, occurred_at, occurred_time_zone, shared_at, shared_day,
        version, revealed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.authorId,
        entry.kind,
        entry.body,
        entry.emoji ?? null,
        entry.mood ?? null,
        entry.activity ?? null,
        entry.place ?? null,
        entry.visibility,
        entry.occurredAt,
        entry.occurredTimeZone,
        entry.sharedAt ?? null,
        entry.sharedDay ?? null,
        entry.version,
        entry.revealedAt ?? null,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
  }

  async removeConfirmedEntry(id: string): Promise<void> {
    await this.ensureInit();
    await this.driver.run("DELETE FROM confirmed_entries WHERE id = ?", [id]);
  }

  async getConfirmedEntries(): Promise<EntryDto[]> {
    await this.ensureInit();
    return this.driver.getAll<EntryDto>("SELECT * FROM confirmed_entries");
  }

  // --- 2. Outbox Mutations ---
  async enqueueMutation(mutation: Mutation, baseVersion?: number): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT INTO outbox_mutations (mutation_id, entry_id, kind, payload, base_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mutation.mutationId,
        mutation.entryId,
        mutation.kind,
        JSON.stringify(mutation),
        baseVersion ?? null,
        new Date().toISOString(),
      ],
    );
  }

  async getOutbox(): Promise<{ mutation: Mutation; baseVersion?: number }[]> {
    await this.ensureInit();
    interface OutboxRow {
      mutation_id: string;
      entry_id: string;
      kind: string;
      payload: string;
      base_version: number | null;
      created_at: string;
    }
    const rows = await this.driver.getAll<OutboxRow>(
      "SELECT * FROM outbox_mutations ORDER BY created_at ASC",
    );
    return rows.map((r) => ({
      mutation: JSON.parse(r.payload) as Mutation,
      ...(r.base_version !== null ? { baseVersion: r.base_version } : {}),
    }));
  }

  async removeOutboxMutation(mutationId: string): Promise<void> {
    await this.ensureInit();
    await this.driver.run("DELETE FROM outbox_mutations WHERE mutation_id = ?", [mutationId]);
  }

  async dropQueuedForEntry(entryId: string, keepDeletes = false): Promise<void> {
    await this.ensureInit();
    if (keepDeletes) {
      await this.driver.run(
        "DELETE FROM outbox_mutations WHERE entry_id = ? AND kind <> 'delete'",
        [entryId],
      );
    } else {
      await this.driver.run("DELETE FROM outbox_mutations WHERE entry_id = ?", [entryId]);
    }
  }

  // --- 3. Sync Cursor ---
  async getCursor(): Promise<string> {
    await this.ensureInit();
    const row = await this.driver.getFirst<{ value: string }>(
      "SELECT value FROM sync_meta WHERE key = ?",
      ["cursor"],
    );
    return row?.value ?? "0";
  }

  async setCursor(cursor: string): Promise<void> {
    await this.ensureInit();
    await this.driver.run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)", [
      "cursor",
      cursor,
    ]);
  }

  // --- 4. Chat Messages & Reactions ---
  async saveConfirmedMessage(msg: StoredMessage): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_messages (
        id, relationship_id, sender_id, kind, body, media_id, reply_to_id,
        created_at, edited_at, deleted_for_all, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.relationshipId,
        msg.senderId,
        msg.kind,
        msg.body,
        msg.mediaId,
        msg.replyToId,
        msg.createdAt,
        msg.editedAt,
        msg.deletedForAll ? 1 : 0,
        msg.pinned ? 1 : 0,
      ],
    );
  }

  async getConfirmedMessages(relationshipId: string): Promise<StoredMessage[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredMessage>(
      "SELECT * FROM confirmed_messages WHERE relationship_id = ? ORDER BY created_at ASC",
      [relationshipId],
    );
  }

  async toggleMessagePin(messageId: string, pinned: boolean): Promise<void> {
    await this.ensureInit();
    await this.driver.run("UPDATE confirmed_messages SET pinned = ? WHERE id = ?", [
      pinned ? 1 : 0,
      messageId,
    ]);
  }

  async saveReaction(reaction: StoredReaction): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      "INSERT OR REPLACE INTO confirmed_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)",
      [reaction.messageId, reaction.userId, reaction.emoji, reaction.createdAt],
    );
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      "DELETE FROM confirmed_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
      [messageId, userId, emoji],
    );
  }

  async getReactions(messageId: string): Promise<StoredReaction[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredReaction>(
      "SELECT * FROM confirmed_reactions WHERE message_id = ?",
      [messageId],
    );
  }

  // --- 5. Moments: Open When Letters ---
  async saveConfirmedLetter(letter: StoredLetter): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_letters (
        id, relationship_id, author_id, recipient_id, prompt, body, status, opened_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        letter.id,
        letter.relationshipId,
        letter.authorId,
        letter.recipientId,
        letter.prompt,
        letter.body,
        letter.status,
        letter.openedAt,
        letter.createdAt,
      ],
    );
  }

  async getConfirmedLetters(relationshipId: string): Promise<StoredLetter[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredLetter>(
      "SELECT * FROM confirmed_letters WHERE relationship_id = ? ORDER BY created_at DESC",
      [relationshipId],
    );
  }

  // --- 6. Moments: Surprises ---
  async saveConfirmedSurprise(surprise: StoredSurprise): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_surprises (
        id, relationship_id, author_id, recipient_id, title, note, status, unlock_at, opened_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        surprise.id,
        surprise.relationshipId,
        surprise.authorId,
        surprise.recipientId,
        surprise.title,
        surprise.note,
        surprise.status,
        surprise.unlockAt,
        surprise.openedAt,
        surprise.createdAt,
      ],
    );
  }

  async getConfirmedSurprises(relationshipId: string): Promise<StoredSurprise[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredSurprise>(
      "SELECT * FROM confirmed_surprises WHERE relationship_id = ? ORDER BY created_at DESC",
      [relationshipId],
    );
  }

  // --- 7. Memories ---
  async saveConfirmedMemory(memory: StoredMemory): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_memories (
        id, relationship_id, title, note, media_id, saved_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [memory.id, memory.relationshipId, memory.title, memory.note, memory.mediaId, memory.savedAt],
    );
  }

  async getConfirmedMemories(relationshipId: string): Promise<StoredMemory[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredMemory>(
      "SELECT * FROM confirmed_memories WHERE relationship_id = ? ORDER BY saved_at DESC",
      [relationshipId],
    );
  }

  // --- 8. Events ---
  async saveConfirmedEvent(event: StoredEvent): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_events (
        id, relationship_id, title, date, repeats, in_days, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.relationshipId,
        event.title,
        event.date,
        event.repeats,
        event.inDays,
        event.createdAt,
      ],
    );
  }

  async getConfirmedEvents(relationshipId: string): Promise<StoredEvent[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredEvent>(
      "SELECT * FROM confirmed_events WHERE relationship_id = ? ORDER BY date ASC",
      [relationshipId],
    );
  }

  // --- 9. Together ---
  async saveConfirmedTogether(item: StoredTogether): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO confirmed_together (
        id, relationship_id, title, kind, completed, completed_at, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.relationshipId,
        item.title,
        item.kind,
        item.completed ? 1 : 0,
        item.completedAt,
        item.note,
        item.createdAt,
      ],
    );
  }

  async getConfirmedTogether(relationshipId: string): Promise<StoredTogether[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredTogether>(
      "SELECT * FROM confirmed_together WHERE relationship_id = ? ORDER BY created_at DESC",
      [relationshipId],
    );
  }

  // --- 10. Signals ---
  async saveSyncSignal(sig: StoredSignal): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      `INSERT OR REPLACE INTO sync_signals (
        id, relationship_id, sender_id, signal, created_at, responded_at, response
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sig.id,
        sig.relationshipId,
        sig.senderId,
        sig.signal,
        sig.createdAt,
        sig.respondedAt,
        sig.response,
      ],
    );
  }

  async getSyncSignals(relationshipId: string): Promise<StoredSignal[]> {
    await this.ensureInit();
    return this.driver.getAll<StoredSignal>(
      "SELECT * FROM sync_signals WHERE relationship_id = ? ORDER BY created_at DESC",
      [relationshipId],
    );
  }

  // --- 11. Local Settings ---
  async saveLocalSettings(userId: string, settingsJson: string): Promise<void> {
    await this.ensureInit();
    await this.driver.run(
      "INSERT OR REPLACE INTO local_settings (user_id, settings_json, updated_at) VALUES (?, ?, ?)",
      [userId, settingsJson, new Date().toISOString()],
    );
  }

  async getLocalSettings(userId: string): Promise<string | null> {
    await this.ensureInit();
    const row = await this.driver.getFirst<{ settings_json: string }>(
      "SELECT settings_json FROM local_settings WHERE user_id = ?",
      [userId],
    );
    return row?.settings_json ?? null;
  }

  // --- 12. Lifecycle Cleanup ---
  async clearAll(): Promise<void> {
    this.ready = null;
    await this.driver.exec(
      "DROP TABLE IF EXISTS confirmed_entries; " +
        "DROP TABLE IF EXISTS outbox_mutations; " +
        "DROP TABLE IF EXISTS sync_meta; " +
        "DROP TABLE IF EXISTS confirmed_messages; " +
        "DROP TABLE IF EXISTS confirmed_reactions; " +
        "DROP TABLE IF EXISTS confirmed_letters; " +
        "DROP TABLE IF EXISTS confirmed_surprises; " +
        "DROP TABLE IF EXISTS confirmed_memories; " +
        "DROP TABLE IF EXISTS confirmed_events; " +
        "DROP TABLE IF EXISTS confirmed_together; " +
        "DROP TABLE IF EXISTS sync_signals; " +
        "DROP TABLE IF EXISTS local_settings; " +
        INIT_SQL,
    );
  }
}
