-- 0011_moments.sql
-- Milestone B8: Moments (Open When Letters, Surprises, Events & Chapters, Memories & Collections, Together/Our World).
-- Resolves the Phase 1 sealed letter database gap (B-90, F-05, U-31, U-34) via two-table content isolation under RLS.
-- Addresses P-21, P-22, P-68, P-71, P-72, U-16.

-- 1. Open When Letters -------------------------------------------------------------
-- Drop legacy body from open_when_letter metadata table and add unlock_rule.
alter table open_when_letter alter column body drop not null;
alter table open_when_letter drop column if exists body;
alter table open_when_letter add column if not exists unlock_rule jsonb not null default '{"type":"manual"}';

-- Add update and delete policies for open_when_letter
create policy letter_update on open_when_letter for update
  using (is_active_member(relationship_id) and (
    (author_id = app_current_user() and status in ('draft', 'sealed')) or
    (recipient_id = app_current_user() and status in ('sealed', 'opened'))
  ))
  with check (is_active_member(relationship_id));

-- Author can delete drafts; either partner can delete sealed or opened (U-31)
create policy letter_delete on open_when_letter for delete
  using (is_active_member(relationship_id) and (
    (author_id = app_current_user() and status = 'draft') or
    status in ('sealed', 'opened')
  ));

-- Sealed letter content table: strictly isolated under RLS (B-90, U-34)
create table open_when_letter_content (
  letter_id   uuid primary key references open_when_letter(id) on delete cascade,
  body        text not null default '',
  paper       jsonb,
  media_refs  jsonb
);

alter table open_when_letter_content enable row level security;

-- Recipient CANNOT read content until status = 'opened'; author can read while draft or once opened (U-34)
create policy letter_content_select on open_when_letter_content for select
  using (exists (
    select 1 from open_when_letter l
    where l.id = open_when_letter_content.letter_id
      and is_active_member(l.relationship_id)
      and (
        (l.author_id = app_current_user() and l.status = 'draft') or
        l.status = 'opened'
      )
  ));

create policy letter_content_insert on open_when_letter_content for insert
  with check (exists (
    select 1 from open_when_letter l
    where l.id = open_when_letter_content.letter_id
      and is_active_member(l.relationship_id)
      and l.author_id = app_current_user()
  ));

create policy letter_content_update on open_when_letter_content for update
  using (exists (
    select 1 from open_when_letter l
    where l.id = open_when_letter_content.letter_id
      and is_active_member(l.relationship_id)
      and l.author_id = app_current_user()
      and l.status = 'draft'
  ))
  with check (exists (
    select 1 from open_when_letter l
    where l.id = open_when_letter_content.letter_id
      and is_active_member(l.relationship_id)
      and l.author_id = app_current_user()
  ));

create policy letter_content_delete on open_when_letter_content for delete
  using (exists (
    select 1 from open_when_letter l
    where l.id = open_when_letter_content.letter_id
      and is_active_member(l.relationship_id)
      and (
        (l.author_id = app_current_user() and l.status = 'draft') or
        l.status in ('sealed', 'opened')
      )
  ));

-- 2. Surprises (P-68, P-71) --------------------------------------------------------
create table surprise (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  recipient_id    uuid not null,
  safe_title      text,
  state           text not null default 'scheduled' check (state in ('scheduled', 'opened', 'cancelled')),
  reveal          jsonb not null,
  opened_at       timestamptz,
  created_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id),
  foreign key (relationship_id, recipient_id) references relationship_member (relationship_id, user_id),
  check (author_id <> recipient_id),
  check ((state = 'opened') = (opened_at is not null))
);

alter table surprise enable row level security;

create policy surprise_select on surprise for select
  using (is_active_member(relationship_id));

create policy surprise_insert on surprise for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy surprise_update on surprise for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

create policy surprise_delete on surprise for delete
  using (is_active_member(relationship_id) and (
    (author_id = app_current_user() and state = 'scheduled') or
    state in ('opened', 'cancelled')
  ));

create table surprise_content (
  surprise_id     uuid primary key references surprise(id) on delete cascade,
  kind            text not null,
  text_content    text,
  media_ref       jsonb,
  song_info       jsonb,
  paper           jsonb
);

alter table surprise_content enable row level security;

-- Recipient CANNOT read content until state = 'opened'; author can inspect or once opened
create policy surprise_content_select on surprise_content for select
  using (exists (
    select 1 from surprise s
    where s.id = surprise_content.surprise_id
      and is_active_member(s.relationship_id)
      and (s.state = 'opened' or s.author_id = app_current_user())
  ));

create policy surprise_content_insert on surprise_content for insert
  with check (exists (
    select 1 from surprise s
    where s.id = surprise_content.surprise_id
      and is_active_member(s.relationship_id)
      and s.author_id = app_current_user()
  ));

create policy surprise_content_update on surprise_content for update
  using (exists (
    select 1 from surprise s
    where s.id = surprise_content.surprise_id
      and is_active_member(s.relationship_id)
      and s.author_id = app_current_user()
      and s.state = 'scheduled'
  ))
  with check (exists (
    select 1 from surprise s
    where s.id = surprise_content.surprise_id
      and is_active_member(s.relationship_id)
      and s.author_id = app_current_user()
  ));

create policy surprise_content_delete on surprise_content for delete
  using (exists (
    select 1 from surprise s
    where s.id = surprise_content.surprise_id
      and is_active_member(s.relationship_id)
      and (
        (s.author_id = app_current_user() and s.state = 'scheduled') or
        s.state in ('opened', 'cancelled')
      )
  ));

-- 3. Calendar Events & Chapter Reflections (ADR-0002, EVT-07) -----------------------
create table calendar_event (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  title           text not null,
  kind            text not null check (kind in ('birthday', 'anniversary', 'travel', 'date', 'custom')),
  first_date      text not null,
  event_time      text,
  time_zone       text,
  repeats         text not null default 'none' check (repeats in ('none', 'yearly', 'monthly')),
  whose           text check (whose in ('me', 'partner')),
  description     text,
  reminders       jsonb,
  art             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id)
);

alter table calendar_event enable row level security;

create policy calendar_event_select on calendar_event for select
  using (is_active_member(relationship_id));

create policy calendar_event_insert on calendar_event for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy calendar_event_update on calendar_event for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

create policy calendar_event_delete on calendar_event for delete
  using (is_active_member(relationship_id));

create table chapter_reflection (
  relationship_id uuid not null,
  user_id         uuid not null,
  month           text not null,
  prompt_id       text not null,
  reflection      text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (relationship_id, user_id, month, prompt_id),
  foreign key (relationship_id, user_id) references relationship_member (relationship_id, user_id)
);

alter table chapter_reflection enable row level security;

create policy chapter_reflection_select on chapter_reflection for select
  using (is_active_member(relationship_id));

create policy chapter_reflection_insert on chapter_reflection for insert
  with check (is_active_member(relationship_id) and user_id = app_current_user());

create policy chapter_reflection_update on chapter_reflection for update
  using (is_active_member(relationship_id) and user_id = app_current_user())
  with check (user_id = app_current_user());

create policy chapter_reflection_delete on chapter_reflection for delete
  using (is_active_member(relationship_id) and user_id = app_current_user());

create table chapter_title (
  relationship_id uuid not null,
  month           text not null,
  title           text not null,
  renamed_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (relationship_id, month),
  foreign key (relationship_id, renamed_by) references relationship_member (relationship_id, user_id)
);

alter table chapter_title enable row level security;

create policy chapter_title_select on chapter_title for select
  using (is_active_member(relationship_id));

create policy chapter_title_insert on chapter_title for insert
  with check (is_active_member(relationship_id) and renamed_by = app_current_user());

create policy chapter_title_update on chapter_title for update
  using (is_active_member(relationship_id) and renamed_by = app_current_user())
  with check (renamed_by = app_current_user());

create policy chapter_title_delete on chapter_title for delete
  using (is_active_member(relationship_id) and renamed_by = app_current_user());

-- 4. Memories & Collections (U-16, §23) --------------------------------------------
create table memory (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  title           text not null,
  story           text not null default '',
  memory_date     text not null,
  place           text not null default '',
  kind            text not null default 'text' check (kind in ('photo', 'video', 'voice', 'text')),
  media_ref       jsonb,
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id)
);

alter table memory enable row level security;

create policy memory_select on memory for select
  using (is_active_member(relationship_id));

create policy memory_insert on memory for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy memory_update on memory for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

-- Deleting a memory is anonymous and shared (U-16): either partner can delete for both
create policy memory_delete on memory for delete
  using (is_active_member(relationship_id));

create table memory_collection (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  title           text not null,
  description     text not null default '',
  art             text not null default 'sparkles',
  created_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id)
);

alter table memory_collection enable row level security;

create policy memory_collection_select on memory_collection for select
  using (is_active_member(relationship_id));

create policy memory_collection_insert on memory_collection for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy memory_collection_update on memory_collection for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

create policy memory_collection_delete on memory_collection for delete
  using (is_active_member(relationship_id));

create table memory_collection_item (
  memory_id       uuid not null references memory(id) on delete cascade,
  collection_id   uuid not null references memory_collection(id) on delete cascade,
  primary key (memory_id, collection_id)
);

alter table memory_collection_item enable row level security;

create policy memory_collection_item_select on memory_collection_item for select
  using (exists (select 1 from memory m where m.id = memory_collection_item.memory_id and is_active_member(m.relationship_id)));

create policy memory_collection_item_insert on memory_collection_item for insert
  with check (exists (select 1 from memory m where m.id = memory_collection_item.memory_id and is_active_member(m.relationship_id)));

create policy memory_collection_item_delete on memory_collection_item for delete
  using (exists (select 1 from memory m where m.id = memory_collection_item.memory_id and is_active_member(m.relationship_id)));

-- 5. Together: Plans, Places, Songs (P-21, P-72) -----------------------------------
create table together_plan (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  title           text not null,
  note            text not null default '',
  theme           text not null default 'date',
  art             text,
  place           text not null default '',
  when_data       jsonb not null default '{"kind":"someday"}',
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id)
);

alter table together_plan enable row level security;

create policy together_plan_select on together_plan for select
  using (is_active_member(relationship_id));

create policy together_plan_insert on together_plan for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy together_plan_update on together_plan for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

create policy together_plan_delete on together_plan for delete
  using (is_active_member(relationship_id));

create table together_place (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  name            text not null,
  note            text not null default '',
  art             text,
  created_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id)
);

alter table together_place enable row level security;

create policy together_place_select on together_place for select
  using (is_active_member(relationship_id));

create policy together_place_insert on together_place for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy together_place_update on together_place for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

create policy together_place_delete on together_place for delete
  using (is_active_member(relationship_id));

create table together_song (
  id              uuid primary key,
  relationship_id uuid not null,
  author_id       uuid not null,
  title           text not null,
  artist          text not null default '',
  link            text not null,
  note            text not null default '',
  created_at      timestamptz not null default now(),
  foreign key (relationship_id, author_id) references relationship_member (relationship_id, user_id)
);

alter table together_song enable row level security;

create policy together_song_select on together_song for select
  using (is_active_member(relationship_id));

create policy together_song_insert on together_song for insert
  with check (is_active_member(relationship_id) and author_id = app_current_user());

create policy together_song_update on together_song for update
  using (is_active_member(relationship_id))
  with check (is_active_member(relationship_id));

create policy together_song_delete on together_song for delete
  using (is_active_member(relationship_id));

-- 6. Permissions Grant -------------------------------------------------------------
grant select, insert, update, delete on
  open_when_letter,
  open_when_letter_content,
  surprise,
  surprise_content,
  calendar_event,
  chapter_reflection,
  chapter_title,
  memory,
  memory_collection,
  memory_collection_item,
  together_plan,
  together_place,
  together_song
to garnet_app;

