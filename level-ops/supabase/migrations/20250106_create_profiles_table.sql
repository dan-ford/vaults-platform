-- Migration: Create profiles table for user display information
-- Run this in Supabase Dashboard > SQL Editor

-- Create profiles table to store user display information
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for efficient lookups
create index if not exists idx_profiles_email on public.profiles(email);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: Users can view all profiles (for member lists, contact info, etc.)
create policy "Users can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Policy: Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can insert their own profile (for signup flow)
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

-- Trigger to auto-create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users into profiles table
insert into public.profiles (user_id, email, first_name, last_name)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'first_name', ''),
  coalesce(raw_user_meta_data->>'last_name', '')
from auth.users
where not exists (
  select 1 from public.profiles where user_id = auth.users.id
);

-- Enable realtime for profiles table
alter publication supabase_realtime add table public.profiles;
