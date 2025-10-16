-- Migration: Create user_notification_prefs table
-- Run this in Supabase Dashboard > SQL Editor or via Supabase CLI

-- Create user notification preferences table
create table if not exists public.user_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_invites boolean not null default true,
  email_digests boolean not null default true,
  sms_alerts boolean not null default false,
  whatsapp_alerts boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Create index for efficient lookups
create index if not exists idx_user_notification_prefs_user_id
  on public.user_notification_prefs(user_id);

-- Enable RLS
alter table public.user_notification_prefs enable row level security;

-- Policy: Users can read their own preferences
create policy "Users can read own notification preferences"
  on public.user_notification_prefs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can update their own preferences
create policy "Users can update own notification preferences"
  on public.user_notification_prefs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
create policy "Users can insert own notification preferences"
  on public.user_notification_prefs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Function to auto-create notification preferences on user signup
create or replace function public.handle_new_user_notification_prefs()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_notification_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger to auto-create notification preferences on user signup
drop trigger if exists on_auth_user_created_notification_prefs on auth.users;
create trigger on_auth_user_created_notification_prefs
  after insert on auth.users
  for each row execute procedure public.handle_new_user_notification_prefs();

-- Backfill existing users with default notification preferences
insert into public.user_notification_prefs (user_id)
select id
from auth.users
where not exists (
  select 1 from public.user_notification_prefs where user_id = auth.users.id
);

-- Enable realtime for notification preferences table
alter publication supabase_realtime add table public.user_notification_prefs;
