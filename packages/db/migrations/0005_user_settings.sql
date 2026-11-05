-- =============================================================================================
-- Garnet migration 0005: each person's settings (B2, SET-01 to SET-17).
--
-- * user_settings replaces the draft user_preference, which never held data: the app's settings
--   outgrew it (preview modes, a mode per notification group, Home layout, motion, location
--   sharing). One document per person, checked against the shared schema by the API, and only
--   ever readable or writable by that person (RLS). The partner has no path to it: no function
--   exposes it, and each person's settings change nothing about what the partner gets (§5).
-- * Quiet hours keep no default window (U-21): a window is stored only once someone chooses it.
-- * set_my_birth_date(): changing one's own birthday later (the API checks the age first).
-- * my_account(): the caller's own email and registration details, for their Settings.
-- =============================================================================================

drop table user_preference;

create table user_settings (
  user_id        uuid primary key references app_user (id) on delete cascade,
  schema_version integer not null,
  doc            jsonb not null check (jsonb_typeof(doc) = 'object'),
  updated_at     timestamptz not null default now(),
  -- Far above any real document: a bug can't grow a row without limit.
  check (pg_column_size(doc) < 32768)
);

grant select, insert, update on user_settings to garnet_app;
alter table user_settings enable row level security;
create policy own_settings on user_settings for all
  using (user_id = app_current_user()) with check (user_id = app_current_user());

-- The caller's own birthday. Registration details live on app_user, which garnet_app can't reach.
create function set_my_birth_date(p_birth_date text) returns void
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp
  as $$
  begin
    if app_current_user() is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    update app_user set birth_date = p_birth_date, updated_at = now()
     where id = app_current_user();
  end $$;

-- The caller's own account details: garnet_app can't read app_user itself.
create function my_account()
  returns table (email text, birth_date text, terms_version text, terms_accepted_at timestamptz)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select u.email, u.birth_date, u.terms_version, u.terms_accepted_at
      from app_user u where u.id = app_current_user()
  $$;

revoke all on function set_my_birth_date(text), my_account() from public;
grant execute on function set_my_birth_date(text), my_account() to garnet_app;
