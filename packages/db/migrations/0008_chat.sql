-- Migration 0008: Real-Time Chat, Reactions, Pins, Presence and Read Receipts (B5, B-40, P-58, P-61, P-62, P-63)
--
-- Pure communication, not measurement (§5):
-- - Deliberately absent: "online" presence, last-seen timestamps, "delivered" receipts, response-time stats.
-- - "Seen" shows only under mutual opt-in (U-35, P-58).
-- - Active chat presence ("here now", P-61) is gated by the same mutual opt-in rule.
-- - RLS enforced: members of the relationship only.

-- 1. Chat Messages Table
create table if not exists chat_message (
  id uuid primary key,
  relationship_id uuid not null references relationship (id) on delete cascade,
  sender_id uuid not null references app_user (id) on delete cascade,
  text text not null default '',
  media jsonb,
  sticker jsonb,
  reply_to_id uuid references chat_message (id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_for_everyone boolean not null default false,
  deleted_for_everyone_at timestamptz,
  foreign key (relationship_id, sender_id) references relationship_member (relationship_id, user_id)
);

create index if not exists chat_message_relationship_created_idx on chat_message (relationship_id, created_at desc);

-- 2. Message Visibility & Marks (Per-User: Delete for Me & Saved as Memory)
create table if not exists chat_message_visibility (
  message_id uuid not null references chat_message (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  deleted_for_me boolean not null default false,
  saved_as_memory boolean not null default false,
  primary key (message_id, user_id)
);

-- 3. Emoji Reactions Table (One reaction per user per emoji)
create table if not exists chat_reaction (
  id uuid primary key,
  message_id uuid not null references chat_message (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists chat_reaction_message_idx on chat_reaction (message_id);

-- 4. Pinned Messages Table
create table if not exists chat_pin (
  relationship_id uuid not null references relationship (id) on delete cascade,
  message_id uuid not null references chat_message (id) on delete cascade,
  pinned_by uuid not null references app_user (id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (relationship_id, message_id)
);

-- 5. Chat Participant State (Settings, Private Read Cursor & Ephemeral Presence)
create table if not exists chat_participant_state (
  relationship_id uuid not null references relationship (id) on delete cascade,
  user_id uuid not null references app_user (id) on delete cascade,
  read_receipts boolean,               -- null = not answered yet (U-35, P-58)
  typing_indicators boolean not null default true,
  read_up_to timestamptz,              -- private read timestamp
  typing_until timestamptz,            -- ephemeral typing heartbeat (now + 5s)
  in_chat_until timestamptz,           -- active watching heartbeat (now + 10s)
  updated_at timestamptz not null default now(),
  primary key (relationship_id, user_id)
);

-- 6. Enable RLS
alter table chat_message enable row level security;
alter table chat_message_visibility enable row level security;
alter table chat_reaction enable row level security;
alter table chat_pin enable row level security;
alter table chat_participant_state enable row level security;

-- Policies for chat_message
create policy chat_message_select on chat_message for select
  using (relationship_id = my_relationship());

create policy chat_message_insert on chat_message for insert
  with check (relationship_id = my_relationship() and sender_id = app_current_user());

create policy chat_message_update on chat_message for update
  using (relationship_id = my_relationship());

create policy chat_message_delete on chat_message for delete
  using (relationship_id = my_relationship() and sender_id = app_current_user());

-- Policies for chat_message_visibility
create policy chat_visibility_all on chat_message_visibility for all
  using (user_id = app_current_user())
  with check (user_id = app_current_user());

-- Policies for chat_reaction
create policy chat_reaction_select on chat_reaction for select
  using (exists (
    select 1 from chat_message m
    where m.id = chat_reaction.message_id
      and m.relationship_id = my_relationship()
  ));

create policy chat_reaction_all on chat_reaction for all
  using (user_id = app_current_user())
  with check (user_id = app_current_user() and exists (
    select 1 from chat_message m
    where m.id = chat_reaction.message_id
      and m.relationship_id = my_relationship()
  ));

-- Policies for chat_pin
create policy chat_pin_select on chat_pin for select
  using (relationship_id = my_relationship());

create policy chat_pin_all on chat_pin for all
  using (relationship_id = my_relationship())
  with check (relationship_id = my_relationship() and pinned_by = app_current_user());

-- Policies for chat_participant_state
create policy chat_state_select on chat_participant_state for select
  using (relationship_id = my_relationship());

create policy chat_state_all on chat_participant_state for all
  using (user_id = app_current_user())
  with check (user_id = app_current_user() and relationship_id = my_relationship());

grant select, insert, update, delete on table
  chat_message, chat_message_visibility, chat_reaction, chat_pin, chat_participant_state
  to garnet_app;

