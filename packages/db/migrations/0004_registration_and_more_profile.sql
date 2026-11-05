-- =============================================================================================
-- Garnet migration 0004: registration details, home city and "together since" (P-79).
--
-- * app_user (Better Auth's user) gains the registration details every account gives once:
--   a birthday (YYYY-MM-DD, checked against the minimum age by the API) and the version of the
--   terms and privacy notice accepted, with when. Better Auth reads them as additional fields,
--   so the session check knows whether registration is complete without another query.
-- * profile gains an optional home city; relationship gains "together since", one answer for
--   the pair.
-- * The partner sees the full birthday and the home city (P-79, owner direction), through
--   partner_profile(), which is recreated with the two new columns.
-- * Requests run as garnet_app, which can't touch app_user: registration and "together since"
--   are written through SECURITY DEFINER functions that take the caller from app.user_id.
-- =============================================================================================

alter table app_user add column birth_date text
  check (birth_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
alter table app_user add column terms_version text
  check (char_length(terms_version) between 1 and 40);
alter table app_user add column terms_accepted_at timestamptz;
alter table app_user add constraint terms_accepted_together
  check ((terms_version is null) = (terms_accepted_at is null));

alter table profile add column home_city text
  check (char_length(home_city) between 1 and 80);

alter table relationship add column together_since date
  check (together_since >= date '1900-01-01');

-- What the caller may know of their partner's setup (SETUP, P-51, P-79): nothing more.
drop function partner_profile();
create function partner_profile()
  returns table (name text, side text, time_zone text, home_city text, birth_date text,
                 ready boolean)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select p.display_name, p.side, p.time_zone, p.home_city, u.birth_date, p.complete
      from profile p join app_user u on u.id = p.user_id
     where p.user_id = my_partner()
  $$;

-- The caller's own registration details.
create function my_registration()
  returns table (birth_date text, terms_version text, terms_accepted_at timestamptz)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select u.birth_date, u.terms_version, u.terms_accepted_at
      from app_user u where u.id = app_current_user()
  $$;

-- Records the caller's birthday and acceptance of a terms version (the API checks both first).
create function complete_registration(p_birth_date text, p_terms_version text) returns void
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp
  as $$
  begin
    if app_current_user() is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    update app_user
       set birth_date = p_birth_date,
           terms_version = p_terms_version,
           terms_accepted_at = now(),
           updated_at = now()
     where id = app_current_user();
  end $$;

-- When the caller and their partner got together, or null.
create function our_together_since() returns text
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select to_char(r.together_since, 'YYYY-MM-DD')
      from relationship r
     where r.id = my_relationship() and my_partner() is not null
  $$;

-- Sets (or clears, with null) "together since" for the pair. Only once paired; never later than
-- today anywhere on Earth.
create function set_together_since(p_date date) returns void
  language plpgsql security definer set search_path = pg_catalog, public, pg_temp
  as $$
  begin
    if app_current_user() is null then
      raise exception 'no authenticated user' using errcode = 'GN401';
    end if;
    if my_partner() is null then
      raise exception 'not paired' using errcode = 'GN409';
    end if;
    if p_date > (now() at time zone 'Pacific/Kiritimati')::date then
      raise exception 'in the future' using errcode = 'GN400';
    end if;
    update relationship set together_since = p_date where id = my_relationship();
  end $$;

revoke all on function partner_profile(), my_registration(), complete_registration(text, text),
  our_together_since(), set_together_since(date) from public;
grant execute on function partner_profile(), my_registration(), complete_registration(text, text),
  our_together_since(), set_together_since(date) to garnet_app;
