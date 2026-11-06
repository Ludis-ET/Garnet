-- Migration 0013: Full-Text Search Indexes (Search Engine)
-- Enables efficient text search across messages, moments, letters, memories, and events.
-- Strict compliance with §5 Product Guardrails & RLS: zero leakage of sealed content or private drafts.

-- 1. Chat Messages (text)
create index if not exists chat_message_search_idx
  on chat_message using gin (to_tsvector('english', text));

-- 2. Entry (Moments / Days log)
create index if not exists entry_search_idx
  on entry using gin (to_tsvector('english', coalesce(body, '') || ' ' || coalesce(activity, '') || ' ' || coalesce(place, '') || ' ' || coalesce(mood, '')));

-- 3. Open When Letters (prompt + isolated content)
create index if not exists open_when_letter_search_idx
  on open_when_letter using gin (to_tsvector('english', coalesce(prompt, '')));

create index if not exists open_when_letter_content_search_idx
  on open_when_letter_content using gin (to_tsvector('english', body));

-- 4. Surprises (safe_title + isolated content)
create index if not exists surprise_search_idx
  on surprise using gin (to_tsvector('english', coalesce(safe_title, '')));

create index if not exists surprise_content_search_idx
  on surprise_content using gin (to_tsvector('english', coalesce(text_content, '')));

-- 5. Memories
create index if not exists memory_search_idx
  on memory using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(story, '') || ' ' || coalesce(place, '')));

-- 6. Events & Plans
create index if not exists calendar_event_search_idx
  on calendar_event using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

create index if not exists together_plan_search_idx
  on together_plan using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(note, '') || ' ' || coalesce(place, '')));

create index if not exists together_place_search_idx
  on together_place using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(note, '')));
