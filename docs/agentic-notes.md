# Agentic UI — Practical Build Notes (Companion to PRD & Build Brief)

This document captures the _practical_ bits you’ll use while wiring the right-hand agent panel, the protocol for agent↔UI events, and the build hygiene that stops flaky behaviour.

## 1) What “good” agent UX looks like
- **Deterministic actions**: every agent action shows a clear preview (“what will change”) and requires explicit confirm for destructive/bulk ops.
- **Bidirectional context**: the agent always receives current scope (tenant, route, selected IDs, active filters) and updates the UI after writes.
- **Streamed progress**: surface state transitions — _planning → validating → writing → verifying → done_ — with partial output visible.
- **Recoverable errors**: show the error, keep state intact, and offer a quick retry. Log details to the audit trail.
- **A11y & focus**: the sidebar is fully keyboard-operable; focus returns to the invoking element after confirmations.

## 2) Minimal event surface to ship first
Start tiny and reliable:
- `FILTER_VIEW` — adjust left-pane filters within the current scope.
- `OPEN_ENTITY` — focus a specific entity (project, milestone, task).
- `CREATE_TASK` — create task with optional assignees/due date.
- `CREATE_MILESTONE` — create milestone with optional dependencies.

You can add `UPDATE_*` and `DELETE_*` later. Gate destructive ops behind confirmation.

## 3) Shared UI state the agent must receive
Always pass:
- `tenantId`, `userId` (for RLS context on the server)
- Current **scope** (e.g., vertical/programme/project IDs)
- Current **filters** (status, owner, due, risk)
- Current **selection** (entity IDs from tables/boards/timelines)

Without this, the agent will act on the wrong data.

## 4) Guardrails (non-negotiable)
- **RLS everywhere**; server validates tenant/role before writes.
- **Feature flags** enforced server-side; the agent can’t call tools for disabled modules.
- **Audit trail** for every agent write (before/after snapshots, redacted).
- **Confirm** on destructive/bulk operations.
- **No placeholders**: every wired intent runs end-to-end in dev, with tests.

## 5) Sidebar UX requirements
- Resizable panel; persisted width per user.
- Slash commands (`/create`, `/risk`, `/summary`) and keyboard toggle.
- “Preview changes” step with diff-style summary before applying.
- Clear “working…” states with streamed updates.

## 6) Implementation order (strict)
1. Add the **AG-UI intent module** (see `src/lib/agui/intents.ts`).
2. Wire **UI → event bus** from the right sidebar and key hotspots (toolbar, keyboard).
3. Implement **server tools** (FastAPI + Pydantic) for `CreateTask`, `CreateMilestone`, `FilterView`.
4. Connect **Copilot runtime endpoint** to call those tools.
5. Stream progress and **dispatch UI updates** via the event bus.
6. Add tests (unit for payloads/type guards, integration for RLS-safe CRUD).

## 7) Testing checklist
- [ ] Cross-tenant access fails (403) under tests.
- [ ] Each intent validates payloads with type guards.
- [ ] A full create-task flow works from the sidebar and opens the new task.
- [ ] Destructive/bulk ops require confirmation.
- [ ] A11y: tab order, focus rings, ARIA roles/labels.

## 8) Error handling patterns
- **Client validation error** → show inline error; do not call server.
- **Server validation error** → show readable message; keep user input.
- **RLS/permission error** → show “You don’t have access” and log audit “denied”.
- **Network/timeout** → offer retry; don’t repeat writes blindly.

## 9) Performance tips
- Subscribe only to the **current view** in Realtime.
- Debounce `FILTER_VIEW` emissions.
- Batch UI updates when a tool emits multiple state transitions quickly.

## 10) Security notes
- All writes go through server functions that assert tenant/role.
- Signed URLs for files; short expiry.
- Never include secrets in agent prompts or event payloads.
