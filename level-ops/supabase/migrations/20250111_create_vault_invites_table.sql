-- Migration: Create vault_invites table for managing vault member invitations
-- Run this in Supabase Dashboard > SQL Editor or via Supabase CLI

-- Create vault_invites table
create table if not exists public.vault_invites (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);

-- Create indexes for efficient lookups
create index if not exists idx_vault_invites_vault_id on public.vault_invites(vault_id);
create index if not exists idx_vault_invites_token on public.vault_invites(token);
create index if not exists idx_vault_invites_invitee_email on public.vault_invites(invitee_email);
create index if not exists idx_vault_invites_status on public.vault_invites(status);

-- Enable RLS
alter table public.vault_invites enable row level security;

-- Policy: Vault admins can view invites for their vaults
create policy "Vault admins can view vault invites"
  on public.vault_invites
  for select
  to authenticated
  using (
    exists (
      select 1 from public.vault_members
      where vault_id = vault_invites.vault_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Policy: Vault admins can create invites
create policy "Vault admins can create vault invites"
  on public.vault_invites
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.vault_members
      where vault_id = vault_invites.vault_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Policy: Vault admins can update invites (for cancellation)
create policy "Vault admins can update vault invites"
  on public.vault_invites
  for update
  to authenticated
  using (
    exists (
      select 1 from public.vault_members
      where vault_id = vault_invites.vault_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- Policy: Invitees can view their own invites (by email)
create policy "Invitees can view their own invites"
  on public.vault_invites
  for select
  to authenticated
  using (
    invitee_email = (select email from auth.users where id = auth.uid())
  );

-- Function to auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to auto-update updated_at on vault_invites
drop trigger if exists set_vault_invites_updated_at on public.vault_invites;
create trigger set_vault_invites_updated_at
  before update on public.vault_invites
  for each row execute procedure public.handle_updated_at();

-- Enable realtime for vault_invites table
alter publication supabase_realtime add table public.vault_invites;
