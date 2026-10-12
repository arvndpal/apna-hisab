-- Premium entitlement, tracked server-side so it survives a reinstall/new device — unlike the
-- mobile app's local-only Play-purchase cache (settingsRepo's StoredEntitlement), a trial granted
-- here can't be reset just by clearing app data. One row per state change (trial start, purchase,
-- a future cancel), never updated in place except to supersede the previous "active" row, so the
-- history stays intact.

create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  plan                text not null check (plan in ('trial', 'monthly', 'yearly')),
  status              text not null check (status in ('active', 'cancelled')),
  source              text not null check (source in ('trial', 'play')),
  play_product_id     text,
  play_purchase_token text,
  started_at          timestamptz not null default now(),
  ends_at             timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists subscriptions_user on public.subscriptions(user_id);
-- At most one row per user can be the current one — recordPurchase() cancels the old row before
-- inserting the new one, in the same transaction, so this never actually gets to reject a write.
create unique index if not exists subscriptions_user_active on public.subscriptions(user_id) where status = 'active';
