-- Migration 0016: real profile pictures (P-98).
--
-- A picture is a small image the person chose from their gallery, or the one on their Google
-- account, copied once at setup. The file lives in object storage under the owner's id; the
-- profile's avatar says {"kind":"image","version":<uuid>}. Only the owner and their partner are
-- ever given the file (the API checks through these functions, under RLS).

-- The partner's picture choice, as stored (null when not paired).
create or replace function partner_avatar() returns jsonb
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select p.avatar from profile p where p.user_id = my_partner()
  $$;

-- The partner's id, so the API can find their picture's file. Null when not paired.
create or replace function partner_id() returns uuid
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select my_partner()
  $$;

-- The picture on the caller's own sign-in account (Google gives one), or null.
create or replace function my_account_image() returns text
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select image from app_user where id = app_current_user()
  $$;

revoke all on function partner_avatar(), partner_id(), my_account_image() from public;
grant execute on function partner_avatar(), partner_id(), my_account_image() to garnet_app;
