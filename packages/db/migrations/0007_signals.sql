-- Migration 0007: Signals, Responses, and Coarse Location (B4, B-51, P-07, P-66, U-09, U-30)
--
-- Pure communication, not measurement (§5):
-- - Deliberately absent: read receipts, "seen" state, response-time stats, escalation records.
-- - Coarse location only (~11 km, P-66): exact coordinates are never stored.
-- - RLS enforced: members of the relationship only.

-- 1. Extend signal table
alter table signal
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists signal_relationship_sent_idx on signal (relationship_id, sent_at desc);
create index if not exists signal_response_signal_idx on signal_response (signal_id, sent_at asc);

-- 2. Coarse location table
create table if not exists user_coarse_location (
  user_id uuid primary key references app_user (id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  updated_at timestamptz not null default now()
);

-- 3. Enable RLS on user_coarse_location
alter table user_coarse_location enable row level security;

create policy location_own on user_coarse_location for all
  using (user_id = app_current_user())
  with check (user_id = app_current_user());

create policy location_partner on user_coarse_location for select
  using (user_id = my_partner());

grant select, insert, update, delete on user_coarse_location to garnet_app;

