-- Migration 0015: the inviter can see their own invitation code again (P-97).
--
-- The code used to live only on the phone that made it: after signing out and in, or on another
-- phone, "Your invitation" showed empty tiles. The server still keeps the code's hash for
-- checking (P-18); it now also keeps the code sealed: AES-256-GCM under a key derived from the
-- API's secret and bound to the inviter, so a copy of the database alone reveals no code, and
-- only the inviter is ever given it back. The sealed copy is erased the moment the invitation
-- is used or withdrawn.

alter table invitation
  add column if not exists sealed_code text
  check (sealed_code is null or length(sealed_code) <= 200);

-- Erased as soon as the invitation can no longer be used.
create or replace function invitation_forget_code() returns trigger
  language plpgsql set search_path = pg_catalog, public, pg_temp
  as $$
  begin
    if new.consumed_at is not null or new.revoked_at is not null then
      new.sealed_code := null;
    end if;
    return new;
  end $$;

drop trigger if exists invitation_forget_code on invitation;
create trigger invitation_forget_code
  before update on invitation
  for each row execute function invitation_forget_code();

-- Stores the sealed code on the caller's live invitation (right after create_invitation).
create or replace function seal_my_invitation(p_sealed text) returns void
  language sql security definer set search_path = pg_catalog, public, pg_temp
  as $$
    update invitation set sealed_code = p_sealed
     where created_by = app_current_user()
       and consumed_at is null and revoked_at is null and expires_at > now()
  $$;

-- The caller's own live invitation's sealed code, or null. Nobody else's, ever.
create or replace function my_invitation_code() returns text
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select sealed_code from invitation
     where created_by = app_current_user()
       and consumed_at is null and revoked_at is null
     order by expires_at desc
     limit 1
  $$;

revoke all on function seal_my_invitation(text), my_invitation_code() from public;
grant execute on function seal_my_invitation(text), my_invitation_code() to garnet_app;
