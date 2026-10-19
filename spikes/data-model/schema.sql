-- =============================================================================================
-- Garnet — DRAFT data model (Phase 1, spike F-05). PostgreSQL 17.
--
-- Status: DRAFT FOR REVIEW. Not a migration. Phase 2 ports this to the chosen migration tool.
-- Design notes and open questions: docs/architecture/data-model.md
--
-- Principles encoded structurally (not just in application code):
--   * Exactly two partners per relationship; one active relationship per user.        §2
--   * Private drafts are visible to their author only — enforced by row-level security. §2, §11
--   * Every relationship-scoped row is reachable only by its members (anti-IDOR/BOLA).  §12
--   * Deleted entities leave content-free tombstones; ids can never be reused.          §11, P-05
--   * Media deletion is guaranteed via a purge queue (transactional outbox).            §11
--   * Shared Spark stores no per-partner contribution data — blame is impossible.      §7, P-09
--   * Secrets (password hashes, token hashes) never leave the server; raw tokens are
--     never stored.                                                                     §12
-- =============================================================================================

-- ---- Roles & request context ----------------------------------------------------------------

-- The API connects as an owner role for migrations, and runs every request as garnet_app with
-- app.user_id set for the transaction. RLS is defence-in-depth BEHIND API authorization (P-06).
create role garnet_app nologin;

create function app_current_user() returns uuid
  language sql stable
  as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create function app_current_mutation() returns uuid
  language sql stable
  as $$ select nullif(current_setting('app.mutation_id', true), '')::uuid $$;

-- ---- Accounts --------------------------------------------------------------------------------

create table app_user (
  id                    uuid primary key,
  email                 text not null unique check (email = lower(email) and position('@' in email) > 1),
  password_hash         text not null,           -- argon2id encoded string (P-11). Never logged.
  email_verified_at     timestamptz,
  created_at            timestamptz not null default now(),
  deletion_requested_at timestamptz
);

create table session (
  id           uuid primary key,
  user_id      uuid not null references app_user (id) on delete cascade,
  token_hash   bytea not null unique check (octet_length(token_hash) = 32), -- SHA-256 of opaque token
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  check (expires_at > created_at)
);

-- ---- Relationship & pairing ------------------------------------------------------------------

create table relationship (
  id                  uuid primary key,
  reference_time_zone text not null default 'Europe/London', -- D-13 (proposed)
  day_cutoff          time,                                  -- U-02: NULL until decided
  created_at          timestamptz not null default now(),
  ended_at            timestamptz
);

create table relationship_member (
  relationship_id uuid not null references relationship (id) on delete cascade,
  user_id         uuid not null references app_user (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  left_at         timestamptz,
  primary key (relationship_id, user_id)
);

-- One active relationship per user.
create unique index one_active_relationship_per_user
  on relationship_member (user_id) where left_at is null;

-- Exactly two partners. The parent row lock serialises concurrent joins, so two simultaneous
-- invitations cannot both succeed.
create function enforce_two_members() returns trigger
  language plpgsql
  as $$
  begin
    perform 1 from relationship where id = new.relationship_id for update;
    if (select count(*) from relationship_member
         where relationship_id = new.relationship_id and left_at is null) >= 2 then
      raise exception 'relationship % already has two partners', new.relationship_id
        using errcode = 'GN409';
    end if;
    return new;
  end $$;

create trigger relationship_member_two_partners
  before insert on relationship_member
  for each row execute function enforce_two_members();

-- Is the current request's user an ACTIVE member of the relationship?
-- SECURITY DEFINER avoids RLS recursion on relationship_member.
create function is_active_member(rel uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (
      select 1 from relationship_member
       where relationship_id = rel and user_id = app_current_user() and left_at is null)
  $$;

create table invitation (
  id              uuid primary key,
  relationship_id uuid not null references relationship (id) on delete cascade,
  created_by      uuid not null references app_user (id) on delete cascade,
  token_hash      bytea not null unique check (octet_length(token_hash) = 32),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  consumed_by     uuid references app_user (id) on delete set null,
  revoked_at      timestamptz,
  -- Short-lived (§12). The exact TTL is a Phase 2 setting; the ceiling is enforced here.
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours')
);

-- Single-use, expiring, revocable. Atomic: the conditional UPDATE is the lock. The joining user
-- comes from the request context, never from a parameter, so it cannot be spoofed.
-- SECURITY DEFINER: the invitee is not yet a member, so RLS would hide everything.
create function accept_invitation(p_token_hash bytea) returns uuid
  language plpgsql security definer set search_path = public
  as $$
  declare
    rel uuid;
    p_user uuid := app_current_user();
  begin
    if p_user is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    update invitation
       set consumed_at = now(), consumed_by = p_user
     where token_hash = p_token_hash
       and consumed_at is null and revoked_at is null and expires_at > now()
       and created_by <> p_user
    returning relationship_id into rel;
    if rel is null then
      -- One indistinguishable error for unknown / used / expired / revoked tokens.
      raise exception 'invitation is not valid' using errcode = 'GN403';
    end if;
    insert into relationship_member (relationship_id, user_id) values (rel, p_user);
    return rel;
  end $$;

-- ---- Day Log entries -------------------------------------------------------------------------

create type entry_visibility as enum ('private', 'shared');

create table entry (
  id                 uuid primary key,          -- client-generated UUIDv7 (P-04)
  relationship_id    uuid not null,
  author_id          uuid not null,
  kind               text not null check (kind in
                       ('text','photo','video','voice','feeling','activity','food','work','location','custom')),
  body               text,
  visibility         entry_visibility not null default 'private',
  occurred_at        timestamptz not null,      -- event time as reported by the device, UTC (§4)
  occurred_time_zone text not null,             -- author's IANA zone then, for display only
  received_at        timestamptz not null default now(), -- server receipt (clock-skew checks, U-14)
  shared_at          timestamptz,
  shared_day         date,                      -- server-assigned when shared (§8)
  version            integer not null default 1 check (version >= 1),
  revealed_at        timestamptz,               -- included in a revealed recap → read-only (§4)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, relationship_id),
  -- The author must be a member of THIS relationship. NO ACTION on delete: account deletion is a
  -- deliberate workflow that decides what happens to shared memories (U-20), never a cascade.
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id),
  check ((visibility = 'shared') = (shared_at is not null)),
  check (visibility = 'shared' or shared_day is null),
  check (revealed_at is null or visibility = 'shared')
);

create index entry_feed on entry (relationship_id, shared_day, occurred_at);

-- ---- Tombstones ------------------------------------------------------------------------------

-- Content-free record that an id was deleted. Must outlive idempotency records and the longest
-- plausible stale device (backup restore) — spike F-04 finding; retention U-15.
create table tombstone (
  entity_type     text not null check (entity_type in ('entry', 'media', 'letter')),
  entity_id       uuid not null,
  relationship_id uuid not null references relationship (id) on delete cascade,
  deleted_at      timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

create function entry_guard_insert() returns trigger
  language plpgsql
  as $$
  begin
    if exists (select 1 from tombstone where entity_type = 'entry' and entity_id = new.id) then
      raise exception 'entry % was deleted', new.id using errcode = 'GN410';
    end if;
    return new;
  end $$;

create trigger entry_no_resurrection
  before insert on entry
  for each row execute function entry_guard_insert();

create function entry_guard_update() returns trigger
  language plpgsql
  as $$
  begin
    if old.revealed_at is not null and (
         new.body is distinct from old.body or new.kind is distinct from old.kind or
         new.occurred_at is distinct from old.occurred_at or new.visibility is distinct from old.visibility) then
      raise exception 'entry % is part of a revealed recap and is read-only', old.id
        using errcode = 'GN423';
    end if;
    if old.visibility = 'shared' and new.visibility = 'private' then
      raise exception 'a shared entry cannot become private again' using errcode = 'GN422';
    end if;
    new.updated_at := now();
    new.version := old.version + 1;
    return new;
  end $$;

create trigger entry_read_only_after_reveal
  before update on entry
  for each row execute function entry_guard_update();

create function entry_tombstone() returns trigger
  language plpgsql
  as $$
  begin
    insert into tombstone (entity_type, entity_id, relationship_id)
    values ('entry', old.id, old.relationship_id)
    on conflict do nothing;
    return old;
  end $$;

create trigger entry_write_tombstone
  after delete on entry
  for each row execute function entry_tombstone();

-- ---- Media -----------------------------------------------------------------------------------

create type media_status as enum ('pending_upload', 'ready', 'rejected');

create table media (
  id              uuid primary key,
  entry_id        uuid not null,
  relationship_id uuid not null,
  uploader_id     uuid not null references app_user (id),
  object_key      text not null unique,  -- random, opaque; never derived from names or content
  content_type    text not null,
  byte_size       bigint check (byte_size > 0),        -- limits: U-08
  sha256          bytea check (octet_length(sha256) = 32),
  status          media_status not null default 'pending_upload',
  created_at      timestamptz not null default now(),
  -- Same relationship as its entry — a media row can never point across relationships.
  foreign key (entry_id, relationship_id) references entry (id, relationship_id) on delete cascade
);

-- Transactional outbox: object storage deletion is guaranteed to be attempted.
create table media_purge_queue (
  object_key  text primary key,
  enqueued_at timestamptz not null default now(),
  attempts    integer not null default 0
);

create function media_enqueue_purge() returns trigger
  language plpgsql
  as $$
  begin
    insert into media_purge_queue (object_key) values (old.object_key) on conflict do nothing;
    return old;
  end $$;

create trigger media_purge_on_delete
  after delete on media
  for each row execute function media_enqueue_purge();

-- ---- Change feed (sync) ----------------------------------------------------------------------

-- Ids only, no content. visible_to NULL = both partners; otherwise only that user (private).
create table change_log (
  seq             bigint generated always as identity primary key,
  relationship_id uuid not null references relationship (id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  op              text not null check (op in ('upsert', 'delete')),
  mutation_id     uuid,
  visible_to      uuid references app_user (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index change_log_feed on change_log (relationship_id, seq);

create function entry_log_change() returns trigger
  language plpgsql
  as $$
  declare r entry;
  begin
    if tg_op = 'DELETE' then r := old; else r := new; end if;
    insert into change_log (relationship_id, entity_type, entity_id, op, mutation_id, visible_to)
    values (
      r.relationship_id, 'entry', r.id,
      case when tg_op = 'DELETE' then 'delete' else 'upsert' end,
      app_current_mutation(),
      case when r.visibility = 'private' then r.author_id end);
    return null;
  end $$;

create trigger entry_change_feed
  after insert or update or delete on entry
  for each row execute function entry_log_change();

-- Idempotency records (bounded retention; tombstones + versions keep stale replays safe after).
create table processed_mutation (
  mutation_id         uuid primary key,
  user_id             uuid not null references app_user (id) on delete cascade,
  request_fingerprint bytea not null,
  outcome             text not null,   -- status only; replays return CURRENT state (F-04 finding)
  created_at          timestamptz not null default now()
);

-- ---- Signals ---------------------------------------------------------------------------------

create table signal (
  id              uuid primary key,
  relationship_id uuid not null,
  sender_id       uuid not null,
  signal_type     text not null check (signal_type in (
                    'thought-of-you','missing-you','need-you','need-to-talk',
                    'just-listen','check-on-me','cant-talk-yet','okay-now')),
  level           text not null check (level in ('gentle', 'support')),
  sent_at         timestamptz not null default now(),
  expires_at      timestamptz,   -- retention: U-09. Purged by a scheduled job.
  foreign key (relationship_id, sender_id) references relationship_member (relationship_id, user_id)
);
-- Deliberately absent: read receipts, "seen" state, escalation records (§5).

create table signal_response (
  id           uuid primary key,
  signal_id    uuid not null references signal (id) on delete cascade,
  responder_id uuid not null references app_user (id) on delete cascade,
  preset       text,
  body         text,
  sent_at      timestamptz not null default now(),
  check (preset is not null or body is not null)
);

-- ---- Shared day & Shared Spark ---------------------------------------------------------------

create type shared_day_kind as enum ('connected', 'not-connected', 'excused');

-- Deliberately NO per-partner columns (P-09): the system cannot say who missed a day.
create table shared_day (
  relationship_id uuid not null references relationship (id) on delete cascade,
  day             date not null,
  kind            shared_day_kind not null,
  finalized_at    timestamptz not null default now(),
  primary key (relationship_id, day)
);

-- Earned milestones are kept forever, even if the streak rests or is hidden (§7 Controls).
create table spark_milestone (
  relationship_id uuid not null references relationship (id) on delete cascade,
  milestone       integer not null check (milestone > 0),
  reached_on      date not null,
  primary key (relationship_id, milestone)
);

-- ---- Open When letters -----------------------------------------------------------------------

create table open_when_letter (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  recipient_id    uuid not null,
  prompt          text not null,   -- e.g. "Open when you miss me"
  body            text not null,
  status          text not null default 'draft' check (status in ('draft', 'sealed', 'opened')),
  sealed_at       timestamptz,
  opened_at       timestamptz,
  created_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id),
  foreign key (relationship_id, recipient_id) references relationship_member (relationship_id, user_id),
  check (author_id <> recipient_id),
  check ((status = 'draft') = (sealed_at is null)),
  check ((status = 'opened') = (opened_at is not null))
);

-- ---- Preferences -----------------------------------------------------------------------------

create table user_preference (
  user_id             uuid primary key references app_user (id) on delete cascade,
  lock_screen_preview text not null default 'generic' check (lock_screen_preview in ('generic', 'detailed')),
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start   time,      -- defaults: Phase 2 copy/UX decision
  quiet_hours_end     time,
  quiet_hours_zone    text,      -- IANA zone; follows the device when null
  gentle_signals      boolean not null default true,
  support_signals     boolean not null default true,
  hide_spark          boolean not null default false,
  mute_spark_prompts  boolean not null default false
);

create table push_device (
  id           uuid primary key,
  user_id      uuid not null references app_user (id) on delete cascade,
  platform     text not null check (platform in ('ios', 'android')),
  push_token   text not null unique,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ---- Row-level security (defence in depth) ---------------------------------------------------

grant usage on schema public to garnet_app;
grant select, insert, update, delete on all tables in schema public to garnet_app;
grant usage on all sequences in schema public to garnet_app;
revoke all on app_user, session, invitation, processed_mutation, push_device from garnet_app;
grant execute on function app_current_user(), app_current_mutation(), is_active_member(uuid),
  accept_invitation(bytea) to garnet_app;

alter table relationship        enable row level security;
alter table relationship_member enable row level security;
alter table entry               enable row level security;
alter table media               enable row level security;
alter table tombstone           enable row level security;
alter table change_log          enable row level security;
alter table signal              enable row level security;
alter table signal_response     enable row level security;
alter table shared_day          enable row level security;
alter table spark_milestone     enable row level security;
alter table open_when_letter    enable row level security;
alter table user_preference     enable row level security;
alter table media_purge_queue   enable row level security; -- insert-only for the app role

create policy member_reads on relationship        for select using (is_active_member(id));
create policy member_reads on relationship_member for select using (is_active_member(relationship_id));

-- Entries: members see shared entries; authors also see their own private drafts.
create policy entry_select on entry for select
  using (is_active_member(relationship_id) and (visibility = 'shared' or author_id = app_current_user()));
create policy entry_insert on entry for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());
create policy entry_update on entry for update
  using (is_active_member(relationship_id) and author_id = app_current_user())
  with check (author_id = app_current_user());
-- Either partner may delete a SHARED entry for both (D-11); only the author a private one.
create policy entry_delete on entry for delete
  using (is_active_member(relationship_id) and (visibility = 'shared' or author_id = app_current_user()));

create policy media_select on media for select
  using (exists (select 1 from entry e where e.id = media.entry_id));  -- inherits entry visibility
create policy media_insert on media for insert
  with check (uploader_id = app_current_user()
              and exists (select 1 from entry e where e.id = media.entry_id and e.author_id = app_current_user()));

create policy tombstone_select on tombstone for select using (is_active_member(relationship_id));
-- Tombstones are written by the SECURITY INVOKER trigger as the deleting user.
create policy tombstone_insert on tombstone for insert with check (is_active_member(relationship_id));

create policy feed_select on change_log for select
  using (is_active_member(relationship_id) and (visible_to is null or visible_to = app_current_user()));
create policy feed_insert on change_log for insert with check (is_active_member(relationship_id));

create policy media_purge_insert on media_purge_queue for insert with check (true);

create policy signal_member on signal for all
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id) and sender_id = app_current_user());
create policy response_member on signal_response for all
  using (exists (select 1 from signal s where s.id = signal_response.signal_id))
  with check (responder_id = app_current_user()
              and exists (select 1 from signal s where s.id = signal_response.signal_id));

create policy shared_day_read  on shared_day      for select using (is_active_member(relationship_id));
create policy milestone_read   on spark_milestone for select using (is_active_member(relationship_id));

-- Letters: the author sees their own; the recipient only once sealed.
create policy letter_select on open_when_letter for select
  using (is_active_member(relationship_id) and
         (author_id = app_current_user() or (recipient_id = app_current_user() and status <> 'draft')));
create policy letter_write on open_when_letter for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy own_preferences on user_preference for all
  using (user_id = app_current_user()) with check (user_id = app_current_user());
