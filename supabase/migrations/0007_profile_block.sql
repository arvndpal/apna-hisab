-- Lets an admin lock an account out of the app (moderation, abuse, etc.) without deleting any of
-- their data. Enforced client-side today (HomeScreen replaces the dashboard with a blocked message
-- once GET /auth/me reports is_blocked) — the flag is still exposed through the normal profile
-- response rather than a dedicated endpoint, so no extra round trip is needed to learn about it.

alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_reason text;
