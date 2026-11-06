-- Migration 0012: Data Rights, Account Lifecycle, Export & Space Ending
-- (B-100, B-101, B-120, P-37, P-80, U-20, U-23, SET-13 to SET-15, Apple App Review 5.1.1(v))
--
-- Product guardrails (§5, §11, P-37):
-- - Data export operates under row-level security: a partner's private drafts never leave the database.
-- - Export bundle state machine: none -> preparing -> ready (expires in 7 days) -> expired.
-- - Space ending (unpairing) tracks ended_at and ended_by_user_id.
-- - Strict RLS: export jobs are strictly private to the requesting user.

-- 1. Export jobs table
create table if not exists export_job (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_user (id) on delete cascade,
  relationship_id uuid references relationship (id) on delete set null,
  state           text not null check (state in ('none', 'preparing', 'ready', 'expired', 'failed')),
  download_token  text unique,
  ready_at        timestamptz,
  expires_at      timestamptz,
  file_size_bytes bigint,
  payload_json    text,                        -- Encrypted/structured JSON bundle for local and testing storage
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists export_job_user_idx on export_job (user_id, created_at desc);
create index if not exists export_job_token_idx on export_job (download_token) where download_token is not null;

-- 2. Row-Level Security for export_job
alter table export_job enable row level security;
alter table export_job force row level security;

drop policy if exists export_job_select on export_job;
drop policy if exists export_job_insert on export_job;
drop policy if exists export_job_update on export_job;
drop policy if exists export_job_delete on export_job;

create policy export_job_select on export_job
  for select using (user_id = app_current_user());

create policy export_job_insert on export_job
  for insert with check (user_id = app_current_user());

create policy export_job_update on export_job
  for update using (user_id = app_current_user());

create policy export_job_delete on export_job
  for delete using (user_id = app_current_user());

-- 3. Grants for garnet_app
grant select, insert, update, delete on export_job to garnet_app;

-- 4. Extend relationship for ending tracking (SET-14, P-37)
alter table relationship add column if not exists ended_by_user_id uuid references app_user(id) on delete set null;
alter table relationship add column if not exists ended_reason text;

