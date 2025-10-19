# CLAUDE.md — Engineering Contract for VAULTS (White-Label, Multi-Tenant PWA)

## Purpose
You must build and modify this codebase **methodically**. Follow these rules strictly. If anything here conflicts with a prompt, **the rules win**.

---

## 🚨 CRITICAL: ALWAYS USE MCP SERVERS FIRST 🚨
ALWAYS USE SUPABASE MCP SERVER
**You have access to powerful MCP (Model Context Protocol) servers. USE THEM FIRST for:**

### Supabase MCP (`mcp__supabase__*`)
- **Database operations**: Use `mcp__supabase__execute_sql` for migrations and queries
- **Project info**: Use `mcp__supabase__list_projects`, `mcp__supabase__get_project`
- **Table operations**: List tables, check schemas
- **NEVER manually write SQL files** - always execute directly via MCP
- Project ID: `lkjzxsvytsmnvuorqfdl` (VAULTS Platform)

### CopilotKit MCP (`mcp__copilot__*`)
- **Documentation search**: Use `mcp__copilot__search-docs` for CopilotKit docs
- **Code search**: Use `mcp__copilot__search-code` for implementation examples

### GitHub MCP (`mcp__github__*`)
- **Repository operations**: Use `mcp__github__create_repository`, `mcp__github__push_files`
- **Content operations**: Use `mcp__github__get_file_contents` for reading files
- **Pull requests**: Use `mcp__github__create_pull_request`, `mcp__github__list_pull_requests`

### Vercel MCP (`mcp__vercel__*`)
- **Deployment**: Deploy Next.js app to Vercel production
- **Project management**: Manage Vercel projects and deployments
- **Environment variables**: Configure production environment variables
- **OAuth Authentication**: Configured, will prompt on first use

### Railway MCP (`mcp__railway__*`)
- **Service deployment**: Deploy Python FastAPI agent backend
- **Environment management**: Configure Railway environment variables
- **Project management**: Manage Railway projects and services
- **Token Authentication**: Configured and connected

### Other MCP Servers
- **Supabase Docs**: `mcp__supabase__search_docs` for Supabase documentation
- **Web Browser**: `mcp__playwright__*` for browser automation when needed

**REMEMBER**: Before writing any migration file, creating any database table, or searching documentation manually, CHECK IF THERE'S AN MCP TOOL FOR IT. The MCP servers are your FIRST choice, not your last resort.

---

## Core Rules (non-negotiable)
1) **No placeholders.** No fake data. No pseudo-code. Every route/component/function either works end-to-end **or** has a failing test that you **immediately** turn green in the same task.
2) **Fail fast.** After each change: run `npm run typecheck && npm run lint && npm run build` (and tests when present). Stop and fix.
3) **Security by default.** Assume Row-Level Security (RLS) on every table. Deny-by-default. No client bypass. Never ship code that would require disabling RLS.
4) **Server enforces authority.** Never rely on client-only checks for permissions or feature flags.
5) **Secrets hygiene.** Never commit secrets. Use `.env.local` locally (ignored). Provide `.env.example` with safe placeholders.
6) **Accessibility.** Meet WCAG 2.2 AA: keyboard navigation, focus states, labels, contrast. Build accessible from the start.
7) **Consistency.** Keep TypeScript strict. ESLint/Prettier clean. No commented-out blocks left behind.
8) **Traceability.** Small, atomic commits with clear messages. Update `docs/planning/PROGRESS.md` at the end of each task.
9) **Verification.** Before installing any library, verify the **exact** package name and a stable quickstart in official docs/npm. If ambiguous, pick the documented alternative and state why in the PR.
10) **NO EMOJIS EVER.** Never use emojis in any user-facing text, UI, code, comments, documentation, or commit messages. This is a professional enterprise platform.

---

## Project Scripts
- `npm run typecheck` — TypeScript checks
- `npm run lint` — ESLint
- `npm run format` — Prettier fix
- `npm run test` — Jest (unit/integration)
- `npm run build` — Next build (must pass before commit)
- `prepare` — installs Husky hooks

**Pre-commit hook:** `typecheck && lint && test` must pass.

---

## Repository Norms
- Keep `README.md` minimal and accurate (run, build, env).
- `docs/planning/PROGRESS.md`: running checklist of done/blocked/next.
- `SECURITY.md`: security posture, RLS policies, secrets, audit, incident procedure.
- `CONTRIBUTING.md`: workflow, commit style, PR checks, branch names.
- **`docs/DEPLOYMENT.md`**: **CRITICAL** - Complete production deployment guide (GitHub, Railway, Vercel). Step-by-step procedures, environment variables, security configurations, smoke testing, monitoring, and troubleshooting. **MUST be reviewed before any production deployment.** All new features with production implications MUST add notes to this document.

---

## Architecture (high-level)
- **Front-end:** Next.js (App Router) + TypeScript + Tailwind + Radix + TanStack Query + Workbox (PWA).
- **Backend:** Supabase (Auth, Postgres, Storage, Realtime) with **RLS**.
- **Agent:** CopilotKit (UI + runtime) + Python FastAPI with Pydantic v2 for tool contracts.
- **White-label:** host-based tenant resolution; tenant branding (CSS tokens) and module flags; custom domains.

---

## Security & Privacy Baselines
- **RLS on every table.** Policies are deny-by-default. Allow read/write by tenant membership and role. Add indexes on `tenant_id`, `user_id` for performance.
- **Realtime under RLS** only; subscribe to narrow scopes.
- **Realtime MUST be enabled:** Every new table MUST be added to `supabase_realtime` publication: `ALTER PUBLICATION supabase_realtime ADD TABLE table_name;`
- **Files:** signed URLs; path prefix `tenants/{tenantId}/...` enforced in storage policy.
- **Audit:** all agent writes log before/after (safely redacted).
- **Break-glass:** restricted to platform admins; every use logged.

---

## UI/UX Baselines
- **Clarity first.** Simple layouts, clear density controls, readable defaults.
- **A11y:** Labels, roles, focus management, keyboard-only flows. Enforce contrast in brand settings.
- **States:** empty, loading skeletons, and error states everywhere.
- **Performance:** paginate by default, avoid N+1, cache safe queries, keep bundle lean.
- **Auto-refresh:** All data-driven pages MUST automatically load data on mount AND when page becomes visible (navigation back). Use `visibilitychange` event listener. No manual refresh buttons needed.
- **Responsive dialogs:** All dialogs MUST fit on screen at all breakpoints (`max-h-[90vh]`), have scrollable content (`overflow-y-auto flex-1`), and use textareas (min 3 rows) for multi-line fields, not single-line inputs.

---

## Agent Guardrails
- Tool calls use **Pydantic** schemas. Validation errors must surface to the user clearly.
- Destructive or bulk operations require explicit user confirmation.
- The agent must honour **RLS** and **tenant feature flags**. No exceptions.
- Every agent action writes to `activity_log` with actor and before/after snapshots.

---

## Library Install Checklist
Before `npm i` or `pip install`:
1) Confirm package name in official docs/npm/PyPI.
2) Note minimal initialisation snippet that works.
3) Add to `README.md` if it affects how to run.

If a library is unclear (e.g., AG-UI variants), use the documented CopilotKit pattern for agent↔UI events rather than guessing package names.

---

## Work Cycle (every task)
1) **Plan:** write what you'll change and why (2–6 lines).
2) **Implement:** keep edits small; prefer pure functions; keep types explicit.
3) **Verify:** run typecheck, lint, tests, build; open the local app if relevant.
4) **Document:** update `docs/planning/PROGRESS.md`.
5) **Commit:** one atomic commit with a clear message.

---

## Data Loading Pattern (Required for All Pages)
All pages that display data from Supabase MUST follow this pattern:

```typescript
// 1. Extract load function
const loadData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("table_name")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) console.error("Error:", error);
  else if (data) setData(data);
};

// 2. Load on mount AND on page visibility
useEffect(() => {
  loadData();

  const handleVisibilityChange = () => {
    if (!document.hidden) loadData();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [supabase]);

// 3. Always include realtime subscription
useEffect(() => {
  if (!tenantId) return;

  const channel = supabase.channel('table-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name',
      filter: `tenant_id=eq.${tenantId}`
    }, (payload) => {
      // Handle INSERT, UPDATE, DELETE
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [supabase, tenantId]);
```

---

## Dialog Pattern (Required for All Forms)
All dialogs MUST be responsive and scrollable:

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-h-[90vh] flex flex-col">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>

    {/* Scrollable content area */}
    <div className="space-y-4 overflow-y-auto flex-1 px-1">
      {/* Use textarea for multi-line fields (min 3 rows) */}
      <div className="space-y-2">
        <Label htmlFor="field">Field Label</Label>
        <textarea
          id="field"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>
    </div>

    <DialogFooter className="mt-4">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Definition of Done (any feature)
- RLS-aware and tenant-safe.
- **Realtime enabled** on any new tables (via `ALTER PUBLICATION supabase_realtime ADD TABLE table_name;`).
- **Auto-refresh implemented** (load on mount + visibilitychange + realtime subscription).
- A11y checks passed for new UI.
- Tests exist and pass (unit/integration/e2e when relevant).
- No TypeScript or ESLint errors.
- Docs updated if behaviour or commands changed.

---

## PRODUCTION DEPLOYMENT STATUS

### ✅ COMPLETE: Executive Layer Deployed and Active (October 18-19, 2025)

**STRATEGIC CONTEXT:** VAULTS has successfully transformed from a general task-driven workspace into a focused **executive and investor communications platform**. See **REVISED_MODULE_PLAN.md** for the complete implementation details.

**PRODUCTION STATE (Updated October 19, 2025):**
- Code Status: ✅ COMPLETE - All Phase 1 & 2 modules deployed with critical bugfixes
- Feature Status: ✅ ACTIVE - All executive modules visible to all users by default
- Build Status: ✅ PASSING - TypeScript types regenerated, all errors resolved
- Database: ✅ READY - All 8 new tables created with RLS policies and realtime enabled
- Finance Page: ✅ FULLY FUNCTIONAL - All features working correctly
- Metrics Page: ✅ FULLY FUNCTIONAL - All features working correctly

**DEPLOYED FEATURES (Active for All Organizations):**
- New positioning: "The executive operating layer for investors and founders"
- 10 vault-specific modules: Vault Profile, Metrics, Finance, Reports (enhanced), Packs, Requests, Documents, Governance, Members, Secrets
- Documents module enhanced with sections and inline Q&A
- Decisions module enhanced with multi-signature approval workflow
- Immutable outputs with SHA-256 hashing (Reports, Packs)
- Portfolio layer for cross-vault analytics (Dashboard in top nav)

**DEPLOYMENT HISTORY:**
- Commit 8f364f1 (Oct 18): Phase 1 & 2 complete - all modules implemented
- Commit 1e1ae7e (Oct 18): TypeScript types regenerated - build fixed
- Commit 11dfa1d (Oct 18): Feature flag removed - deployed to all users
- Commit 8105516 (Oct 19): Fixed executiveLayerEnabled references - build restored
- Commit 95fdcb1 (Oct 19): Fixed PermissionGuard props - buttons now rendering
- Commit 4bd689b (Oct 19): Fixed SelectItem empty value - KPI form working

**USER EXPERIENCE:**
All users now see the executive-focused navigation immediately upon login. Finance and Metrics pages are fully functional with working add buttons and error-free forms.

**CRITICAL GAP IDENTIFIED (October 19, 2025 Audit):**
- Dashboard currently shows vault-specific metrics instead of portfolio-level cross-vault analytics
- This is Priority 0 blocker for multi-vault investor/executive use case
- 7/10 modules fully functional, 3/10 need verification
- See PROGRESS.md Phase I.2 for complete audit findings

#### Infrastructure
- ✅ **GitHub Repository**: https://github.com/dan-ford/vaults-platform
  - Clean repository structure (level-ops/ subdirectory only)
  - All security issues resolved (no exposed API keys)
  - Code pushed to main branch (commit 6130e57)
  - **Latest update**: Documentation consolidated (57→29 files, 49% reduction)
  - Professional doc structure with 3 comprehensive guides

- ✅ **Railway (RAG Agent Backend)**: https://vaults-agent-production.up.railway.app
  - Python FastAPI service deployed and healthy
  - Project name: `vaults-agent`
  - Environment variables configured (Supabase, OpenAI)
  - Document ingestion and vector search operational

- ✅ **Vercel (Next.js Frontend)**: Deployed and operational
  - Root directory set to `level-ops`
  - All environment variables configured
  - Production build successful
  - Frontend-backend integration working

#### Environment Variables (All Configured)
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_KEY
- ✅ NEXT_PUBLIC_COPILOT_CLOUD_API_KEY
- ✅ OPENAI_API_KEY
- ✅ FASTAPI_URL (points to Railway)
- ✅ NEXT_PUBLIC_APP_URL (Vercel production URL)

#### Deployment Issues Resolved
- ✅ Fixed: Vercel 404 errors (repository structure)
- ✅ Fixed: Railway import errors (Python agent)
- ✅ Fixed: GitHub push protection (API key security)
- ✅ Fixed: Build configuration (root directory)

### REMAINING TASKS
1. Enable HaveIBeenPwned in Supabase Dashboard (5 min manual task)
2. Complete end-to-end smoke testing
3. Configure custom domain (vaults.team)
4. User acceptance testing

### KEY DOCUMENTATION (CONSOLIDATED OCTOBER 2025)
- **docs/DEPLOYMENT.md** - Complete deployment guide (GitHub, Railway, Vercel, production config)
- **docs/PERMISSIONS_COMPLETE.md** - RBAC system (roles, testing, RLS, security)
- **docs/RAG_COMPLETE.md** - Document search (hybrid retrieval, CopilotKit integration)
- **docs/ENVIRONMENT_VARIABLES.md** - All environment variables explained
- **docs/ARCHITECTURE.md** - System architecture and data flow
- **docs/DATA_MODEL.md** - Complete database schema
- **SECURITY.md** - Security posture and incident response
- **KNOWN_ISSUES.md** - npm audit findings (8 moderate, acceptable)

### MCP SERVERS AVAILABLE
- `mcp__github__*` - Repository and code management
- `mcp__vercel__*` - Next.js deployment and configuration
- `mcp__railway__*` - Python agent backend deployment
- `mcp__supabase__*` - Database operations
- `mcp__copilot__*` - Documentation and code search
- Before you undertake any changes - alwways check that there is enough context remaining to complete the task. Provide a warning if there is not enough to complete.