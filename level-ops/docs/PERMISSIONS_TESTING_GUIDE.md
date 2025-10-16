# Permissions Testing Guide

This guide provides a comprehensive checklist for testing the role-based access control (RBAC) system across all pages and features.

## Test Accounts Required

Create 4 test accounts with different roles in the same organization:

1. **Owner Account** (`owner@test.com`)
   - Full control over all features
   - Can manage organization settings
   - Can delete any record

2. **Admin Account** (`admin@test.com`)
   - Full control over all features
   - Can manage organization settings
   - Can delete any record

3. **Editor Account** (`editor@test.com`)
   - Can create and edit records
   - Cannot delete records
   - Cannot access organization settings (only profile)

4. **Viewer Account** (`viewer@test.com`)
   - Read-only access
   - Cannot create, edit, or delete
   - Cannot access organization settings (only profile)

## Testing Checklist

### For Each Role, Test Each Page

Test the following pages with each role account:

#### 1. Contacts Page (`/contacts`)

**VIEWER Tests:**
- [ ] Page loads without errors
- [ ] Can see all contacts
- [ ] Role badge shows "Viewer"
- [ ] Add Contact button is HIDDEN
- [ ] Edit buttons on contacts are HIDDEN
- [ ] Delete buttons on contacts are HIDDEN
- [ ] Agent actions (create/update/delete) return permission denied messages

**EDITOR Tests:**
- [ ] Page loads without errors
- [ ] Can see all contacts
- [ ] Role badge shows "Editor"
- [ ] Add Contact button is VISIBLE and works
- [ ] Edit buttons are VISIBLE and work
- [ ] Delete buttons are HIDDEN
- [ ] Can create new contact via UI
- [ ] Can update contact via UI
- [ ] Agent create/update actions work
- [ ] Agent delete action returns permission denied

**ADMIN Tests:**
- [ ] Page loads without errors
- [ ] Can see all contacts
- [ ] Role badge shows "Admin"
- [ ] All buttons (add, edit, delete) are VISIBLE
- [ ] Can create new contact
- [ ] Can update existing contact
- [ ] Can delete contact
- [ ] All agent actions work

**OWNER Tests:**
- [ ] Same as ADMIN tests
- [ ] Role badge shows "Owner"

#### 2. Tasks Page (`/tasks`)

**VIEWER Tests:**
- [ ] Page loads without errors
- [ ] Can see all tasks
- [ ] Role badge shows "Viewer"
- [ ] Add Task button is HIDDEN
- [ ] Edit buttons are HIDDEN
- [ ] Delete buttons are HIDDEN
- [ ] Agent actions return permission denied

**EDITOR Tests:**
- [ ] Add Task button is VISIBLE
- [ ] Can create new task
- [ ] Can update task status
- [ ] Delete buttons are HIDDEN
- [ ] Agent delete returns permission denied

**ADMIN/OWNER Tests:**
- [ ] All buttons visible and functional
- [ ] Can create, update, and delete tasks
- [ ] All agent actions work

#### 3. Milestones Page (`/milestones`)

**VIEWER Tests:**
- [ ] Can view all milestones
- [ ] No action buttons visible
- [ ] Agent actions blocked

**EDITOR Tests:**
- [ ] Can create new milestone
- [ ] Can update milestone status
- [ ] Cannot delete milestone

**ADMIN/OWNER Tests:**
- [ ] Full CRUD access
- [ ] All agent actions work

#### 4. Risks Page (`/risks`)

**VIEWER Tests:**
- [ ] Can view all risks
- [ ] No action buttons visible
- [ ] Agent actions blocked

**EDITOR Tests:**
- [ ] Can create and update risks
- [ ] Cannot delete risks

**ADMIN/OWNER Tests:**
- [ ] Full CRUD access
- [ ] All agent actions work

#### 5. Decisions Page (`/decisions`)

**VIEWER Tests:**
- [ ] Can view all decisions
- [ ] No action buttons visible
- [ ] Agent actions blocked

**EDITOR Tests:**
- [ ] Can create and update decisions
- [ ] Cannot delete decisions

**ADMIN/OWNER Tests:**
- [ ] Full CRUD access
- [ ] All agent actions work

#### 6. Documents Page (`/documents`)

**VIEWER Tests:**
- [ ] Can view all documents
- [ ] Upload button is HIDDEN
- [ ] Delete buttons are HIDDEN

**EDITOR Tests:**
- [ ] Upload button is VISIBLE
- [ ] Can upload documents
- [ ] Cannot delete documents

**ADMIN/OWNER Tests:**
- [ ] Can upload and delete documents

#### 7. Settings Page (`/settings`)

**ALL ROLES (VIEWER/EDITOR):**
- [ ] Settings menu item is VISIBLE in navigation
- [ ] Can access settings page
- [ ] Can see Profile tab
- [ ] Profile tab is accessible
- [ ] Organization, Team, Branding, Modules tabs are HIDDEN
- [ ] Cannot access organization settings

**ADMIN/OWNER Tests:**
- [ ] All tabs are VISIBLE
- [ ] Can access all tabs
- [ ] Can modify organization settings
- [ ] Can manage team members
- [ ] Can update branding
- [ ] Can toggle module flags

#### 8. Admin Page (`/admin`)

**VIEWER/EDITOR/ADMIN/OWNER (non-platform-admin):**
- [ ] Admin menu item is HIDDEN in navigation
- [ ] Cannot access `/admin` route (should redirect or show error)

**PLATFORM ADMIN Tests:**
- [ ] Admin menu item is VISIBLE
- [ ] Can access admin page
- [ ] Can see all platform admin features

#### 9. Notifications Page (`/notifications`)

**ALL ROLES:**
- [ ] Page loads without errors
- [ ] Role badge displays correctly
- [ ] Can view notifications

#### 10. Search Page (`/search`)

**ALL ROLES:**
- [ ] Page loads without errors
- [ ] Role badge displays correctly
- [ ] Can search all records
- [ ] Results respect permissions (no edit/delete buttons for lower roles)

## Agent Action Testing

For each role, test all agent actions via the CopilotKit chat interface:

### VIEWER Agent Tests:
Test each action and verify it returns permission denied:
- [ ] "Create a new contact named John Doe"
- [ ] "Update the status of the first task to in progress"
- [ ] "Delete the contact John Doe"
- [ ] All should return: "Permission denied: You need EDITOR, ADMIN, or OWNER role..."

### EDITOR Agent Tests:
- [ ] "Create a new contact" - should WORK
- [ ] "Update task status" - should WORK
- [ ] "Delete a contact" - should FAIL with "Permission denied: You need ADMIN or OWNER role..."
- [ ] "Create a milestone" - should WORK
- [ ] "Delete a milestone" - should FAIL

### ADMIN/OWNER Agent Tests:
- [ ] All create actions work
- [ ] All update actions work
- [ ] All delete actions work

## Error Handling Tests

### Test Error States:

1. **Network Error Simulation:**
   - [ ] Disconnect network
   - [ ] Try to load contacts page
   - [ ] Should show error state with retry button
   - [ ] Click retry after reconnecting
   - [ ] Should reload data successfully

2. **Permission Errors:**
   - [ ] As VIEWER, try to access settings organization tab
   - [ ] Should show appropriate error or redirect

3. **Loading States:**
   - [ ] Throttle network to 3G
   - [ ] Navigate to pages
   - [ ] Should show loading spinner
   - [ ] Should not show blank screens

## Cross-Page Consistency Tests

1. **Role Badge Visibility:**
   - [ ] Visit each page as each role
   - [ ] Verify role badge appears correctly on all pages
   - [ ] Badge shows correct role (Owner/Admin/Editor/Viewer)

2. **Navigation Consistency:**
   - [ ] Settings link appears for all roles
   - [ ] Admin link only appears for platform admins
   - [ ] No broken links or inaccessible pages

3. **UI Consistency:**
   - [ ] Permission-gated buttons consistently hidden/shown
   - [ ] No buttons that don't work when clicked
   - [ ] Error messages are clear and actionable

## Regression Tests

After any permission-related changes, re-run:

1. [ ] VIEWER cannot create/edit/delete on ANY page
2. [ ] EDITOR can create/edit but not delete on ANY page
3. [ ] ADMIN/OWNER have full access on ALL pages
4. [ ] Settings tabs are properly gated
5. [ ] Admin page is only accessible to platform admins
6. [ ] All agent actions respect permissions

## Known Edge Cases to Test

1. **Organization Switching:**
   - [ ] User with different roles in different orgs
   - [ ] Role badge updates when switching orgs
   - [ ] Permissions change appropriately

2. **Session Expiry:**
   - [ ] Long idle time
   - [ ] Should redirect to login
   - [ ] Should not show errors

3. **Concurrent Actions:**
   - [ ] Multiple tabs open
   - [ ] Changes in one tab reflect in other tabs (realtime)

4. **Role Changes:**
   - [ ] Admin changes user role
   - [ ] User's session updates without refresh (or requires refresh)
   - [ ] New permissions apply immediately

## Test Results Template

Document your test results:

```
Date: ___________
Tester: ___________
Build/Commit: ___________

VIEWER Role Tests: PASS / FAIL
  - Contacts: ___
  - Tasks: ___
  - Milestones: ___
  - Risks: ___
  - Decisions: ___
  - Documents: ___
  - Settings: ___
  - Navigation: ___

EDITOR Role Tests: PASS / FAIL
  - (Same list)

ADMIN Role Tests: PASS / FAIL
  - (Same list)

OWNER Role Tests: PASS / FAIL
  - (Same list)

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

## Automated Test Considerations

For future automated testing, consider:

1. **E2E Tests with Playwright:**
   - Test each role's access to pages
   - Verify button visibility
   - Test agent action responses

2. **Integration Tests:**
   - Test permission hooks
   - Test permission guards
   - Test error utilities

3. **Unit Tests:**
   - Test `usePermissions` hook with different roles
   - Test permission error message generation
   - Test error handling utilities
