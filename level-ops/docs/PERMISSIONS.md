# Permissions System Documentation

## Overview

Level Ops implements a comprehensive role-based access control (RBAC) system with four distinct roles, each with specific capabilities across the application.

## Role Hierarchy

### 1. OWNER
- Highest level of access
- Full control over all organization resources
- Can manage organization settings, branding, and modules
- Can perform all CRUD operations (Create, Read, Update, Delete)
- Can manage team members and assign roles
- Typically the organization creator

### 2. ADMIN
- Equivalent permissions to OWNER
- Full control over all organization resources
- Can manage organization settings and team members
- Can perform all CRUD operations
- Assigned by OWNER to manage the organization

### 3. EDITOR
- Can create new records
- Can read all records
- Can update existing records
- **Cannot delete records** (reserved for ADMIN/OWNER)
- **Cannot access organization settings** (only own profile)
- Suitable for active contributors who shouldn't have destructive permissions

### 4. VIEWER
- Read-only access to all records
- **Cannot create, update, or delete** any records
- **Cannot access organization settings** (only own profile)
- Suitable for stakeholders who need visibility without editing capabilities

## Permission Matrix

| Feature | VIEWER | EDITOR | ADMIN | OWNER |
|---------|--------|--------|-------|-------|
| View all records | Yes | Yes | Yes | Yes |
| Create records | No | Yes | Yes | Yes |
| Edit records | No | Yes | Yes | Yes |
| Delete records | No | No | Yes | Yes |
| Access profile settings | Yes | Yes | Yes | Yes |
| Access organization settings | No | No | Yes | Yes |
| Manage team members | No | No | Yes | Yes |
| Access platform admin | No | No | No | Yes* |

*Platform admin access requires separate `is_platform_admin` flag

## Implementation

### Core Components

#### 1. Permission Hook (`lib/hooks/use-permissions.ts`)

Provides permission checking functionality:

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

  // Use in component logic
  if (!canEdit) return null;
}
```

#### 2. Permission Guard Component (`components/permissions/permission-guard.tsx`)

Conditionally renders children based on permissions:

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

Permission levels:
- `create` - EDITOR, ADMIN, OWNER
- `edit` - EDITOR, ADMIN, OWNER
- `delete` - ADMIN, OWNER
- `admin` - ADMIN, OWNER
- `view` - All roles

#### 3. Role Badge Component (`components/permissions/role-badge.tsx`)

Displays current user's role:

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

### Agent Action Protection

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

    // Proceed with action...
    const { data, error } = await supabase.from("contacts").insert(...);

    if (error) {
      // Use standardized error handling
      return getSupabaseErrorMessage(error);
    }

    return "Contact created successfully";
  }
});
```

### Error Handling Utilities

#### Permission Errors (`lib/utils/permission-errors.ts`)

Standardized permission error messages:

```typescript
import { getCreatePermissionError, getEditPermissionError, getDeletePermissionError } from "@/lib/utils/permission-errors";

// Returns: "Permission denied: You need EDITOR, ADMIN, or OWNER role to create contacts..."
const error = getCreatePermissionError("contacts", role);
```

#### Supabase Errors (`lib/utils/error-handling.ts`)

Convert database errors to user-friendly messages:

```typescript
import { getSupabaseErrorMessage, logError, isPermissionError } from "@/lib/utils/error-handling";

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

## Page-Level Implementation

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

## Navigation Protection

### Settings Page

The Settings page has role-specific tab visibility:

```typescript
// All users can access Settings menu item
const canAccessSettings = true;

// But tabs are gated
const { canManage } = usePermissions();

// VIEWER/EDITOR: Only Profile tab visible
// ADMIN/OWNER: All tabs visible (Profile, Organization, Team, Branding, Modules)
```

### Admin Page

Platform admin access:

```typescript
// Only visible to platform administrators
const { isPlatformAdmin } = useOrganization();

if (!isPlatformAdmin) {
  return <ErrorState title="Access Denied" message="Platform admin access required" />;
}
```

## Testing Permissions

See `docs/PERMISSIONS_TESTING_GUIDE.md` for comprehensive testing procedures.

Key test scenarios:
1. Test each role on each page
2. Verify button visibility matches permissions
3. Test all agent actions with each role
4. Verify error messages are clear and actionable
5. Test Settings tab visibility for each role
6. Test Admin page access restrictions

## Security Considerations

### Client-Side vs Server-Side

This implementation provides **UI-level permission enforcement**. For production:

1. **Row-Level Security (RLS)** must be enabled on all Supabase tables
2. **Server-side validation** should duplicate all permission checks
3. **API routes** must verify user roles before operations
4. **Never rely solely on client-side checks** for security

### RLS Policy Examples

```sql
-- Contacts table: Users can only access contacts in their org
CREATE POLICY "Users can view contacts in their org"
ON contacts FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid()
  )
);

-- Contacts table: Only EDITOR/ADMIN/OWNER can insert
CREATE POLICY "Members with edit permission can insert contacts"
ON contacts FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid()
    AND role IN ('EDITOR', 'ADMIN', 'OWNER')
  )
);

-- Contacts table: Only ADMIN/OWNER can delete
CREATE POLICY "Only admins can delete contacts"
ON contacts FOR DELETE
USING (
  org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid()
    AND role IN ('ADMIN', 'OWNER')
  )
);
```

## Extending the Permission System

### Adding New Permissions

To add a new permission level:

1. Update `usePermissions` hook in `lib/hooks/use-permissions.ts`
2. Add new permission to `PermissionGuard` types
3. Update permission error utilities if needed
4. Document the new permission in this file

### Adding New Protected Resources

For each new data type:

1. Apply permission guards to UI buttons
2. Add permission checks to agent actions
3. Use standardized error messages
4. Add RLS policies to database
5. Add test cases to testing guide

## Troubleshooting

### Common Issues

**Problem**: User with EDITOR role sees delete buttons
- Check that `<PermissionGuard require="delete">` wraps the button
- Verify `usePermissions` hook is called correctly
- Check role is correctly loaded from organization context

**Problem**: Agent actions succeed despite no permissions
- Verify permission check is at the start of the handler
- Check `canEdit` or `canDelete` variables are correctly destructured
- Ensure error message is returned, not thrown

**Problem**: Role badge not showing
- Verify `<RoleBadge />` is added to page header
- Check organization context is properly loaded
- Verify user has a role in the current organization

**Problem**: Settings tabs visible for VIEWER
- Check `canManage` is used to gate tabs, not `isAdmin`
- Verify Settings page is using permissions from hook
- Check organization context has correct role

## Future Enhancements

Potential improvements:

1. **Granular Permissions**: Field-level permissions (edit some fields, not others)
2. **Resource-Specific Roles**: Different roles for different modules
3. **Time-Based Permissions**: Temporary elevated access
4. **Permission Inheritance**: Team-level vs organization-level roles
5. **Audit Trail**: Detailed logging of all permission checks
6. **Permission Analytics**: Track permission denial patterns
