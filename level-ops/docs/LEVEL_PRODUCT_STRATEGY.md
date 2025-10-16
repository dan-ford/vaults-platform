Level — Product Strategy & Execution Brief (Repo Version)

File: docs/LEVEL_PRODUCT_STRATEGY.md
Owner: Founders (Dan + Product)
Audience: Engineering, Design, GTM, Claude Code
Last updated: 2025-10-05
Status: Source of truth for the initial product scope

0) Purpose of this document

Align everyone (humans + Claude Code) on the goal, scope, constraints, and success criteria for Level. This is not a backlog; it’s the contract for what “good” looks like and how we’ll get there without breaking existing work.

Instruction for Claude Code: You must adapt changes to the current repo and stack safely. Prefer adapters, feature flags, and reversible migrations. Do not break existing flows.

1) Product in one sentence (Premium Position)

Level is the private-jet of executive portfolio operations: a premium, white-label executive layer with an acting agent that drafts board-ready updates in minutes, gives investors a live, defensible portfolio view, and keeps everything audited and isolated.

2) Who it’s for (tight ICPs)

Founders / C-suite running one or more companies; complex boards.

Investors (angels, family offices, PE/VC portfolio ops) who need consistent, comparable status across holdings.

Anti-ICP: single team tasking, engineering squads glued to Jira, “just Kanban.”

3) Problems we’re solving (JTBD + targets)

Founder JTBD: “Ship a weekly or monthly executive update in <10 minutes — accurate, branded, defensible.”

Investor JTBD: “See the true state of the portfolio — trends, risks, deltas — without chasing.”

Board JTBD: “Approve confidently — every material change is cited and auditable.”

Pilot exit targets

3 on-time weekly execs

1 approved board pack (PDF)

≥ 80% risks with owner + due date

Sponsor NPS ≥ 8/10

4) Non-goals (explicitly out)

No generic task app or dev workflow replacement.

No noisy subtask/backlog UIs.

No “AI chatbox” that doesn’t act with audit.

No deep custom theming beyond defined brand tokens (heavy custom = Professional Services).

5) Product scope (MVP→v1)
5.1 Core surfaces

Portfolio Console (Investor/Owner): cards per company with On-track/At-risk, deltas, last-update age, flagged risks, batch board-packs (v1 manual select).

Company Executive Workspace (Founder/C-suite): plan (milestones/KPIs), risks, decisions, executive summaries. No task noise.

Requests & Responses: investor raises structured request → founder clicks Fulfil with Agent → preview → approve → immutable snapshot.

5.2 Premium outputs

Weekly Exec, Monthly Roll-up, Board Pack — branded emails/PDFs that look executive-grade.

Immutable snapshots with hash + timestamp.

5.3 Acting agent (guard-railed)

CRUD limited to executive objects (milestones, risks, decisions).

Drafts summaries/packs from deltas (recent changes).

Preview → approve → write; every write audited.

5.4 Branding & white-label

Custom domain/subdomain, logo, brand color tokens.

Brand tokens applied to PDFs, emails, shared views.

6) Architecture & constraints (must-haves)

Supabase: Auth (OAuth), Postgres + RLS for tenant isolation, pgvector (RAG).

Multitenancy: Users have single Level profile, can join multiple orgs (tenants).

RLS everywhere: deny-by-default, policies exercised in CI.

Agent & RAG: pgvector hybrid retrieval (vector + BM25), MMR diversification, neighbor window; optional re-rank; audited writes.

Performance targets: retrieval p95 < 500ms; end-to-end draft render < 2.5s (no re-rank) / < 3.5s (with re-rank).

Dedicated Node option: isolated DB/hosting; region residency; SLA (99.9%).

Export/Delete: tenant data export + deletion within 30 days.

7) Data model (essentials)

auth.users (Supabase) → profiles (PII, user props)

organizations (branding, domain, settings)

org_memberships (role: OWNER, ADMIN, EDITOR, VIEWER)

Executive objects (org-scoped):

milestones (title, owner, due, status)

risks (title, owner, probability, impact, mitigation, status)

decisions (title, rationale, approver, date)

executive_summaries (period, content, citations)

document_chunks (RAG) with pgvector + tsvector (see RAG doc)

audit_log (who/what/when, snapshot id)

RLS pattern: SELECT = member; INSERT/UPDATE/DELETE = role threshold (EDITOR+/ADMIN+), with explicit tenant_id filters.

8) Security & compliance (premium bar)

RLS and security invoker functions only.

Immutable board-pack snapshots; verified hash.

DPA, sub-processor list, data-flow diagram, backup/DR (RPO/RTO), uptime SLA.

SSO (Google/Microsoft now; SAML/Okta add-on).

Region residency via Dedicated Node (EU/UK/US).

9) Agent & RAG (how it works)

Ingest: PDF → structured text → chunk (800–1,000 chars, overlap ~120), store page/section/sha256/lang, compute embedding (text-embedding-3-small), fill tsvector.

Retrieve: hybrid (vector + BM25) → MMR → neighbor window → (optional) re-rank → top 3–5 chunks.

Synthesize: prompt constrained to quote only retrieved spans; include citations (doc/page/chunk).

Write: user approves → persist; audit record with before/after.

10) UX principles (private-jet standard)

Executive calm: no clutter, intentional whitespace, perfect typography.

Speed signals: micro-latency and clear progress.

No surprises: agent actions are previewed and reversible (where safe).

Brand-perfect: everything sent outward looks like their firm.

11) Success metrics & SLAs

Activation

Time-to-first weekly summary < 7 days

≥ 80% risks with owner + due date by day 14

Engagement & Quality

Agent tool calls / active exec / week (rising trend)

RLS policy tests pass in CI

p95 draft render within target

Commercial

Pilot → paid conversion ≥ 40%

Two Dedicated Nodes in first 90 days

12) Pricing (for product context)

Founder Portfolio: £149 / user / mo (≤5 companies)

Company (Business): £499 / tenant / mo

Investor Studio: £999 / org / mo (≤25 companies)

Enterprise / Dedicated Node: £2,500 / node / mo + £2,000 setup

Add-ons: SSO, connectors, PS, extra companies.

13) Delivery plan (30–60–90)
Days 0–30 — Foundations (MVP)

Executive Workspace v1: milestones/risks/decisions, basic statuses.

Weekly Exec v1: agent draft → preview → approve → send email + PDF.

RAG v1: hybrid retriever + citations; ingestion worker.

Branding: logo/color tokens; custom subdomain.

Portfolio Console v1: cards with On-track/At-risk, last update age.

RLS CI tests (org resources + RAG reads).

Definition of Done (DoD)

First weekly exec approved & sent from a seeded tenant.

Board-pack sample renders with tenant branding.

RLS tests green; audit log records agent writes.

Days 31–60 — Proof & polish

Requests MVP (investor → founder fulfil with agent).

Board Pack v1 (PDF snapshot + hash).

Batch board-packs (manual select).

Basic SSO (Google/Microsoft).

Nudge system: “stale company” (>14 days), risk ageing.

Days 61–90 — Premium scale

Dedicated Node provisioning playbook + region choice.

Portfolio filters & trend deltas; ROI calculator surfaced.

Security & Trust pack v1; two case studies.

14) Risks & mitigations

Looks like task tool → remove task UIs; demo executive surfaces and outputs first.

Agent hallucination → quote-only synthesis + citations; max 3–5 chunks; audit writes.

RLS gaps → deny-by-default; CI policy tests; manual red-team.

Scope creep (branding/templates) → controlled knobs; deep custom via PS fee.

15) Acceptance criteria (MVP → v1)

Founder can create tenant, brand it, add 5 milestones & 3 risks, and generate a weekly exec that is:

branded;

cites sources;

delivered as email + PDF;

captured as immutable snapshot.

Investor can view Portfolio Console with at-risk flags and last-update ages for permitted companies.

Investor can send a Request; founder fulfils via Fulfil with Agent; approved response is audited.

RLS prevents cross-tenant reads/writes in all tested paths (incl. RAG).

Performance: p95 retrieval < 500ms; p95 draft render < 2.5s (no re-rank).

16) Claude Code — operating instructions

Paste this (or reference this file) when asking Claude Code to implement features.

You are a safe, backward-compatible upgrader for the current Level repo.

Discover the actual stack and schema; fit changes without breaking existing features.

Use feature flags for new behavior; add adapters/shims where needed.

Generate reversible, idempotent migrations with preflight checks.

Keep SQL functions SECURITY INVOKER; enforce RLS in all paths.

Write unit/integration/E2E tests (incl. RLS leakage attempts).

Prefer new RPCs/endpoints over modifying existing ones unless it’s proven safe.

If conflicts (naming, schema) exist, produce a compatibility report and a non-breaking plan.

Never ship an AI capability that can write without preview and audit.

Deliverables for each feature:

Migration files (supabase/migrations/NN_*).

Backend stubs/wrappers (FastAPI/Edge) + Pydantic DTOs.

Frontend components/hooks with feature flags.

Tests (unit + integration + E2E).

Docs updates in docs/ (this file stays the source of truth).

Rollout & rollback steps.

17) Open questions (track here)

Initial KPI set per vertical for board packs?

Region residency priorities (UK/EU/US) sequencing?

Finance snapshot inputs (manual fields) for v1?

18) Appendix — Copy & demo cues

Hero: Executive clarity for founders and investors.
Sub: A premium portfolio console with an acting agent—board-ready updates in minutes, not days.
Demo script (8 min): Portfolio tiles → add a risk → agent drafts weekly exec → approve → show branded PDF → investor request → fulfil with agent → immutable snapshot → quick security slide (RLS + audit).

End of document.
If a change substantially impacts this strategy (scope, roles, security), update this file first—everything else follows.