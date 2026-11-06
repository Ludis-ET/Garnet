/**
 * Mobile local SQLite schema (B3, P-81, P-91, ADR-0003, F-04).
 *
 * Persists local-first confirmed server state received from API / change feeds:
 * - confirmed_entries: Days entries and timeline reflections.
 * - outbox_mutations: Durable, strictly ordered queue of pending client writes.
 * - sync_meta: Sync cursor sequence for change feed tracking.
 * - confirmed_messages & reactions: Chat message history and reactions.
 * - confirmed_letters: Open When letters (body sealed until opened under §5).
 * - confirmed_surprises: Scheduled unlockable surprises.
 * - confirmed_memories: Saved milestone moments and photos.
 * - confirmed_events: Dual-timezone calendar events & anniversaries.
 * - confirmed_together: Shared bucket lists, visited places, and soundtrack links.
 * - sync_signals: Gentle connection signals exchanged.
 * - local_settings: User and partner settings cache.
 */

export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS confirmed_entries (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT,
  mood TEXT,
  activity TEXT,
  place TEXT,
  visibility TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  occurred_time_zone TEXT NOT NULL,
  shared_at TEXT,
  shared_day TEXT,
  version INTEGER NOT NULL,
  revealed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_mutations (
  mutation_id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  base_version INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmed_messages (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  media_id TEXT,
  reply_to_id TEXT,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  deleted_for_all INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS confirmed_reactions (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS confirmed_letters (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  prompt TEXT,
  body TEXT,
  status TEXT NOT NULL,
  opened_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmed_surprises (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL,
  unlock_at TEXT,
  opened_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmed_memories (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  media_id TEXT,
  saved_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmed_events (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT,
  repeats TEXT,
  in_days INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmed_together (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_signals (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  signal TEXT NOT NULL,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  response TEXT
);

CREATE TABLE IF NOT EXISTS local_settings (
  user_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
