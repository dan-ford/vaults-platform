/**
 * Legacy Tenant Constants
 *
 * DEPRECATED: tenant_id is a legacy field maintained for backward compatibility.
 * All new code should use org_id for organization-scoped access control.
 * Access control is enforced through RLS policies on org_id and user memberships.
 *
 * TODO: Make tenant_id nullable in database and eventually remove it.
 */

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
