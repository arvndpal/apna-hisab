-- Server-sent push (FCM): one row per device registered for push notifications.
-- Deliberately not part of the generic sync push/pull mechanism (TABLE_COLUMNS in
-- backend/src/sync/sync.constants.ts) - this is server-side bookkeeping, not user data with
-- offline/multi-device merge semantics.

create table if not exists public.device_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  token        text not null unique,
  platform     text not null check (platform in ('android', 'ios')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists device_tokens_user on public.device_tokens(user_id);
