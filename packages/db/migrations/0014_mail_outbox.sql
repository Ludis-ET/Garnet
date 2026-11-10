-- Migration 0014: the account-email outbox (production-fix-plan A10, P-96).
--
-- Account emails (confirm, reset, email change, "someone tried to sign up") were sent inline
-- while a request waited, with no timeout and no retry, and Better Auth swallowed any failure:
-- sign-up "worked" and the email never came. Each email is now written here first, in the same
-- moment the request asks for it, and a worker in the API sends it, retrying with back-off until
-- the link inside it would have expired anyway. A sent email's row is deleted at once.
--
-- Privacy (§5): a row holds the recipient and the link token only until it is sent or expires.
-- It is never readable by the app's request role (no grant to garnet_app, RLS on, no policy),
-- and the API logs only the kind of email, the attempt and an error code, never the address.

create table if not exists mail_outbox (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('verify', 'reset', 'exists', 'change')),
  recipient       text not null check (length(recipient) between 3 and 320),
  -- What the template needs (name, token, hours…); never rendered HTML.
  payload         jsonb not null default '{}'::jsonb,
  attempts        integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  -- Claimed by a worker until then, so two API processes never send the same email.
  locked_until    timestamptz,
  -- The last failure's code (EAUTH, ETIMEDOUT, 535…), for the logs and the check script.
  last_error      text check (last_error is null or length(last_error) <= 64),
  created_at      timestamptz not null default now(),
  -- The link inside stops working then; an email that can't go out by then is dropped.
  expires_at      timestamptz not null
);

create index if not exists mail_outbox_due_idx on mail_outbox (next_attempt_at);

alter table mail_outbox enable row level security;
alter table mail_outbox force row level security;

-- Only the API's own roles: Better Auth's (which asks for the emails) and the owner. The
-- request role garnet_app gets nothing, and with no policy for it RLS would refuse it anyway.
do $$
begin
  if exists (select from pg_catalog.pg_roles where rolname = 'garnet_auth') then
    execute 'grant select, insert, update, delete on mail_outbox to garnet_auth';
    execute 'drop policy if exists mail_outbox_auth on mail_outbox';
    execute 'create policy mail_outbox_auth on mail_outbox to garnet_auth using (true) with check (true)';
  end if;
end
$$;
