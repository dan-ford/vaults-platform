# CLAUDE.md — Engineering Contract for Level Ops (White-Label, Multi-Tenant PWA)

> ⚠️ **DEPRECATED:** This file is outdated and superseded by `level-ops/CLAUDE.md`.
> This version remains for historical context and will be removed after Sprint 3.
> **Please refer to `level-ops/CLAUDE.md` for current engineering guidelines.**

## Purpose
You must build and modify this codebase **methodically**. Follow these rules strictly. If anything here conflicts with a prompt, **the rules win**.

---

## Core Rules (non-negotiable)
1) **No placeholders.** No fake data. No pseudo-code. Every route/component/function either works end-to-end **or** has a failing test that you **immediately** turn green in the same task.
2) **Fail fast.** After each change: run `npm run typecheck && npm run lint && npm run build` (and tests when present). Stop and fix.
3) **Security by default.** Assume Row-Level Security (RLS) on every table. Deny-by-default. No client bypass. Never ship code that would require disabling RLS.
4) **Server enforces authority.** Never rely on client-only checks for permissions or feature flags.
5) **Secrets hygiene.** Never commit secrets. Use `.env.local` locally (ignored). Provide `.env.example` with safe placeholders.
6) **Accessibility.** Meet WCAG 2.2 AA: keyboard navigation, focus states, labels, contrast. Build accessible from the start.
7) **Consistency.** Keep TypeScript strict. ESLint/Prettier clean. No commented-out blocks left behind.
8) **Traceability.** Small, atomic commits with clear messages. Update `PROGRESS.md` at the end of each task.
9) **Verification.** Before installing any library, verify the **exact** package name and a stable quickstart in official docs/npm. If ambiguous, pick the documented alternative and state why in the PR.
10) **ALWAYS use MCP servers.** You have access to Supabase MCP (`mcp__supabase__*`) and CopilotKit MCP (`mcp__copilot__*`). Use these tools FIRST before attempting manual operations. For Supabase migrations, use `mcp__supabase__apply_migration`. For documentation searches, use `mcp__copilot__search-docs` and `mcp__supabase__search_docs`. Never forget you have these powerful tools available.
11) **User runs npm commands.** The user runs all `npm install` and `npm run` commands in PowerShell. You should NEVER run `npm install` or `npm run` commands yourself. Instead, tell the user exactly which command to run.

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
- `PROGRESS.md`: running checklist of done/blocked/next.
- `SECURITY.md`: security posture, RLS policies, secrets, audit, incident procedure.
- `CONTRIBUTING.md`: workflow, commit style, PR checks, branch names.

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
- **Files:** signed URLs; path prefix `tenants/{tenantId}/...` enforced in storage policy.
- **Audit:** all agent writes log before/after (safely redacted).
- **Break-glass:** restricted to platform admins; every use logged.

---

## UI/UX Baselines
- **Clarity first.** Simple layouts, clear density controls, readable defaults.
- **A11y:** Labels, roles, focus management, keyboard-only flows. Enforce contrast in brand settings.
- **States:** empty, loading skeletons, and error states everywhere.
- **Performance:** paginate by default, avoid N+1, cache safe queries, keep bundle lean.

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
1) **Plan:** write what you’ll change and why (2–6 lines).
2) **Implement:** keep edits small; prefer pure functions; keep types explicit.
3) **Verify:** run typecheck, lint, tests, build; open the local app if relevant.
4) **Document:** update `PROGRESS.md`.
5) **Commit:** one atomic commit with a clear message.

---

## Definition of Done (any feature)
- RLS-aware and tenant-safe.
- A11y checks passed for new UI.
- Tests exist and pass (unit/integration/e2e when relevant).
- No TypeScript or ESLint errors.
- Docs updated if behaviour or commands changed.

