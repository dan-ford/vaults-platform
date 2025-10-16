-- Security fix: Add search_path = '' to all functions to prevent SQL injection
-- This prevents malicious users from creating schemas/functions with conflicting names

-- Fix accept_org_invite
ALTER FUNCTION public.accept_org_invite(uuid) SET search_path = '';

-- Fix is_platform_admin
ALTER FUNCTION public.is_platform_admin() SET search_path = '';

-- Fix is_tenant_admin
ALTER FUNCTION public.is_tenant_admin(uuid) SET search_path = '';

-- Fix is_tenant_member
ALTER FUNCTION public.is_tenant_member(uuid) SET search_path = '';

-- Fix migrate_tenants_to_organizations
ALTER FUNCTION public.migrate_tenants_to_organizations() SET search_path = '';

-- Fix search_chunks_hybrid
ALTER FUNCTION public.search_chunks_hybrid(extensions.vector, text, uuid, integer, double precision) SET search_path = '';

-- Fix user_is_org_admin
ALTER FUNCTION public.user_is_org_admin(uuid) SET search_path = '';

-- Fix user_is_org_member
ALTER FUNCTION public.user_is_org_member(uuid) SET search_path = '';
