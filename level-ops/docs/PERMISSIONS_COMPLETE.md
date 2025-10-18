# VAULTS Permissions System - Complete Reference

**Last Updated:** 2025-10-18
**Status:** Fully Implemented
**Coverage:** Multi-tenant RBAC with Row-Level Security

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Role Definitions](#role-definitions)
3. [Permission Matrix](#permission-matrix)
4. [Database Schema](#database-schema)
5. [Implementation Guide](#implementation-guide)
6. [Page-Level Patterns](#page-level-patterns)
7. [Agent Action Protection](#agent-action-protection)
8. [Testing Guide](#testing-guide)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

VAULTS implements a comprehensive role-based access control (RBAC) system with:
- **Multi-tenant architecture** with organization-scoped data
- **Four distinct roles** (OWNER, ADMIN, EDITOR, VIEWER)
- **Row-Level Security (RLS)** enforced at database level
- **UI-level permission guards** for better UX
- **Agent action protection** for AI operations

### High-Level Model

- **Users:** Authenticated via Supabase Auth, extended data in `profiles`
- **Organizations:** White-label container with branding and settings
- **Memberships:** Join table (`org_memberships`) mapping users to orgs with roles
- **Roles:** OWNER, ADMIN, EDITOR, VIEWER (extensible)
- **Permissions:** Enforced via RLS + role checks
- **Invitations:** Org admins can invite by email with token-based acceptance

---

## Role Definitions

### 1. OWNER
- **Highest level of access**
- Full control over all organization resources
- Can manage organization settings, branding, and modules
- Can perform all CRUD operations
- Can manage team members and assign roles
- Typically the organization creator
- **Special:** Cannot be removed if last OWNER

### 2. ADMIN
- **Equivalent permissions to OWNER**
- Full control over all organization resources
- Can manage organization settings and team members
- Can perform all CRUD operations
- Assigned by OWNER to help manage organization

### 3. EDITOR
- Can **create** new records
- Can **read** all records
- Can **update** existing records
- **Cannot delete** records (reserved for ADMIN/OWNER)
- **Cannot access** organization settings (only own profile)
- Suitable for active contributors without destructive permissions

### 4. VIEWER
- **Read-only** access to all records
- **Cannot create, update, or delete** any records
- **Cannot access** organization settings (only own profile)
- Suitable for stakeholders who need visibility without editing

---

## Permission Matrix

| Feature | VIEWER | EDITOR | ADMIN | OWNER |
|---------|--------|--------|-------|-------|
| View all records | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Create records | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| Edit records | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| Delete records | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| Access profile settings | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Access organization settings | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| Manage team members | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| Access platform admin | ❌ No | ❌ No | ❌ No | ✅ Yes* |

*Platform admin access requires separate `is_platform_admin` flag

---

## Database Schema

### Extensions

```sql
-- UUIDs & crypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
```

### Profiles Table

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can see/update only their own profile
CREATE POLICY "profiles_select_self" ON public.profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Auto-create Profile on Signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Organizations Table

```sql
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  brand_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Select: members of the org
CREATE POLICY "orgs_select_members" ON public.organizations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = organizations.id AND m.user_id = auth.uid()
  )
);

-- Update: OWNER/ADMIN only
CREATE POLICY "orgs_update_admins" ON public.organizations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = organizations.id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER','ADMIN')
  )
);
```

### Memberships Table

```sql
CREATE TYPE public.org_role AS ENUM ('OWNER','ADMIN','EDITOR','VIEWER');

CREATE TABLE IF NOT EXISTS public.org_memberships (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_memberships_user ON public.org_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON public.org_memberships(org_id);

ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;

-- User can see their own memberships
CREATE POLICY "org_memberships_select_self" ON public.org_memberships
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins can see all org memberships
CREATE POLICY "org_memberships_select_by_admin" ON public.org_memberships
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m2
    WHERE m2.org_id = org_memberships.org_id
      AND m2.user_id = auth.uid()
      AND m2.role IN ('OWNER','ADMIN')
  )
);
```

### Guard Against Removing Last OWNER

```sql
CREATE OR REPLACE FUNCTION public.ensure_owner_persistence()
RETURNS TRIGGER AS $$
DECLARE owner_count int;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT COUNT(*) INTO owner_count
    FROM public.org_memberships
    WHERE org_id = COALESCE(old.org_id, new.org_id)
      AND role = 'OWNER';

    IF TG_OP = 'DELETE' AND old.role = 'OWNER' THEN
      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last OWNER of an organization';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND old.role = 'OWNER' AND new.role <> 'OWNER' THEN
      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot demote the last OWNER of an organization';
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(new, old);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_owner_persistence
AFTER UPDATE OR DELETE ON public.org_memberships
FOR EACH ROW EXECUTE FUNCTION public.ensure_owner_persistence();
```

### Invitations Table

```sql
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'VIEWER',
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_invites_org ON public.org_invitations(org_id);
CREATE INDEX idx_org_invites_email ON public.org_invitations(email);

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Only OWNER/ADMIN can manage invites
CREATE POLICY "invites_rw_admins" ON public.org_invitations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = org_invitations.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER','ADMIN')
  )
);
```

### RLS Pattern for Org-Scoped Resources

For any table with `org_id` column:

```sql
ALTER TABLE public.org_resources ENABLE ROW LEVEL SECURITY;

-- SELECT: all org members
CREATE POLICY "res_select_members" ON public.org_resources
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = org_resources.org_id AND m.user_id = auth.uid()
  )
);

-- INSERT: EDITOR, ADMIN, OWNER
CREATE POLICY "res_insert_editor_plus" ON public.org_resources
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = org_resources.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER','ADMIN','EDITOR')
  )
);

-- UPDATE: EDITOR, ADMIN, OWNER
CREATE POLICY "res_update_editor_plus" ON public.org_resources
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = org_resources.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER','ADMIN','EDITOR')
  )
);

-- DELETE: ADMIN, OWNER only
CREATE POLICY "res_delete_admin_plus" ON public.org_resources
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.org_id = org_resources.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER','ADMIN')
  )
);
```

---

## Implementation Guide

### Permission Hook

**File:** `lib/hooks/use-permissions.ts`

```typescript
import { usePermissions } from "@/lib/hooks/use-permissions";

function MyComponent() {
  const {
    role,           // Current role: OWNER | ADMIN | EDITOR | VIEWER
    canEdit,        // Boolean: can create/edit
    canDelete,      // Boolean: can delete
    canManage,      // Boolean: can access org settings
    hasPermission   // Function: check specific permission
  } = usePermissions();

  if (!canEdit) return null;
}
```

### Permission Guard Component

**File:** `components/permissions/permission-guard.tsx`

```typescript
import { PermissionGuard } from "@/components/permissions";

function MyComponent() {
  return (
    <PermissionGuard require="create">
      <Button onClick={createRecord}>Create</Button>
    </PermissionGuard>
  );
}
```

**Permission levels:**
- `create` - EDITOR, ADMIN, OWNER
- `edit` - EDITOR, ADMIN, OWNER
- `delete` - ADMIN, OWNER
- `admin` - ADMIN, OWNER
- `view` - All roles

### Role Badge Component

**File:** `components/permissions/role-badge.tsx`

```typescript
import { RoleBadge } from "@/components/permissions";

function PageHeader() {
  return (
    <div>
      <h1>Page Title</h1>
      <RoleBadge />  {/* Shows: Owner, Admin, Editor, or Viewer */}
    </div>
  );
}
```

### Error Handling Utilities

#### Permission Errors

**File:** `lib/utils/permission-errors.ts`

```typescript
import {
  getCreatePermissionError,
  getEditPermissionError,
  getDeletePermissionError
} from "@/lib/utils/permission-errors";

// Returns: "Permission denied: You need EDITOR, ADMIN, or OWNER role..."
const error = getCreatePermissionError("contacts", role);
```

#### Supabase Errors

**File:** `lib/utils/error-handling.ts`

```typescript
import {
  getSupabaseErrorMessage,
  logError,
  isPermissionError
} from "@/lib/utils/error-handling";

const { data, error } = await supabase.from("table").select();

if (error) {
  const message = getSupabaseErrorMessage(error);
  logError(error, {
    action: "load_data",
    resource: "contacts",
    userId: user.id
  });

  if (isPermissionError(error)) {
    // Handle permission error specially
  }
}
```

---

## Page-Level Patterns

Every data management page follows this pattern:

```typescript
"use client";

import { useState, useEffect } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PermissionGuard, RoleBadge } from "@/components/permissions";
import { getCreatePermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";
import { getSupabaseErrorMessage, logError } from "@/lib/utils/error-handling";
import { ErrorState, LoadingState } from "@/components/error-states";

export default function MyPage() {
  const { canEdit, canDelete, role } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Data loading with error handling
  const loadData = async () => {
    try {
      setLoadError(null);
      const { data, error } = await supabase.from("table").select();

      if (error) {
        setLoadError(getSupabaseErrorMessage(error));
        logError(error, { action: "load", resource: "table" });
      } else {
        setData(data);
      }
    } catch (error) {
      setLoadError("An unexpected error occurred");
      logError(error as Error, { action: "load" });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading and error states
  if (isLoading) return <LoadingState message="Loading..." />;
  if (loadError) return <ErrorState title="Error" message={loadError} onRetry={loadData} />;

  return (
    <div>
      <header>
        <h1>Page Title</h1>
        <RoleBadge />
      </header>

      {/* Conditionally show action buttons */}
      <PermissionGuard require="create">
        <Button onClick={onCreate}>Create</Button>
      </PermissionGuard>

      {/* Data list with conditional edit/delete */}
      {data.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>

          <PermissionGuard require="edit">
            <Button onClick={() => onEdit(item)}>Edit</Button>
          </PermissionGuard>

          <PermissionGuard require="delete">
            <Button onClick={() => onDelete(item)}>Delete</Button>
          </PermissionGuard>
        </div>
      ))}
    </div>
  );
}
```

### Settings Page Protection

```typescript
// All users can access Settings menu item
const canAccessSettings = true;

// But tabs are gated
const { canManage } = usePermissions();

// VIEWER/EDITOR: Only Profile tab visible
// ADMIN/OWNER: All tabs visible (Profile, Organization, Team, Branding, Modules)
```

### Platform Admin Page

```typescript
// Only visible to platform administrators
const { isPlatformAdmin } = useOrganization();

if (!isPlatformAdmin) {
  return <ErrorState title="Access Denied" message="Platform admin access required" />;
}
```

---

## Agent Action Protection

All CopilotKit agent actions check permissions before executing:

```typescript
useCopilotAction({
  name: "createContact",
  description: "Create a new contact",
  parameters: [...],
  handler: async ({ params }) => {
    // Check permission first
    if (!canEdit) {
      return getCreatePermissionError("contacts", role);
    }

    // Proceed with action
    const { data, error } = await supabase.from("contacts").insert(...);

    if (error) {
      return getSupabaseErrorMessage(error);
    }

    return "Contact created successfully";
  }
});
```

---

## Testing Guide

### Test Accounts Required

Create 4 test accounts with different roles in the same organization:

1. **Owner Account** (`owner@test.com`) - Full control
2. **Admin Account** (`admin@test.com`) - Full control
3. **Editor Account** (`editor@test.com`) - Create/edit only
4. **Viewer Account** (`viewer@test.com`) - Read-only

### Testing Checklist (Per Page)

For each role, test each page:

#### Contacts Page Tests

**VIEWER:**
- [ ] Page loads, can see all contacts
- [ ] Role badge shows "Viewer"
- [ ] Add/Edit/Delete buttons HIDDEN
- [ ] Agent actions return permission denied

**EDITOR:**
- [ ] Add/Edit buttons VISIBLE and work
- [ ] Delete buttons HIDDEN
- [ ] Agent create/update work, delete denied

**ADMIN/OWNER:**
- [ ] All buttons visible and functional
- [ ] All agent actions work

#### Repeat for All Pages:
- [ ] Tasks
- [ ] Milestones
- [ ] Risks
- [ ] Decisions
- [ ] Documents
- [ ] Settings (tab visibility testing)
- [ ] Admin page (platform admin only)

### Agent Action Testing

Test via CopilotKit chat interface:

**VIEWER:**
```
"Create a new contact" → Permission denied
"Update task status" → Permission denied
"Delete a contact" → Permission denied
```

**EDITOR:**
```
"Create a new contact" → SUCCESS
"Update task status" → SUCCESS
"Delete a contact" → Permission denied
```

**ADMIN/OWNER:**
```
All actions → SUCCESS
```

### Error Handling Tests

1. **Network Error:** Disconnect, try to load page, should show error with retry
2. **Permission Error:** VIEWER tries org settings, should redirect/error
3. **Loading States:** Throttle network, verify spinners show

### Regression Tests

After any changes, verify:
- [ ] VIEWER cannot create/edit/delete on ANY page
- [ ] EDITOR can create/edit but not delete
- [ ] ADMIN/OWNER have full access
- [ ] Settings tabs properly gated
- [ ] Admin page only for platform admins
- [ ] All agent actions respect permissions

---

## Security Considerations

### Client vs Server Security

This implementation provides **UI-level permission enforcement**. For production:

1. **Row-Level Security (RLS)** MUST be enabled on all tables
2. **Server-side validation** should duplicate all permission checks
3. **API routes** must verify user roles before operations
4. **Never rely solely on client-side checks**

### Security Best Practices

- ✅ **RLS on every table** - Deny by default
- ✅ **Realtime under RLS** - Subscribe to narrow scopes
- ✅ **Files via signed URLs** - Path prefix `tenants/{tenantId}/`
- ✅ **Audit all writes** - Log before/after states
- ✅ **Break-glass restricted** - Platform admins only, all use logged

### Database Security Notes

- Never trust client-side org selection for authorization
- Use `SECURITY INVOKER` functions (avoid `SECURITY DEFINER`)
- Keep service-role operations server-side only
- Redact PII in logs, never log JWTs/tokens
- Rate-limit invite creation and acceptance

---

## Troubleshooting

### Common Issues

**Problem:** EDITOR user sees delete buttons
- Check `<PermissionGuard require="delete">` wraps button
- Verify `usePermissions` hook called correctly
- Check role loaded from organization context

**Problem:** Agent actions succeed despite no permissions
- Verify permission check at start of handler
- Check `canEdit`/`canDelete` variables destructured correctly
- Ensure error message returned, not thrown

**Problem:** Role badge not showing
- Verify `<RoleBadge />` added to page header
- Check organization context properly loaded
- Verify user has role in current organization

**Problem:** Settings tabs visible for VIEWER
- Check `canManage` used to gate tabs, not `isAdmin`
- Verify Settings page using permissions from hook
- Check organization context has correct role

### Debugging Tips

```typescript
// Log current permissions
console.log({
  role,
  canEdit,
  canDelete,
  canManage,
  isPlatformAdmin
});

// Check organization context
console.log("Current org:", currentOrg);
console.log("Membership:", membership);
```

---

## Extending the System

### Adding New Permissions

1. Update `usePermissions` hook
2. Add new permission to `PermissionGuard` types
3. Update permission error utilities
4. Document the new permission

### Adding New Protected Resources

For each new data type:

1. Apply permission guards to UI buttons
2. Add permission checks to agent actions
3. Use standardized error messages
4. Add RLS policies to database
5. Add test cases

---

## Future Enhancements

Potential improvements:

1. **Granular Permissions** - Field-level access control
2. **Resource-Specific Roles** - Different roles per module
3. **Time-Based Permissions** - Temporary elevated access
4. **Permission Inheritance** - Team-level vs org-level roles
5. **Audit Trail** - Detailed permission check logging
6. **Permission Analytics** - Track denial patterns
7. **Custom Roles** - Per-org role definitions
8. **SAML/SCIM** - Enterprise SSO integration

---

## Related Documentation

- **Database Schema:** See `DATA_MODEL.md` for complete schema
- **Architecture:** See `ARCHITECTURE.md` for system architecture
- **Security:** See `SECURITY.md` for security posture
- **API Reference:** See `ENVIRONMENT_VARIABLES.md` for configuration

---

**Document Owner:** Development Team
**Last Reviewed:** 2025-10-18
**Next Review:** 2026-01-18
