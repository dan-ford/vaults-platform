# Permissions Implementation Plan

**Date**: January 11, 2025
**Status**: Planning Phase
**Priority**: High - Critical UX Issue

## Problem Statement

Currently, users with read-only permissions (VIEWER role) can:
- See action buttons (Add, Edit, Delete) in the UI
- Attempt to create/edit/delete data
- Get cryptic 403 errors with no user-friendly explanation
- Ask the AI agent to perform actions they don't have permission for

This creates a poor user experience and confusion.

## Current Role System

Based on `org_role` enum in database:
- **OWNER**: Full control (create, read, update, delete + admin)
- **ADMIN**: Full control (create, read, update, delete + admin)
- **EDITOR**: Can create, read, update (no delete, no admin)
- **VIEWER**: Read-only access

## Permission Matrix by Module

| Module | OWNER | ADMIN | EDITOR | VIEWER |
|--------|-------|-------|--------|--------|
| **Tasks** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Milestones** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Risks** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Decisions** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Documents** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Contacts** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Secrets** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Reports** | CRUD + Admin | CRUD + Admin | CRU | R |
| **Settings** | Full Access | Full Access | None | None |
| **Members** | Full Access | Full Access | None | None |

**Legend**: C=Create, R=Read, U=Update, D=Delete

## Audit Results

### Pages with Action Buttons (Need Permission Guards)
1. `/tasks` - Add, Edit, Delete buttons
2. `/contacts` - Add, Edit, Delete buttons
3. `/milestones` - Add, Edit, Delete buttons
4. `/risks` - Add, Edit, Delete buttons
5. `/decisions` - Add, Edit, Delete buttons
6. `/documents` - Add, Edit, Delete buttons
7. `/secrets` - Add, Edit, Delete, Seal buttons
8. `/reports` - Generate, Delete buttons
9. `/settings` - All edit fields and buttons
10. `/vaults/[vaultId]/profile` - All edit fields
11. `/dashboard` - Some widgets have inline edit

### Pages Without Actions (Read-Only by Nature)
- `/dashboard` - Dashboard view (mostly read-only)
- `/search` - Search interface (read-only)
- `/notifications` - Read notifications (read-only)
- `/profile` - User's own profile (always editable)

### Components Needing Permission Checks
- All CopilotKit agent actions (24 actions total)
- Navigation menus (hide Settings/Members for non-admins)
- Inline edit buttons in data tables
- Bulk action toolbars
- Context menus

## Implementation Plan

### Phase 1: Create Permission Utilities (Day 1, 2-3 hours)

#### 1.1 Create Permission Hook
**File**: `lib/hooks/use-permissions.ts`

```typescript
import { useOrganization } from "@/lib/context/organization-context";
import type { Database } from "@/lib/supabase/database.types";

type OrgRole = Database["public"]["Enums"]["org_role"];

export function usePermissions() {
  const { currentOrg } = useOrganization();

  const role: OrgRole | null = currentOrg?.role || null;

  // Permission check functions
  const can = {
    // Admin-only actions
    manageSettings: () => role === "OWNER" || role === "ADMIN",
    manageMembers: () => role === "OWNER" || role === "ADMIN",
    deleteAny: () => role === "OWNER" || role === "ADMIN",

    // Edit actions (OWNER, ADMIN, EDITOR)
    create: () => role === "OWNER" || role === "ADMIN" || role === "EDITOR",
    edit: () => role === "OWNER" || role === "ADMIN" || role === "EDITOR",
    update: () => role === "OWNER" || role === "ADMIN" || role === "EDITOR",

    // Read actions (all roles)
    view: () => role !== null,
    read: () => role !== null,
  };

  // Helper to check specific permission
  const hasPermission = (action: "create" | "edit" | "delete" | "admin" | "view"): boolean => {
    switch (action) {
      case "create":
      case "edit":
        return can.edit();
      case "delete":
        return can.deleteAny();
      case "admin":
        return can.manageSettings();
      case "view":
        return can.view();
      default:
        return false;
    }
  };

  return {
    role,
    can,
    hasPermission,
    isOwner: role === "OWNER",
    isAdmin: role === "ADMIN",
    isEditor: role === "EDITOR",
    isViewer: role === "VIEWER",
    canEdit: can.edit(),
    canDelete: can.deleteAny(),
    canManage: can.manageSettings(),
  };
}
```

#### 1.2 Create Permission Guard Component
**File**: `components/permissions/permission-guard.tsx`

```typescript
"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

interface PermissionGuardProps {
  children: ReactNode;
  require: "create" | "edit" | "delete" | "admin" | "view";
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({
  children,
  require,
  fallback,
  showMessage = false
}: PermissionGuardProps) {
  const { hasPermission, role } = usePermissions();

  if (!hasPermission(require)) {
    if (showMessage) {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to {require} in this vault.
            Your current role is: {role || "None"}
          </AlertDescription>
        </Alert>
      );
    }
    return fallback || null;
  }

  return <>{children}</>;
}
```

#### 1.3 Create Permission Badge Component
**File**: `components/permissions/role-badge.tsx`

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Shield, ShieldCheck, Edit, Eye } from "lucide-react";

const ROLE_CONFIG = {
  OWNER: {
    label: "Owner",
    icon: ShieldCheck,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full control",
  },
  ADMIN: {
    label: "Admin",
    icon: Shield,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Full control",
  },
  EDITOR: {
    label: "Editor",
    icon: Edit,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Can create and edit",
  },
  VIEWER: {
    label: "Viewer",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "Read-only access",
  },
};

export function RoleBadge({ showDescription = false }: { showDescription?: boolean }) {
  const { role } = usePermissions();

  if (!role) return null;

  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{config.description}</span>
      )}
    </div>
  );
}
```

---

### Phase 2: Update All Dashboard Pages (Day 1-2, 4-6 hours)

For each page with actions, wrap action buttons with `PermissionGuard`:

#### Example: `app/(dashboard)/contacts/page.tsx`

**Before**:
```typescript
<Button onClick={() => setIsCreating(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Add Contact
</Button>
```

**After**:
```typescript
import { PermissionGuard } from "@/components/permissions/permission-guard";
import { usePermissions } from "@/lib/hooks/use-permissions";

// In component:
const { canEdit, role } = usePermissions();

// Wrap button:
<PermissionGuard require="create">
  <Button onClick={() => setIsCreating(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Add Contact
  </Button>
</PermissionGuard>

// Show message if no permission and trying to create
{!canEdit && (
  <Alert>
    <ShieldAlert className="h-4 w-4" />
    <AlertDescription>
      You have read-only access to this vault. Contact an Admin or Owner to request edit permissions.
    </AlertDescription>
  </Alert>
)}
```

#### Pages to Update (Priority Order):
1. **High Priority** (user-facing CRUD):
   - `/contacts` - Add, Edit, Delete
   - `/tasks` - Add, Edit, Delete
   - `/documents` - Add, Delete
   - `/milestones` - Add, Edit, Delete
   - `/risks` - Add, Edit, Delete
   - `/decisions` - Add, Edit, Delete

2. **Medium Priority** (less frequent):
   - `/secrets` - Add, Edit, Delete, Seal
   - `/reports` - Generate, Delete
   - `/vaults/[vaultId]/profile` - Edit fields

3. **Admin-only** (already restricted by navigation):
   - `/settings` - All fields
   - `/admin` - Entire page

---

### Phase 3: Update Agent Actions (Day 2, 2-3 hours)

#### 3.1 Add Permission Checks to All 24 Agent Actions

For each `useCopilotAction`, add permission check:

**Example**: `createContact` action

**Before**:
```typescript
useCopilotAction({
  name: "createContact",
  description: "Create a new contact",
  parameters: [/* ... */],
  handler: async ({ firstName, lastName, email, /* ... */ }) => {
    // Create contact
  },
});
```

**After**:
```typescript
const { hasPermission, role } = usePermissions();

useCopilotAction({
  name: "createContact",
  description: "Create a new contact (requires EDITOR role or higher)",
  parameters: [/* ... */],
  handler: async ({ firstName, lastName, email, /* ... */ }) => {
    // Check permission first
    if (!hasPermission("create")) {
      return {
        success: false,
        error: `Permission denied: You need EDITOR, ADMIN, or OWNER role to create contacts. Your current role is: ${role || "None"}`,
      };
    }

    // Proceed with creation
    // ...
  },
});
```

#### 3.2 Update Agent Action Descriptions

Add role requirements to each action description so the agent knows:
- "Create/Edit/Delete actions require EDITOR, ADMIN, or OWNER role"
- "Management actions require ADMIN or OWNER role"
- "All users can view/read data"

---

### Phase 4: Update Navigation & UI Elements (Day 2, 1-2 hours)

#### 4.1 Hide Settings/Admin Links for Non-Admins

**File**: `components/navigation/user-menu.tsx` or sidebar

```typescript
const { canManage } = usePermissions();

{canManage && (
  <Link href="/settings">
    <Settings className="h-4 w-4 mr-2" />
    Settings
  </Link>
)}
```

#### 4.2 Add Role Badge to Navigation

Show user's current role in:
- User menu dropdown
- Vault switcher
- Settings page header

---

### Phase 5: Add Permission Feedback UI (Day 2, 1-2 hours)

#### 5.1 Read-Only Banner (Top of Page)

For VIEWER users, show a dismissible banner:

```typescript
{isViewer && (
  <Alert className="mb-4">
    <Eye className="h-4 w-4" />
    <AlertDescription>
      You have read-only access to this vault.
      <Button variant="link" size="sm" className="ml-2">
        Request Edit Access
      </Button>
    </AlertDescription>
  </Alert>
)}
```

#### 5.2 Disabled State for Forms

For VIEWER/EDITOR (on delete actions), disable buttons instead of hiding:

```typescript
<Button
  onClick={() => setDeletingContact(contact)}
  disabled={!canDelete}
  title={!canDelete ? "Only Admins and Owners can delete contacts" : ""}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

---

### Phase 6: Error Handling Improvements (Day 3, 2-3 hours)

#### 6.1 Wrap Supabase Calls with Permission Feedback

```typescript
const handleCreate = async () => {
  if (!canEdit) {
    toast.error("Permission denied: You need EDITOR role or higher to create contacts");
    return;
  }

  try {
    const { error } = await supabase.from("contacts").insert(/* ... */);

    if (error) {
      // Check if it's a 403/permission error
      if (error.code === "42501" || error.message.includes("permission")) {
        toast.error("Permission denied: Your role doesn't allow this action");
      } else {
        toast.error(`Error: ${error.message}`);
      }
    }
  } catch (err) {
    // Handle network errors
  }
};
```

#### 6.2 Add Toast Notifications for Permission Denials

Install and configure toast library:
```bash
npm install sonner
```

---

### Phase 7: Testing (Day 3, 2-3 hours)

#### Test Matrix

| Role | Test Case | Expected Behavior |
|------|-----------|-------------------|
| VIEWER | Visit `/contacts` | See contacts list, no Add button, Edit/Delete buttons hidden |
| VIEWER | Ask agent to create contact | Get permission denied message |
| VIEWER | Visit `/settings` | Redirected or 404 |
| EDITOR | Visit `/contacts` | See Add/Edit buttons, Delete hidden |
| EDITOR | Delete contact | Button disabled with tooltip |
| EDITOR | Visit `/settings` | Redirected or 404 |
| ADMIN | All pages | Full access to all features |
| OWNER | All pages | Full access to all features |

#### Test Checklist
- [ ] Test each page with all 4 roles
- [ ] Test each agent action with all 4 roles
- [ ] Test navigation menu visibility
- [ ] Test form submission with wrong role
- [ ] Test RLS policies in Supabase directly
- [ ] Test role badge displays correctly
- [ ] Test permission denied messages are clear

---

### Phase 8: Documentation (Day 3, 1 hour)

#### 8.1 Update README

Add section:
```markdown
## Permissions

VAULTS uses role-based access control (RBAC) with 4 roles:

- **OWNER**: Full control including billing and settings
- **ADMIN**: Full control of vault content and members
- **EDITOR**: Can create and edit content
- **VIEWER**: Read-only access

See [PERMISSIONS.md](PERMISSIONS.md) for details.
```

#### 8.2 Create PERMISSIONS.md

Document:
- Role hierarchy
- Permission matrix by feature
- How to check permissions in code
- How to test with different roles
- Troubleshooting permission errors

#### 8.3 Update CONTRIBUTING.md

Add requirement:
```markdown
## Permissions

When adding new features:
1. Determine which roles should have access
2. Use `usePermissions()` hook to check permissions
3. Wrap action buttons with `<PermissionGuard>`
4. Add permission check in agent actions
5. Test with all 4 roles
```

---

## Timeline

| Phase | Duration | Can Start After |
|-------|----------|-----------------|
| Phase 1: Utilities | 2-3 hours | Immediately |
| Phase 2: Dashboard Pages | 4-6 hours | Phase 1 |
| Phase 3: Agent Actions | 2-3 hours | Phase 1 |
| Phase 4: Navigation | 1-2 hours | Phase 1 |
| Phase 5: Feedback UI | 1-2 hours | Phase 2 |
| Phase 6: Error Handling | 2-3 hours | Phase 2, 3 |
| Phase 7: Testing | 2-3 hours | Phase 2, 3, 4, 5, 6 |
| Phase 8: Documentation | 1 hour | Phase 7 |

**Total Estimated Time**: 15-23 hours (2-3 days)

---

## Success Criteria

- [ ] All action buttons respect role permissions
- [ ] VIEWER users see read-only UI with clear messaging
- [ ] EDITOR users can create/edit but not delete
- [ ] ADMIN/OWNER users have full access
- [ ] Agent actions return clear permission denied messages
- [ ] No 403 errors without user-friendly explanation
- [ ] Settings/Admin pages hidden from non-admins
- [ ] All tests pass for all roles
- [ ] Documentation is complete

---

## Risk Mitigation

1. **Breaking Changes**: Phase 1 creates new utilities without touching existing code
2. **Gradual Rollout**: Update one page at a time, test, then proceed
3. **Backward Compatibility**: Permission checks default to "allow" if no role (fail-open for now)
4. **Testing**: Test each role after completing each phase
5. **Rollback**: Each phase is independent and can be rolled back

---

## Notes

- RLS policies are already correct (fixed in previous session)
- Organization context already provides role information
- Most work is UI/UX layer, no database changes needed
- This is a pure enhancement, no breaking changes to data
