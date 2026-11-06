-- 0009_notifications.sql
-- Milestone B6: Push devices and in-app notifications (B-50, U-27, P-84, §5, §6)

-- In-app notifications centre (NOTIF-01, SET-07)
create table notification (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references relationship (id) on delete cascade,
  user_id         uuid not null references app_user (id) on delete cascade,
  sender_id       uuid references app_user (id) on delete set null,
  category        text not null,
  group_name      text not null check (group_name in ('messages', 'signals', 'days', 'letters', 'events', 'account', 'reminders')),
  title           text not null,
  body            text not null,
  href            text not null,
  metadata        jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index notification_user_created_idx on notification (user_id, created_at desc);
create index notification_user_unread_idx on notification (user_id) where read_at is null;

-- Replace initial draft push_device (from 0001, which had no session linkage; U-27, P-84)
drop table if exists push_device;

create table push_device (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_user (id) on delete cascade,
  session_id      uuid not null references session (id) on delete cascade,
  token           text not null unique,
  platform        text not null check (platform in ('ios', 'android', 'web')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index push_device_user_id_idx on push_device (user_id);
create index push_device_session_id_idx on push_device (session_id);

-- Row-Level Security
grant select, insert, update, delete on notification, push_device to garnet_app;

alter table notification enable row level security;
alter table push_device  enable row level security;

-- Recipient-only view: the partner can never read or alter another person's notifications (§5)
create policy notification_select on notification
  for select using (user_id = app_current_user());

create policy notification_insert on notification
  for insert with check (
    relationship_id = my_relationship() and (
      user_id = app_current_user() or sender_id = app_current_user()
    )
  );

create policy notification_update on notification
  for update using (user_id = app_current_user())
  with check (user_id = app_current_user());

create policy notification_delete on notification
  for delete using (user_id = app_current_user());

-- Push device user isolation
create policy push_device_select on push_device
  for select using (user_id = app_current_user());

create policy push_device_insert on push_device
  for insert with check (user_id = app_current_user());

create policy push_device_update on push_device
  for update using (user_id = app_current_user())
  with check (user_id = app_current_user());

create policy push_device_delete on push_device
  for delete using (user_id = app_current_user());
