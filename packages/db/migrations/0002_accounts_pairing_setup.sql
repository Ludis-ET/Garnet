-- =============================================================================================
-- Garnet migration 0002: accounts (Better Auth), pairing and setup (B1, P-76, P-77).
--
-- * Accounts move to Better Auth (owner direction P-77): app_user becomes its user table, and
--   its session, account, verification and rate_limit tables are added, in snake_case. The B0
--   session table and auth_session() are replaced (they only ever held local test sessions).
-- * Better Auth reaches its tables through garnet_auth, never garnet_app: requests keep running
--   as garnet_app under row-level security and can't see accounts, sessions or passwords.
-- * profile: each person's setup answers; only they read or write their row (RLS). What the
--   partner may know (name, side, zone, ready) comes from partner_profile().
-- * Pairing and the side choice go through SECURITY DEFINER functions that take the caller from
--   app.user_id (never a parameter) and answer every invalid case the same way (P-18).
-- =============================================================================================

-- ---- Roles -----------------------------------------------------------------------------------

do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'garnet_auth') then
    create role garnet_auth nologin;
  end if;
  -- The API's login role (created by infra/postgres/init) runs Better Auth's queries.
  if exists (select from pg_catalog.pg_roles where rolname = 'garnet_api') then
    grant garnet_auth to garnet_api;
  end if;
end
$$;

-- ---- Replace the B0 session mechanism --------------------------------------------------------

drop function auth_session(bytea);
drop table session;

-- ---- app_user becomes Better Auth's user -----------------------------------------------------

alter table app_user drop column password_hash;   -- passwords live in account (Better Auth)
alter table app_user drop column email_verified_at;
alter table app_user alter column id set default gen_random_uuid();
alter table app_user add column name text not null default '';
alter table app_user add column email_verified boolean not null default false;
alter table app_user add column image text;
alter table app_user add column updated_at timestamptz not null default now();

-- ---- Better Auth's tables --------------------------------------------------------------------

create table session (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_user (id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index session_user_id_idx on session (user_id);

create table account (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references app_user (id) on delete cascade,
  account_id               text not null,
  provider_id              text not null,
  access_token             text,
  refresh_token            text,
  id_token                 text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  scope                    text,
  password                 text,                    -- Better Auth's hash. Never logged.
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index account_user_id_idx on account (user_id);

-- Verification and reset tokens are stored hashed (Better Auth storeIdentifier: "hashed").
create table verification (
  id          uuid primary key default gen_random_uuid(),
  identifier  text not null,
  value       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index verification_identifier_idx on verification (identifier);

create table rate_limit (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  count         integer not null,
  last_request  bigint not null
);

revoke all on app_user, session, account, verification, rate_limit from garnet_app;
grant select, insert, update, delete on app_user, session, account, verification, rate_limit
  to garnet_auth;

-- ---- Setup answers ---------------------------------------------------------------------------

create table profile (
  user_id       uuid primary key references app_user (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 100),
  nickname      text not null default '' check (char_length(nickname) <= 100),
  side          text check (side in ('ruby', 'sapphire')),
  avatar        jsonb not null default '{"kind": "initials", "swatch": 0}',
  time_zone     text,
  appearance    text not null default 'light' check (appearance in ('system', 'light', 'dark')),
  accent        text not null default 'subtle' check (accent in ('subtle', 'rich')),
  notifications jsonb not null
    default '{"status": "unset", "thoughts": true, "support": true, "days": true}',
  done          text[] not null default '{}',
  complete      boolean not null default false,
  updated_at    timestamptz not null default now()
);

grant select, insert, update on profile to garnet_app;
alter table profile enable row level security;
create policy own_profile on profile for all
  using (user_id = app_current_user()) with check (user_id = app_current_user());

-- The caller's active relationship, or null.
create function my_relationship() returns uuid
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select relationship_id from relationship_member
     where user_id = app_current_user() and left_at is null
  $$;

-- The partner in the caller's active relationship, or null while unpaired.
create function my_partner() returns uuid
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select m.user_id from relationship_member m
     where m.relationship_id = my_relationship()
       and m.user_id <> app_current_user() and m.left_at is null
  $$;

-- What the caller may know of their partner's setup (SETUP, P-51): nothing more.
create function partner_profile()
  returns table (name text, side text, time_zone text, ready boolean)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select p.display_name, p.side, p.time_zone, p.complete
      from profile p where p.user_id = my_partner()
  $$;

-- P-51: the two sides never match. Locks the relationship so two choices can't race.
create function choose_side(p_side text) returns text
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp
  as $$
  declare
    p_user uuid := app_current_user();
    rel uuid := my_relationship();
    partner_side text;
  begin
    if p_user is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    if p_side not in ('ruby', 'sapphire') then
      raise exception 'not a side' using errcode = 'GN400';
    end if;
    if rel is not null then
      perform 1 from relationship where id = rel for update;
    end if;
    select side into partner_side from profile where user_id = my_partner();
    if partner_side = p_side then
      return partner_side;      -- taken: the caller learns only the partner's side
    end if;
    update profile
       set side = p_side,
           done = (select array(select distinct unnest(done || array['side']))),
           updated_at = now()
     where user_id = p_user;
    return null;
  end $$;

-- ---- Pairing (PAIR, P-18) --------------------------------------------------------------------

-- Creates the caller's invitation, replacing any earlier one. An unpaired caller gets a
-- relationship of their own to invite into. Returns the expiry.
create function create_invitation(p_token_hash bytea, p_ttl_hours integer)
  returns timestamptz
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp
  as $$
  declare
    p_user uuid := app_current_user();
    rel uuid := my_relationship();
    expires timestamptz := now() + make_interval(hours => p_ttl_hours);
  begin
    if p_user is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    if my_partner() is not null then
      raise exception 'already paired' using errcode = 'GN409';
    end if;
    if rel is null then
      rel := gen_random_uuid();
      insert into relationship (id) values (rel);
      insert into relationship_member (relationship_id, user_id) values (rel, p_user);
    end if;
    update invitation set revoked_at = now()
     where created_by = p_user and consumed_at is null and revoked_at is null;
    insert into invitation (id, relationship_id, created_by, token_hash, expires_at)
      values (gen_random_uuid(), rel, p_user, p_token_hash, expires);
    return expires;
  end $$;

create function revoke_my_invitations() returns void
  language sql security definer set search_path = pg_catalog, public, pg_temp
  as $$
    update invitation set revoked_at = now()
     where created_by = app_current_user() and consumed_at is null and revoked_at is null
  $$;

-- The inviter's name for a usable code, or null for every other case (unknown, used, expired,
-- revoked, the caller's own, or the caller already paired): one answer (P-18).
create function check_invitation(p_token_hash bytea) returns text
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select p.display_name
      from invitation i
      join profile p on p.user_id = i.created_by
     where i.token_hash = p_token_hash
       and i.consumed_at is null and i.revoked_at is null and i.expires_at > now()
       and i.created_by <> app_current_user()
       and my_partner() is null
  $$;

-- Spends a usable invitation and joins its relationship. The caller's own unpaired relationship
-- (made for their own invitation) is removed first. Returns the inviter's name; every invalid
-- case raises the same error (P-18).
create function join_with_invitation(p_token_hash bytea) returns text
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp
  as $$
  declare
    p_user uuid := app_current_user();
    own uuid := my_relationship();
    rel uuid;
    inviter uuid;
  begin
    if p_user is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    if my_partner() is not null then
      raise exception 'invitation is not valid' using errcode = 'GN403';
    end if;
    update invitation
       set consumed_at = now(), consumed_by = p_user
     where token_hash = p_token_hash
       and consumed_at is null and revoked_at is null and expires_at > now()
       and created_by <> p_user
    returning relationship_id, created_by into rel, inviter;
    if rel is null then
      raise exception 'invitation is not valid' using errcode = 'GN403';
    end if;
    if own is not null and own <> rel then
      delete from relationship where id = own;   -- cascades its membership and invitations
    end if;
    insert into relationship_member (relationship_id, user_id) values (rel, p_user);
    return (select display_name from profile where user_id = inviter);
  end $$;

-- Where the caller is in pairing: the partner's name once paired, and their own live
-- invitation's expiry while inviting.
create function pairing_status() returns table (partner_name text, invite_expires_at timestamptz)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select (select display_name from profile where user_id = my_partner()),
           (select max(expires_at) from invitation
             where created_by = app_current_user()
               and consumed_at is null and revoked_at is null)
  $$;

revoke all on function my_relationship(), my_partner(), partner_profile(), choose_side(text),
  create_invitation(bytea, integer), revoke_my_invitations(), check_invitation(bytea),
  join_with_invitation(bytea), pairing_status() from public;
grant execute on function my_relationship(), my_partner(), partner_profile(), choose_side(text),
  create_invitation(bytea, integer), revoke_my_invitations(), check_invitation(bytea),
  join_with_invitation(bytea), pairing_status() to garnet_app;
