# Claude Operating Instructions — Safe Implementation for Level

**Owner:** Engineering Leadership
**Last Updated:** 2025-10-06
**Status:** Mandatory guidelines for AI-assisted development

---

## 0) Purpose

This document provides **explicit instructions for Claude Code** (or any AI assistant) when implementing features for Level. It ensures backward compatibility, RLS safety, and production-grade quality.

**Rule:** Paste this document (or reference it) when asking Claude to implement features. These instructions **override** default AI behavior.

---

## 1) Core Principles (Non-Negotiable)

### 1.1 You Are a Safe, Backward-Compatible Upgrader
- **Discover the actual stack and schema** before making changes
- **Fit changes without breaking existing features**
- **Never assume** — always read current files, migrations, and docs first

### 1.2 Premium Product Standard
- This is a **"private jet"** product for founders/C-suite and investors
- No generic task management UX (we're executive-layer only)
- Every output must feel premium: clarity, speed, trust

### 1.3 Security-First
- **RLS everywhere** — deny-by-default on all tables
- **No client bypass** — server enforces all authority
- **Immutable audit** — every agent write logged with before/after

---

## 2) Implementation Workflow (Every Feature)

### Step 1: Discovery (ALWAYS DO THIS FIRST)
```bash
# Read current schema
supabase db dump --schema-only

# Read current migrations
ls -la supabase/migrations/

# Read relevant docs
cat docs/LEVEL_PRODUCT_STRATEGY.md
cat docs/PERMISSIONS_AND_ROLES.md
cat docs/DATA_MODEL.md

# Read existing code (relevant files only)
cat app/(dashboard)/tasks/page.tsx  # Example
```

**Acceptance:**
- [ ] You understand the **current** data model
- [ ] You understand the **current** RLS policies
- [ ] You understand the **current** frontend patterns

### Step 2: Plan (Non-Breaking)
**Write a 3-5 line plan that answers:**
1. What exists now?
2. What will change?
3. How will you ensure backward compatibility?
4. What feature flags or adapters are needed?

**Example:**
```
Current: Tasks table has status enum ('todo', 'in-progress', 'done').
Change: Add 'blocked' status for agent-detected blockers.
Compatibility: Expand enum (no DROP, only ADD). Existing rows default to 'todo'.
Feature flag: None needed (additive change, no behavior change).
```

**Acceptance:**
- [ ] Plan shows **no breaking changes**
- [ ] Plan includes rollback steps (if needed)

### Step 3: Implement with Guardrails

#### A) Migrations (Reversible & Idempotent)
```sql
-- ✅ GOOD: Reversible migration
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'blocked';

-- ❌ BAD: Irreversible migration
DROP TABLE tasks; -- NEVER drop tables with prod data
```

**Checklist:**
- [ ] Migration has preflight check (`IF NOT EXISTS`, `IF EXISTS`)
- [ ] Migration is idempotent (can run twice safely)
- [ ] Migration includes rollback script (as SQL comment)
- [ ] Migration uses **SECURITY INVOKER** for functions (RLS applies)

#### B) SQL Functions (RLS-Safe)
```sql
-- ✅ GOOD: SECURITY INVOKER (RLS applies)
CREATE OR REPLACE FUNCTION accept_org_invite(token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER  -- This is critical
AS $$ ... $$;

-- ❌ BAD: SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION accept_org_invite(token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- ❌ Bypasses RLS, use only if absolutely necessary
AS $$ ... $$;
```

**When to use SECURITY DEFINER:**
- Only for platform admin functions (e.g., creating orgs)
- Must be called from backend service role only
- Document why in code comments

#### C) Feature Flags (Additive Behavior)
```typescript
// ✅ GOOD: New feature behind flag
const ENABLE_AGENT_AUTO_ASSIGN = process.env.NEXT_PUBLIC_FEATURE_AUTO_ASSIGN === 'true';

if (ENABLE_AGENT_AUTO_ASSIGN) {
  // New behavior
} else {
  // Existing behavior (safe fallback)
}
```

**Acceptance:**
- [ ] New behavior is **opt-in** (flag defaults to `false`)
- [ ] Existing users see **no change** until flag enabled

#### D) Frontend Patterns (Follow Existing)
```typescript
// ✅ GOOD: Follows existing pattern from tasks page
const loadMilestones = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) console.error("Error:", error);
  else if (data) setMilestones(data);
};

// Load on mount AND on page visibility (auto-refresh pattern)
useEffect(() => {
  loadMilestones();

  const handleVisibilityChange = () => {
    if (!document.hidden) loadMilestones();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [supabase]);
```

**Acceptance:**
- [ ] Data loads on mount
- [ ] Data refreshes when page becomes visible (browser tab switch back)
- [ ] Realtime subscription active (tenant-scoped)

---

## 3) RLS Enforcement Checklist

### For Every New Table
```sql
-- 1. Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 2. SELECT policy (members only)
CREATE POLICY "select_members" ON new_table
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.org_id = new_table.org_id
      AND m.user_id = auth.uid()
  )
);

-- 3. INSERT policy (EDITOR+ only)
CREATE POLICY "insert_editors" ON new_table
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.org_id = new_table.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN', 'EDITOR')
  )
);

-- 4. UPDATE policy (EDITOR+ only)
CREATE POLICY "update_editors" ON new_table
FOR UPDATE TO authenticated
USING (/* same as INSERT */)
WITH CHECK (/* same as INSERT */);

-- 5. DELETE policy (ADMIN+ only)
CREATE POLICY "delete_admins" ON new_table
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.org_id = new_table.org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
  )
);
```

### For Every New Table (Realtime)
```sql
-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE new_table;
```

**Acceptance:**
- [ ] RLS enabled
- [ ] All CRUD policies defined (SELECT, INSERT, UPDATE, DELETE)
- [ ] Policies tested (attempt cross-tenant read → should fail)
- [ ] Realtime enabled

---

## 4) Agent Safety Checklist

### For Every Agent Action (useCopilotAction)
```typescript
// ✅ GOOD: Agent action with guardrails
useCopilotAction({
  name: "createMilestone",
  description: "Create a new executive-level milestone (not a task)",
  parameters: [
    { name: "title", type: "string", required: true },
    { name: "owner_user_id", type: "string", required: false },
    { name: "due_date", type: "string", required: false },
  ],
  handler: async ({ title, owner_user_id, due_date }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tenantId) return "Error: Not authenticated";

    // Audit: Log before action
    const before = { action: "createMilestone", title, org_id: tenantId };

    const { data, error } = await supabase
      .from("milestones")
      .insert({
        org_id: tenantId,  // Always include tenant_id
        title,
        owner_user_id,
        due_date
      })
      .select()
      .single();

    if (error) {
      // Audit: Log failure
      await logAuditEntry({ ...before, status: "failed", error: error.message });
      return `Failed: ${error.message}`;
    }

    // Audit: Log success with after state
    await logAuditEntry({ ...before, status: "success", after: data });

    return `Created milestone: ${data.title}`;
  },
});
```

**Acceptance:**
- [ ] Description is clear and **executive-focused** (not generic task language)
- [ ] Handler validates `user` and `tenantId` before DB ops
- [ ] Always includes `org_id` or `tenant_id` in INSERT/UPDATE
- [ ] Audit log entry created (before + after)
- [ ] Destructive actions (DELETE) require explicit confirmation (not yet implemented, note for future)

---

## 5) Testing Requirements (Before Shipping)

### A) RLS Leakage Tests (Manual)
```sql
-- Test 1: Cross-tenant read (should return 0 rows)
SET request.jwt.claims = '{"user_id": "user_A", "tenant_id": "tenant_A"}';
SELECT * FROM tasks WHERE org_id = 'tenant_B'; -- Should be empty

-- Test 2: Unauthorized write (should fail)
SET request.jwt.claims = '{"user_id": "user_A", "role": "VIEWER"}';
INSERT INTO tasks (org_id, title) VALUES ('tenant_A', 'Test'); -- Should error
```

**Acceptance:**
- [ ] Cross-tenant reads return 0 rows
- [ ] Unauthorized writes fail with RLS error

### B) Unit Tests (TypeScript)
```typescript
// Example: Test create milestone action
describe('createMilestone', () => {
  it('creates milestone with tenant_id', async () => {
    const result = await createMilestone({
      title: 'Launch MVP',
      tenant_id: 'test_tenant'
    });
    expect(result).toMatchObject({ title: 'Launch MVP', org_id: 'test_tenant' });
  });

  it('fails without tenant_id', async () => {
    await expect(createMilestone({ title: 'Test' })).rejects.toThrow('RLS policy violation');
  });
});
```

**Acceptance:**
- [ ] Happy path tested (with valid tenant_id)
- [ ] Error path tested (without tenant_id, or wrong role)

### C) Integration Tests (E2E)
```typescript
// Example: Full milestone CRUD flow
test('founder creates, updates, deletes milestone', async ({ page }) => {
  await page.goto('/milestones');
  await page.click('button:has-text("Add Milestone")');
  await page.fill('input[name="title"]', 'Launch MVP');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=Launch MVP')).toBeVisible();

  // Verify audit log (optional, backend test)
  const logs = await db.query('SELECT * FROM audit_log WHERE action = "createMilestone"');
  expect(logs).toHaveLength(1);
});
```

**Acceptance:**
- [ ] User flow works end-to-end (create → update → delete)
- [ ] Audit log captures all actions

---

## 6) Deliverables (Every Feature)

### A) Migration Files
```bash
supabase/migrations/20251006_add_milestone_blocked_status.sql
```
**Contents:**
- Preflight checks (`IF NOT EXISTS`)
- Idempotent logic (can run twice)
- Rollback script (as SQL comment at bottom)

### B) Backend Stubs/Wrappers
```bash
# FastAPI (if agent tool)
agent/tools/milestone_tools.py

# Next.js API route (if webhook/proxy)
app/api/webhooks/milestone-updated/route.ts
```

### C) Frontend Components/Hooks
```bash
app/(dashboard)/milestones/page.tsx  # Updated
components/MilestoneDialog.tsx       # New (if needed)
lib/hooks/useMilestones.ts           # New (if needed)
```

### D) Tests
```bash
__tests__/milestones.test.ts         # Unit tests
__tests__/e2e/milestones.spec.ts     # E2E tests (if applicable)
```

### E) Docs Updates
```bash
docs/DATA_MODEL.md                   # Update table schema
docs/PERMISSIONS_AND_ROLES.md        # Update if new role logic
PROGRESS.md                          # Mark feature as done
```

### F) Rollout & Rollback Steps
**In PR description or PROGRESS.md:**
```markdown
## Rollout Steps
1. Apply migration: `supabase db push`
2. Deploy backend: `vercel deploy --prod`
3. Enable feature flag: `NEXT_PUBLIC_FEATURE_BLOCKED_STATUS=true`
4. Monitor logs for 24h (check Sentry/Supabase logs)

## Rollback Steps
1. Disable feature flag: `NEXT_PUBLIC_FEATURE_BLOCKED_STATUS=false`
2. Revert migration (if needed): `supabase db reset --version <previous_version>`
3. Redeploy previous backend commit: `vercel rollback`
```

**Acceptance:**
- [ ] All deliverables present
- [ ] Rollout steps documented
- [ ] Rollback steps tested (in staging)

---

## 7) Anti-Patterns (NEVER DO THIS)

### ❌ Breaking Changes Without Migration Path
```sql
-- ❌ BAD: Drops column (data loss)
ALTER TABLE tasks DROP COLUMN assignee_id;

-- ✅ GOOD: Deprecate, then remove after migration period
ALTER TABLE tasks ADD COLUMN assignee_user_id UUID;
-- Copy data: UPDATE tasks SET assignee_user_id = assignee_id;
-- Mark old column as deprecated in docs
-- Remove old column in 30 days (after confirming no usage)
```

### ❌ Hardcoded Tenant IDs
```typescript
// ❌ BAD: Hardcoded tenant
const { data } = await supabase
  .from("tasks")
  .select("*")
  .eq("org_id", "123-456-789"); // NEVER hardcode

// ✅ GOOD: Use context
const { data } = await supabase
  .from("tasks")
  .select("*")
  .eq("org_id", tenantId); // From TenantProvider
```

### ❌ Client-Only Authorization
```typescript
// ❌ BAD: Client checks role (can be bypassed)
if (userRole === 'ADMIN') {
  await supabase.from("tasks").delete().eq("id", taskId);
}

// ✅ GOOD: RLS enforces on server
await supabase.from("tasks").delete().eq("id", taskId);
// RLS policy will block if user is not ADMIN
```

### ❌ No Audit Trail for Agent Writes
```typescript
// ❌ BAD: Agent writes without logging
await supabase.from("milestones").insert({ title: "New Milestone" });

// ✅ GOOD: Log before and after
const before = { action: "createMilestone", title: "New Milestone" };
const { data } = await supabase.from("milestones").insert({ ... });
await logAuditEntry({ ...before, after: data });
```

### ❌ Generic Task Management Language
```typescript
// ❌ BAD: Generic task tool description
useCopilotAction({
  name: "createTask",
  description: "Create a task", // Too generic
});

// ✅ GOOD: Executive-focused description
useCopilotAction({
  name: "createMilestone",
  description: "Create an executive-level milestone (quarterly OKR, board deliverable, strategic initiative)", // Premium, specific
});
```

---

## 8) Final Checklist (Before Merging)

- [ ] Discovery: Read current schema, docs, code
- [ ] Plan: 3-5 line non-breaking plan written
- [ ] Migration: Reversible, idempotent, includes rollback
- [ ] RLS: Enabled, policies tested, realtime added
- [ ] Agent: Actions audited, descriptions premium-focused
- [ ] Tests: Unit + integration + RLS leakage tests pass
- [ ] Docs: DATA_MODEL.md, PROGRESS.md updated
- [ ] Rollout: Steps documented, rollback tested
- [ ] Review: Code reviewed by human (not just AI)

**Acceptance:**
- [ ] All checkboxes above are checked
- [ ] `npm run typecheck && npm run lint && npm run build` passes
- [ ] Feature tested in staging (not just localhost)

---

## 9) Communication Style (Premium Product)

### ✅ GOOD: Premium, Executive-Focused
- "Generate board-ready update in <10 minutes"
- "Portfolio Console with at-risk flags"
- "Immutable board pack with SHA256 hash"
- "Agent-drafted weekly exec with citations"

### ❌ BAD: Generic Task Management
- "Create a task" → Use "Add executive milestone"
- "Assign to team member" → Use "Assign to owner"
- "Update status" → Use "Mark milestone as on-track/at-risk"
- "Add comment" → Use "Add decision rationale"

**Rule:** Every UI label, agent description, and doc phrase should reflect our premium ICP (founders/C-suite, investors).

---

## 10) Questions & Escalation

### If Unsure, Ask:
1. **Data model conflict:** Check `docs/DATA_MODEL.md` → If still unclear, flag in PR description
2. **RLS policy question:** Check `docs/PERMISSIONS_AND_ROLES.md` → If still unclear, write defensive policy (most restrictive) and flag
3. **Breaking change unavoidable:** Document migration path, get human approval before merging
4. **Premium positioning unclear:** Check `docs/LEVEL_PRODUCT_STRATEGY.md` → Align with "private jet" standard

### Escalation Path:
1. **Technical:** Comment in PR, tag `@engineering-lead`
2. **Product:** Check product strategy doc, tag `@product-owner`
3. **Security:** Tag `@security-team`, do NOT ship until cleared

---

## 11) Success Criteria (This Document)

**You (Claude or any AI) have followed these instructions if:**
- [ ] Every feature starts with **Discovery** (reading current schema/docs/code)
- [ ] Every migration is **reversible and idempotent**
- [ ] Every table has **RLS policies and realtime enabled**
- [ ] Every agent action has **audit logging**
- [ ] Every deliverable has **rollout and rollback steps**
- [ ] All language is **premium/executive-focused** (no generic task management)

**You have violated these instructions if:**
- [ ] You ship a breaking change without migration path
- [ ] You create a table without RLS
- [ ] You use SECURITY DEFINER without documenting why
- [ ] You hardcode tenant IDs
- [ ] You skip audit logging for agent writes
- [ ] You use generic task management language

---

**End of Document**

*Reference this doc in every Claude Code prompt for Level features. Update quarterly as patterns evolve.*
