-- Diary feature: simple user notes. Mirrors src/database/migrations/002_notes.ts.

create table if not exists public.notes (
  id          uuid primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text,
  body        text not null check (char_length(body) <= 4000),
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz
);
create index if not exists notes_user_updated on public.notes(user_id, updated_at);

alter table public.notes enable row level security;
