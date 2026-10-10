-- Diary cards: optional user-picked background colour. Mirrors src/database/migrations/004_note_color.ts.

alter table public.notes add column if not exists color text;
