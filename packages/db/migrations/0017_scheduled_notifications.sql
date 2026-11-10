-- Migration 0017: notifications that happen at a time, not on an action (P-102).
--
-- A surprise whose day has come, and events, birthdays and anniversaries on the day: the API
-- looks every few minutes. Each notice is claimed once in notification_dispatch (by a key such
-- as "surprise:<id>"), so several API processes never send it twice. The API reads what is due
-- only through these functions, which return ids, dates and zones: never titles, letters or
-- surprise contents (§5).

create table if not exists notification_dispatch (
  key     text primary key check (length(key) <= 200),
  sent_at timestamptz not null default now()
);
alter table notification_dispatch enable row level security;

-- True for the first caller only: the one that sends.
create or replace function notification_claim(p_key text) returns boolean
  language sql security definer set search_path = pg_catalog, public, pg_temp
  as $$
    with claimed as (
      insert into notification_dispatch (key) values (p_key)
      on conflict (key) do nothing
      returning 1
    )
    select exists (select 1 from claimed)
  $$;

-- Surprises still waiting that open on a date or with an event, with the recipient's zone.
create or replace function due_surprise_candidates()
  returns table (id uuid, relationship_id uuid, author_id uuid, recipient_id uuid,
                 reveal jsonb, recipient_zone text)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select s.id, s.relationship_id, s.author_id, s.recipient_id, s.reveal, p.time_zone
      from surprise s
      left join profile p on p.user_id = s.recipient_id
     where s.state = 'scheduled'
       and s.reveal->>'kind' in ('date', 'event')
  $$;

-- Every event with each member of its relationship and their zone (the API decides "today").
create or replace function event_notice_candidates()
  returns table (event_id uuid, relationship_id uuid, kind text, first_date text,
                 repeats text, member_id uuid, member_zone text)
  language sql stable security definer set search_path = pg_catalog, public, pg_temp
  as $$
    select e.id, e.relationship_id, e.kind, e.first_date, e.repeats, m.user_id, p.time_zone
      from calendar_event e
      join relationship_member m on m.relationship_id = e.relationship_id
      left join profile p on p.user_id = m.user_id
  $$;

-- The dispatch log is only ever touched through notification_claim; old keys are trimmed.
create or replace function notification_dispatch_trim() returns void
  language sql security definer set search_path = pg_catalog, public, pg_temp
  as $$
    delete from notification_dispatch where sent_at < now() - interval '400 days'
  $$;

revoke all on function notification_claim(text), due_surprise_candidates(),
  event_notice_candidates(), notification_dispatch_trim() from public;
do $$
begin
  if exists (select from pg_catalog.pg_roles where rolname = 'garnet_auth') then
    execute 'grant execute on function notification_claim(text), due_surprise_candidates(),
      event_notice_candidates(), notification_dispatch_trim() to garnet_auth';
  end if;
end
$$;
