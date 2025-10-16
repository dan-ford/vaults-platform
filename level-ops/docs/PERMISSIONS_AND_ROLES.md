
Level — Permissions, Roles & Multitenancy (Supabase Implementation Plan)
Owner: Platform Status: Approved for implementation Last updated: 2025-10-05
0) Objectives
	•	Support multi-tenant orgs with white-label branding.
	•	Users have a single Level profile and can belong to multiple orgs.
	•	Org Admins can customize branding and invite/manage members.
	•	Enforce Row-Level Security (RLS) across all data access paths.
	•	Provide a consistent API surface for frontend (CopilotKit) + backend (FastAPI/LangGraph).
	•	Ship with auditability, tests, and safe migrations.

1) High-Level Model
	•	Users: authenticated via Supabase Auth; extended data in profiles.
	•	Organizations: white-label container; branding + settings.
	•	Memberships: join table (org_memberships) mapping users↔orgs with a role.
	•	Roles (baseline): OWNER, ADMIN, EDITOR, VIEWER (extensible).
	•	Permissions: implemented via RLS + role checks; optional fine-grained rules per resource.
	•	Invites: org admin can invite by email; acceptance binds Auth user → org membership.

2) Database Schema (SQL)
Run as migrations. Keep SECURITY INVOKER on functions to ensure RLS applies. All tables RLS-enabled.
2.1 Extensions
-- UUIDs & crypto
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "uuid-ossp" with schema public;
2.2 Profiles
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

alter table public.profiles enable row level security;

-- Users can see/update only their own profile
create policy "profiles_select_self" on public.profiles
for select to authenticated
using (user_id = auth.uid());

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
Trigger to seed profile on signup:
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
2.3 Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Select: members of the org (via membership subquery)
create policy "orgs_select_members" on public.organizations
for select to authenticated
using (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = organizations.id and m.user_id = auth.uid()
  )
);

-- Insert: only Level "platform operators" (by service role) or a dedicated admin role
-- We keep inserts blocked for normal users; Level Admins perform via backend service role.
create policy "orgs_insert_service_only" on public.organizations
for insert to service_role using (true) with check (true);

-- Update: OWNER/ADMIN of that org
create policy "orgs_update_admins" on public.organizations
for update to authenticated
using (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
)
with check (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
);
2.4 Memberships (Users ↔ Orgs)
create type public.org_role as enum ('OWNER','ADMIN','EDITOR','VIEWER');

create table if not exists public.org_memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists idx_org_memberships_user on public.org_memberships(user_id);
create index if not exists idx_org_memberships_org on public.org_memberships(org_id);

alter table public.org_memberships enable row level security;

-- A user can see their memberships
create policy "org_memberships_select_self" on public.org_memberships
for select to authenticated
using (user_id = auth.uid());

-- Only admins of the org can see all org memberships
create policy "org_memberships_select_by_admin" on public.org_memberships
for select to authenticated
using (
  exists (
    select 1 from public.org_memberships m2
    where m2.org_id = org_memberships.org_id
      and m2.user_id = auth.uid()
      and m2.role in ('OWNER','ADMIN')
  )
);

-- Insert membership: service role OR org OWNER/ADMIN (invitation acceptance handled via RPC)
create policy "org_memberships_insert_service_or_admin" on public.org_memberships
for insert to authenticated
with check (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = org_memberships.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
);

-- Update role: OWNER/ADMIN only (cannot demote the last OWNER)
create policy "org_memberships_update_admins" on public.org_memberships
for update to authenticated
using (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = org_memberships.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
)
with check (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = org_memberships.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
);
Guard rail (function) to prevent removing the last OWNER:
create or replace function public.ensure_owner_persistence()
returns trigger as $$
declare owner_count int;
begin
  if tg_op in ('UPDATE','DELETE') then
    select count(*) into owner_count
    from public.org_memberships
    where org_id = coalesce(old.org_id, new.org_id)
      and role = 'OWNER';

    -- After update/delete, if no owner remains, reject.
    if tg_op = 'DELETE' and old.role = 'OWNER' then
      if owner_count <= 1 then
        raise exception 'Cannot remove the last OWNER of an organization';
      end if;
    elsif tg_op = 'UPDATE' and old.role = 'OWNER' and new.role <> 'OWNER' then
      if owner_count <= 1 then
        raise exception 'Cannot demote the last OWNER of an organization';
      end if;
    end if;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_owner_persistence on public.org_memberships;
create trigger trg_owner_persistence
after update or delete on public.org_memberships
for each row execute function public.ensure_owner_persistence();
2.5 Invitations
create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'VIEWER',
  token text not null,                 -- random secure token
  expires_at timestamptz not null,     -- e.g., now() + interval '7 days'
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invites_org on public.org_invitations(org_id);
create index if not exists idx_org_invites_email on public.org_invitations(email);

alter table public.org_invitations enable row level security;

-- Only OWNER/ADMIN of the org can manage invites
create policy "invites_rw_admins" on public.org_invitations
for all to authenticated
using (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = org_invitations.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
)
with check (
  exists (
    select 1 from public.org_memberships m
    where m.org_id = org_invitations.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN')
  )
);
RPC to accept an invite (validates token & email):
create or replace function public.accept_org_invite(invite_token text)
returns void
language plpgsql
security invoker
as $$
declare
  v_invite public.org_invitations%rowtype;
begin
  select * into v_invite from public.org_invitations
  where token = invite_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  -- ensure invite email matches current user email
  if (select email from public.profiles where user_id = auth.uid()) <> v_invite.email then
    raise exception 'Invitation email does not match authenticated user';
  end if;

  insert into public.org_memberships(org_id, user_id, role)
  values (v_invite.org_id, auth.uid(), v_invite.role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  update public.org_invitations
  set accepted_at = now()
  where id = v_invite.id;
end;
$$;


Add resource-specific tables with a org_id column and apply similar RLS patterns:
	•	SELECT allowed if user is a member (exists on org_memberships).
	•	INSERT/UPDATE/DELETE based on role thresholds (e.g., EDITOR+).

4) Frontend & UX Flows
4.1 Sign-Up & Profile
	•	User signs up via Supabase Auth.
	•	profiles row is auto-created by trigger.
	•	Users can edit profile (RLS self-update).
4.2 Org Creation
	•	Level Platform Admin (service role call) creates an org and seeds 1+ org_memberships with OWNER (the initial org admin).
	•	Org admin customizes logo and brand_color.
4.3 Invites
	•	Org admin creates invite → email magic link containing invite_token.
	•	Recipient signs in (or signs up) → clicks link → frontend calls rpc.accept_org_invite(token).
	•	On success, membership created/updated.
4.4 Org Switching
	•	Top-nav shows current org + drop-down of organizations from org_memberships.
	•	Switching org updates client state (e.g., currentOrgId in app store).
	•	All API calls include org context in parameters (never rely on client-only state to authorize).

5) API Surface (FastAPI + Supabase)
Keep authorization in Postgres via RLS; APIs pass org_id explicitly.
Examples:
	•	GET /api/orgs → list orgs for current user (select policy will constrain).
	•	POST /api/orgs/:id/branding → update logo/color (RLS ensures ADMIN+).
	•	POST /api/orgs/:id/invites → create invite (ADMIN+).
	•	POST /api/invites/accept { token } → calls rpc.accept_org_invite.
Pydantic models (sketch):
class BrandingUpdate(BaseModel):
    logo_url: Optional[AnyUrl] = None
    brand_color: Optional[str] = None

class InviteCreate(BaseModel):
    email: EmailStr
    role: Literal['OWNER','ADMIN','EDITOR','VIEWER'] = 'VIEWER'

6) RLS Patterns for Org-Scoped Resources
For any table org_resources with org_id:
alter table public.org_resources enable row level security;

create policy "res_select_members" on public.org_resources
for select to authenticated
using (
  exists (select 1 from public.org_memberships m
    where m.org_id = org_resources.org_id and m.user_id = auth.uid())
);

create policy "res_insert_editor_plus" on public.org_resources
for insert to authenticated
with check (
  exists (select 1 from public.org_memberships m
    where m.org_id = org_resources.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN','EDITOR'))
);

create policy "res_update_editor_plus" on public.org_resources
for update to authenticated
using (
  exists (select 1 from public.org_memberships m
    where m.org_id = org_resources.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN','EDITOR'))
)
with check (
  exists (select 1 from public.org_memberships m
    where m.org_id = org_resources.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN','EDITOR'))
);

create policy "res_delete_admin_plus" on public.org_resources
for delete to authenticated
using (
  exists (select 1 from public.org_memberships m
    where m.org_id = org_resources.org_id
      and m.user_id = auth.uid()
      and m.role in ('OWNER','ADMIN'))
);

7) Security Notes
	•	Never trust client-side org selection for authorization; RLS is the guardrail.
	•	Use SECURITY INVOKER functions; avoid SECURITY DEFINER unless strictly needed.
	•	Keep service-role operations to backend only (Edge Function or server).
	•	Redact PII in logs; avoid logging JWTs/tokens.
	•	Rate-limit invite creation and acceptance.

8) Auditing
Create a lightweight audit table:
create table if not exists public.audit_log (
  id bigserial primary key,
  user_id uuid,
  org_id uuid,
  action text not null,
  resource_table text,
  resource_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Write to audit_log from backend for sensitive actions (role changes, branding updates, invites).

9) Performance & Scale
	•	Indexes already present on membership joins.
	•	Keep org lists paginated for large tenants.
	•	If a few tenants dominate size, consider table partitioning per tenant for heavy org-scoped tables (not needed initially).

10) Email & Tokens
	•	Invitation token: random 32–48 bytes, base64url; store hashed token if desired (like password reset).
	•	Expiry default: 7 days; configurable per org.
	•	Emails via Supabase functions/Edge + provider (Resend/SendGrid).

11) Frontend Integration (CopilotKit)
	•	Keep an app store: { currentUser, orgs[], currentOrgId }.
	•	On org switch: refresh queries scoped by org_id.
	•	Hide admin actions in UI if role < required (defense-in-depth: UI + RLS).

12) Testing & QA
Unit
	•	Role transitions: cannot remove last OWNER; ADMIN can’t demote OWNER.
	•	Invite acceptance: must match email; expired token rejected.
Integration
	•	A user in no org cannot read any org data.
	•	VIEWER cannot write; EDITOR can create/update; ADMIN can manage members.
	•	RLS leakage tests: cross-tenant reads fail.
E2E
	•	Create org (service), seed OWNER, upload branding, invite user, accept, switch orgs, verify permissions.

13) Migration Plan (Safe Order)
	1	Create types & tables (profiles, organizations, org_memberships, org_invitations, audit_log).
	2	Enable RLS; add SELECT policies first (read-only).
	3	Add INSERT/UPDATE/DELETE policies.
	4	Create triggers (handle_new_user, owner guard).
	5	Deploy Edge/Backend routes (service role isolated).
	6	Backfill existing users → profiles; backfill initial orgs/memberships if needed.
	7	UAT with seeded test data.
Rollback: drop policies first (or disable RLS), then tables/types in reverse.

14) Acceptance Criteria
	•	Users can sign up, see/edit their profile.
	•	Org Admins can update branding and invite members.
	•	Invited users can accept and see the org in the org switcher.
	•	RLS prevents any access to non-member orgs.
	•	Attempting to remove/demote last OWNER is blocked.
	•	Audit entries exist for invitations, role changes, and branding updates.

15) Nice-to-Haves (Phase 2)
	•	Custom roles with per-permission bitmasks (table org_roles + org_role_permissions).
	•	Team groups within an org.
	•	SAML/SCIM for enterprise orgs.
	•	Org-scoped API keys with granular scopes.

16) Developer Checklist
	•	Apply SQL migrations (local → staging → prod).
	•	Implement backend endpoints (FastAPI) + RPC wrappers.
	•	Wire invite email sender and token generation.
	•	Build org switcher UI + branding theming.
	•	Add membership guard HOCs/hooks in frontend routes.
	•	Add audit logging hooks.
	•	Write unit/integration/E2E tests; set up CI.
	•	Add docs for support & runbooks.

17) Example Backend Snippets
Create invite (admin-only):
def create_invite(org_id: str, email: str, role: str = "VIEWER"):
  token = secrets.token_urlsafe(48)
  expires = datetime.utcnow() + timedelta(days=7)
  supabase.table("org_invitations").insert({
    "org_id": org_id,
    "email": email,
    "role": role,
    "token": token,
    "expires_at": expires.isoformat()
  }).execute()
  # send email with token link (Edge function)
Accept invite (client → RPC):
await supabase.rpc('accept_org_invite', { invite_token: token });
Fetch orgs for top-nav:
const { data } = await supabase
  .from('org_memberships')
  .select('org_id, role, organizations ( id, name, slug, logo_url, brand_color )');

Appendix A — FAQ
Why a join table instead of embedding org IDs on profiles? Scales cleanly to many-to-many memberships and supports role per org.
Why rely on RLS instead of all checks in the backend? RLS is the final gate. Backend enforces additional business rules, but RLS prevents accidental exposure from any path.
What about “Level Admins” who create orgs? They operate via service role on the backend (not from the client). You can maintain a small allowlist of Level operators in an env or table.

