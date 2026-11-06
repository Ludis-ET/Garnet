-- =============================================================================================
-- Garnet migration 0006: sync core and Days (B3, P-81, B-30 to B-33).
--
-- * Converts visibility to text with check constraint to support after_reveal cleanly in transactions.
-- * Adds fields (emoji, mood, activity, place) to entry.
-- * Allows place in entry kinds.
-- * Sets up day_readiness for tracking "finish my day" per partner.
-- * Grants garnet_app row-level security access to processed_mutation for idempotency.
-- * Guards revealed entries and prevents moving shared/after_reveal back to private.
-- =============================================================================================

-- Drop policies using visibility before altering its type
drop policy if exists entry_select on entry;
drop policy if exists entry_delete on entry;

-- Convert visibility to text with check constraint to allow after_reveal without enum transaction locks
alter table entry drop constraint if exists entry_visibility_shared_at;
alter table entry drop constraint if exists entry_visibility_shared_day;
alter table entry drop constraint if exists entry_revealed_at_visibility;
alter table entry drop constraint if exists entry_check;
alter table entry drop constraint if exists entry_check1;
alter table entry drop constraint if exists entry_check2;

alter table entry alter column visibility drop default;
alter table entry alter column visibility type text using visibility::text;
alter table entry alter column visibility set default 'private';
drop type if exists entry_visibility;

alter table entry add constraint entry_visibility_values check
  (visibility in ('private', 'shared', 'after_reveal'));

alter table entry
  add column if not exists emoji text,
  add column if not exists mood text,
  add column if not exists activity text,
  add column if not exists place text;

-- Allow place in entry kinds
alter table entry drop constraint if exists entry_kind_check;
alter table entry add constraint entry_kind_check check (kind in
  ('text','photo','video','voice','feeling','activity','food','work','location','place','custom'));

alter table entry add constraint entry_visibility_shared_at check
  ((visibility in ('shared', 'after_reveal')) = (shared_at is not null));

alter table entry add constraint entry_visibility_shared_day check
  (visibility in ('shared', 'after_reveal') or shared_day is null);

alter table entry add constraint entry_revealed_at_visibility check
  (revealed_at is null or visibility in ('shared', 'after_reveal'));

-- ---- RLS updates for entry ------------------------------------------------------------------

create policy entry_select on entry for select
  using (is_active_member(relationship_id) and (
    visibility = 'shared' or
    (visibility = 'after_reveal' and revealed_at is not null) or
    author_id = app_current_user()
  ));

create policy entry_delete on entry for delete
  using (is_active_member(relationship_id) and (
    visibility in ('shared', 'after_reveal') or author_id = app_current_user()
  ));

-- ---- Day readiness ---------------------------------------------------------------------------

create table if not exists day_readiness (
  relationship_id uuid not null references relationship (id) on delete cascade,
  user_id         uuid not null references app_user (id) on delete cascade,
  day             date not null,
  ready_at        timestamptz not null default now(),
  primary key (relationship_id, user_id, day)
);

alter table day_readiness enable row level security;
grant select, insert, delete on day_readiness to garnet_app;

drop policy if exists day_readiness_member on day_readiness;
create policy day_readiness_member on day_readiness for all
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id) and user_id = app_current_user());

-- ---- Processed mutations idempotency RLS -----------------------------------------------------

alter table processed_mutation enable row level security;
grant select, insert on processed_mutation to garnet_app;

drop policy if exists processed_mutation_user on processed_mutation;
create policy processed_mutation_user on processed_mutation for all
  using (user_id = app_current_user())
  with check (user_id = app_current_user());

-- ---- Trigger update -------------------------------------------------------------------------

create or replace function entry_guard_update() returns trigger
  language plpgsql
  as $$
  begin
    if old.revealed_at is not null and (
         new.body is distinct from old.body or new.kind is distinct from old.kind or
         new.occurred_at is distinct from old.occurred_at or new.visibility is distinct from old.visibility or
         new.emoji is distinct from old.emoji or new.mood is distinct from old.mood or
         new.activity is distinct from old.activity or new.place is distinct from old.place) then
      raise exception 'entry % is part of a revealed recap and is read-only', old.id
        using errcode = 'GN423';
    end if;
    if old.visibility in ('shared', 'after_reveal') and new.visibility = 'private' then
      raise exception 'a shared entry cannot become private again' using errcode = 'GN422';
    end if;
    new.updated_at := now();
    new.version := old.version + 1;
    return new;
  end $$;
