#!/bin/sh
# Runs once, when the local database is first created (P-76). Creates the API's login role:
# a member of garnet_app, never an owner and never able to bypass row-level security
# (AGENTS.md §6). Migrations run as the owner (POSTGRES_USER) and create the tables.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v api_password="$GARNET_API_DB_PASSWORD" -v db="$POSTGRES_DB" <<'SQL'
do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'garnet_app') then
    create role garnet_app nologin;
  end if;
end
$$;

create role garnet_api login nosuperuser nocreatedb nocreaterole nobypassrls
  password :'api_password';
grant garnet_app to garnet_api;

-- Hardening: nobody but the owner creates objects, and no one gets temporary tables (which a
-- SECURITY DEFINER function could otherwise be tricked into reading).
revoke create on schema public from public;
revoke temporary on database :"db" from public;
SQL
