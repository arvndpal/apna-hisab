-- Admin-only in-app screen for sending push notifications (Part B of the push notifications
-- feature) gates on this column rather than a separate credential.

alter table public.profiles
  add column if not exists user_type text not null default 'user' check (user_type in ('admin', 'user'));
