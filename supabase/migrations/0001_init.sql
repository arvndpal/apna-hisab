-- Apna Hisab cloud schema (Supabase Postgres). Mirrors src/database/schema.sql.
--
-- This project does NOT use Supabase Auth or the Supabase SDK. The NestJS backend (/backend) is
-- the sole owner of identity: sign-in is Google via Firebase Auth, the app sends the backend a
-- Firebase ID token, the backend verifies it with firebase-admin (not Supabase) and issues its own
-- JWTs. The backend is the only client that ever talks to this database — connecting directly via
-- `pg` over Supabase's connection pooler (DATABASE_URL) as the `postgres` role, which bypasses RLS like
-- any Postgres superuser/owner connection does. RLS stays ENABLED with no policies as a
-- secure-by-default fallback (if a lower-privileged role or the PostgREST API were ever used by
-- mistake, every table denies all access); it is not what actually protects user data — the
-- backend's own user_id scoping (see backend/src/sync/sync.service.ts) is.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  name         text,
  email        text,
  avatar_url   text,
  language     text not null default 'en' check (language in ('en','hi')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  key         text,
  type        text not null check (type in ('income','expense')),
  name        text,
  name_hi     text,
  icon        text not null,
  sort        int not null default 50,
  is_default  boolean not null default false,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz
);
create index if not exists categories_user_updated on public.categories(user_id, updated_at);

create table if not exists public.transactions (
  id             uuid primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('income','expense')),
  amount_paise   bigint not null check (amount_paise > 0 and amount_paise <= 1000000000),
  category_id    uuid not null references public.categories(id),
  payment_method text not null check (payment_method in ('cash','upi','card','bank')),
  occurred_at    timestamptz not null,
  occurred_on    date not null,
  note           text check (char_length(note) <= 120),
  created_at     timestamptz not null,
  updated_at     timestamptz not null,
  deleted_at     timestamptz
);
create index if not exists transactions_user_updated on public.transactions(user_id, updated_at);
create index if not exists transactions_user_day on public.transactions(user_id, occurred_on);

create table if not exists public.udhaar_people (
  id          uuid primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  phone       text,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz
);
create index if not exists udhaar_people_user_updated on public.udhaar_people(user_id, updated_at);

create table if not exists public.udhaar_entries (
  id           uuid primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  person_id    uuid not null references public.udhaar_people(id),
  direction    text not null check (direction in ('given','received','took','paid')),
  amount_paise bigint not null check (amount_paise > 0 and amount_paise <= 1000000000),
  occurred_at  timestamptz not null,
  occurred_on  date not null,
  note         text,
  created_at   timestamptz not null,
  updated_at   timestamptz not null,
  deleted_at   timestamptz
);
create index if not exists udhaar_entries_user_updated on public.udhaar_entries(user_id, updated_at);

-- Row Level Security: enabled, no policies — see note at the top of this file.
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.udhaar_people  enable row level security;
alter table public.udhaar_entries enable row level security;

-- Account deletion is done by the backend (DELETE /account or similar, service role):
--   delete from public.profiles where id = :uid;  -- cascades to categories/transactions/udhaar_*
