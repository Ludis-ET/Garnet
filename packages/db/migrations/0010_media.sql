-- Migration 0010: Media Pipeline & Storage (B7, B-41, B-42, ADR-0005, P-12, P-38)
--
-- Direct-to-storage presigned upload, commit validation, EXIF stripping, and purge queue.
--
-- Product guardrails (§5, §10, P-21):
-- - Private bucket only; access through short-lived authorized URLs.
-- - Media can be attached to moments (entry), chat messages, surprises, or profile.
-- - Deleting an entry or message cascades to delete its media row.
-- - Deleting a media row automatically enqueues its object_key in media_purge_queue.
-- - Strict RLS: partners can only see ready media within their relationship; pending uploads are private to the uploader.

-- 1. Extend media table for polymorphics and dimensions
alter table media drop constraint if exists media_entry_id_relationship_id_fkey;
alter table media drop constraint if exists media_chat_message_id_fkey;
alter table media alter column entry_id drop not null;
alter table media add column if not exists chat_message_id uuid;
alter table media add column if not exists entity_type text not null default 'entry';
alter table media add column if not exists entity_id uuid;
alter table media add column if not exists width integer;
alter table media add column if not exists height integer;
alter table media add column if not exists duration_seconds integer;
alter table media add column if not exists updated_at timestamptz not null default now();

create index if not exists media_entity_idx on media (entity_id);
create index if not exists media_rel_status_idx on media (relationship_id, status);

-- 2. Update RLS policies on media
drop policy if exists media_select on media;
drop policy if exists media_insert on media;
drop policy if exists media_update on media;
drop policy if exists media_delete on media;

-- Select: uploader can always see their own media (including pending_upload); partner can see 'ready' media in relationship
create policy media_select on media for select
  using (
    relationship_id = my_relationship() and
    (uploader_id = app_current_user() or status = 'ready')
  );

-- Insert: uploader must be the caller and belong to the relationship
create policy media_insert on media for insert
  with check (
    relationship_id = my_relationship() and
    uploader_id = app_current_user()
  );

-- Update: uploader can finalize / update their own media in the relationship
create policy media_update on media for update
  using (
    relationship_id = my_relationship() and
    uploader_id = app_current_user()
  );

-- Delete: uploader or relationship member can delete media
create policy media_delete on media for delete
  using (
    relationship_id = my_relationship() and
    (uploader_id = app_current_user() or is_active_member(relationship_id))
  );

-- 3. Grants and policies on media_purge_queue
alter table media_purge_queue enable row level security;
drop policy if exists media_purge_insert on media_purge_queue;
drop policy if exists media_purge_all on media_purge_queue;

create policy media_purge_all on media_purge_queue for all
  using (true) with check (true);

grant select, insert, update, delete on media to garnet_app;
grant select, insert, update, delete on media_purge_queue to garnet_app;

