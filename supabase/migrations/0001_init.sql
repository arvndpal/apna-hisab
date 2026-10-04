-- Apna Hisab cloud schema (Supabase Postgres). Mirrors src/database/schema.sql.
-- Every table: user_id = auth.uid() enforced by RLS. Rows are upserted by the device (ids are client UUIDs).

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  avatar_url  text,
  language    text not null default 'en' check (language in ('en','hi')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
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
  user_id        uuid not null references auth.users(id) on delete cascade,
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
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  phone       text,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz
);
create index if not exists udhaar_people_user_updated on public.udhaar_people(user_id, updated_at);

create table if not exists public.udhaar_entries (
  id           uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
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

-- Row Level Security
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.udhaar_people  enable row level security;
alter table public.udhaar_entries enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['categories','transactions','udhaar_people','udhaar_entries'] loop
    execute format('create policy "own rows select" on public.%I for select using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "own rows update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Create a profile row on first sign-in
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Account deletion is done by an Edge Function `delete-account` (service role):
--   delete from udhaar_entries/udhaar_people/transactions/categories/profiles where user_id = :uid;
--   auth.admin.deleteUser(:uid)
