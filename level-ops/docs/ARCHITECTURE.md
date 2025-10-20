# Level — System Architecture

**Owner:** Engineering
**Last Updated:** 2025-10-05
**Status:** Living document

---

## 0) Purpose

High-level technical architecture for Level, the premium executive operations platform. This document describes the system components, data flow, and key design decisions that support our white-label, multi-tenant product.

---

## 1) System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                               │
│  Browser (Next.js PWA) → Custom Domain → Tenant Branding        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  • Next.js 15 (App Router)                                      │
│  • TypeScript + Tailwind CSS                                     │
│  • Radix UI primitives                                          │
│  • TanStack Query (data fetching)                               │
│  • CopilotKit UI (agent interface)                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                     API/RUNTIME LAYER                            │
│  • Next.js API Routes (TypeScript)                              │
│  • FastAPI (Python) — RAG & Agent Tools                         │
│  • CopilotKit Runtime — Agent orchestration                     │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                     DATA/SERVICES LAYER                          │
│  • Supabase Postgres (RLS-enforced multi-tenant DB)            │
│  • Supabase Auth (OAuth, JWT)                                   │
│  • Supabase Storage (tenant-scoped files)                       │
│  • Supabase Realtime (live updates via RLS-scoped channels)    │
│  • OpenAI API (embeddings + LLM)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2) Core Components

### 2.1 Frontend (Next.js PWA)

**Technology:**
- Next.js 15 with App Router (React Server Components + Client Components)
- TypeScript (strict mode)
- Tailwind CSS + Radix UI
- Workbox (PWA / offline support)

**Key Patterns:**
- Server Components for initial data fetching
- Client Components for interactivity + CopilotKit
- TanStack Query for client-side data sync
- Realtime subscriptions (tenant-scoped) for live updates

**Routing:**
- `/` — Landing/marketing
- `/auth/*` — Sign in/up flows
- `/dashboard/*` — Authenticated app (requires org membership)
- `/api/*` — Next.js API routes (embeddings, webhooks, proxies)

**Branding:**
- CSS custom properties from `organizations.brand_color`
- Logo from `organizations.logo_url`
- Custom domain resolved via middleware

---

### 2.2 API Layer

#### Next.js API Routes (TypeScript)

**Purpose:** Proxies, webhooks, light server logic

**Endpoints:**
- `/api/embeddings` — Generate query embeddings (OpenAI proxy)
- `/api/webhooks/document-uploaded` — Trigger RAG ingestion
- `/api/auth/*` — Supabase Auth helpers

**Security:**
- All routes validate JWT via Supabase client
- No service-key operations from client-accessible routes

#### FastAPI Backend (Python)

**Purpose:** Document processing, RAG retrieval, agent tools

**Endpoints:**
- `POST /ingest` — Chunk + embed document
- `GET /status/{document_id}/{tenant_id}` — Ingestion status
- `POST /delete-chunks` — Remove chunks (re-embed trigger)

**Services:**
- `DocumentProcessor` — PDF extraction, chunking, embedding
- `EmbeddingService` — OpenAI API wrapper with dedup cache
- `Retriever` — Hybrid search + MMR + neighbor windows + optional re-rank

**Technology:**
- FastAPI + Uvicorn
- Pydantic v2 (validation schemas)
- LangChain (text splitters, retrievers)
- PyMuPDF (PDF parsing)
- Supabase Python client

---

### 2.3 Database (Supabase Postgres + pgvector)

**Tables (Key Entities):**

| Table | Purpose | RLS Enforced |
|-------|---------|--------------|
| `profiles` | User metadata (linked to `auth.users`) | Self-read/update |
| `organizations` | Tenant branding + settings | Member-read, Admin-update |
| `org_memberships` | User↔Org many-to-many with role | Self-read, Admin-manage |
| `org_invitations` | Invite tokens | Admin-only |
| `milestones` | Executive-level goals | Org-scoped, Editor+ write |
| `risks` | Risk register | Org-scoped, Editor+ write |
| `decisions` | Decision log | Org-scoped, Editor+ write |
| `executive_summaries` | Generated summaries with citations | Org-scoped |
| `documents` | File metadata | Org-scoped, Editor+ write |
| `document_chunks` | RAG chunks + embeddings | Org-scoped, auto-ingested |
| `audit_log` | Agent actions + changes | Append-only, Admin-read |

**RLS Pattern:**
- Deny-by-default on all tables
- Policies check `org_memberships` for tenant membership
- Roles: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER` (enum)
- Functions use `SECURITY INVOKER` (RLS applies) unless explicitly needed otherwise

**Indexes:**
- `(tenant_id)` on all org-scoped tables
- `(tenant_id, document_id, chunk_index)` for neighbor fetches
- HNSW index on `document_chunks.embedding` (partial, non-null only)
- GIN index on `document_chunks.tsv` (full-text search)

---

### 2.4 Authentication & Authorization

**Flow:**

1. User signs in via Supabase Auth (OAuth: Google/Microsoft, or email)
2. JWT issued with claims: `{ user_id, email, ... }`
3. Middleware validates JWT on protected routes
4. Client fetches `org_memberships` → user selects org
5. All subsequent API calls include org context
6. RLS policies enforce tenant isolation at DB level

**Roles:**
- `OWNER` — Full control; can manage members, branding, billing
- `ADMIN` — Can manage members and settings; cannot delete org
- `EDITOR` — Can create/edit executive objects (milestones, risks, decisions)
- `VIEWER` — Read-only access

**Guards:**
- Cannot remove last `OWNER` (trigger enforced)
- Invites require `ADMIN+` role
- Agent write actions require `EDITOR+` role

---

### 2.5 Agent & RAG System

**CopilotKit Runtime:**
- Orchestrates LLM calls, tool invocations, UI state sync
- Registers actions via `useCopilotAction` hooks
- Streams responses to `CopilotChat` sidebar

**RAG Pipeline:**

```
Document Upload
    ↓
Supabase Storage (tenant-scoped path)
    ↓
Webhook → FastAPI /ingest
    ↓
PDF Extraction (PyMuPDF)
    ↓
Chunking (900 chars, 120 overlap)
    ↓
SHA256 Hash → Dedup Check
    ↓
OpenAI Embedding (text-embedding-3-small, 1536-d)
    ↓
Store in document_chunks (embedding + tsvector)
    ↓
Realtime event → UI updates status
```

**Retrieval:**

```
User Query → CopilotKit Action (search_documents)
    ↓
Generate Query Embedding (/api/embeddings)
    ↓
Hybrid Search (vector + BM25 fusion, 0.65/0.35)
    ↓
MMR Diversification (reduce redundancy)
    ↓
Neighbor Windowing (±1 chunks for context)
    ↓
Optional Re-rank (cross-encoder)
    ↓
Top 5 Chunks → Agent Synthesis
    ↓
Answer with inline citations (doc/page/chunk)
```

**Agent Tools (registered actions):**
- `search_documents` — RAG query
- `createMilestone`, `updateMilestoneStatus`, `deleteMilestone`
- `createRisk`, `updateRisk`, `deleteRisk`
- `createDecision`
- `listTasksByStatus`, `createTask`, `updateTaskStatus`, `deleteTask`

**Audit:**
- All agent writes log to `audit_log` with before/after snapshots
- Includes user_id, org_id, action, timestamp, changes (redacted PII)

---

## 3) Data Flow (Key User Journeys)

### 3.1 Founder Generates Weekly Exec Summary

```
1. Founder logs in → selects org
2. Navigates to Dashboard
3. Clicks "Generate Weekly Exec" (CopilotKit action)
4. Agent:
   a. Queries recent milestones/risks/decisions (via RLS-scoped SELECT)
   b. Searches uploaded documents for context (RAG)
   c. Synthesizes summary with citations
   d. Returns preview to UI
5. Founder approves
6. Agent:
   a. Writes executive_summary record (audit log created)
   b. Generates branded PDF (tenant logo + colors)
   c. Sends email via Edge Function
   d. Creates immutable snapshot with hash
7. Dashboard shows confirmation + download link
```

### 3.2 Investor Views Portfolio Console

```
1. Investor logs in → has memberships in 10 orgs
2. Navigates to Portfolio Console
3. UI:
   a. SELECT organizations WHERE org_id IN (user's memberships)
   b. For each org: fetch last executive_summary, at-risk milestones
   c. Display cards with status indicators (On-track/At-risk)
4. Investor clicks org card → drill into that org's workspace
5. Context switches to selected org → all queries scoped by that org_id
```

### 3.3 Investor Sends Request, Founder Fulfills

```
1. Investor (in Org A) creates a Request ("Need Q1 financials")
2. Request record inserted with requester_id, org_id, status=pending
3. Founder (Org A admin) receives notification (Realtime subscription)
4. Founder clicks "Fulfill with Agent"
5. Agent:
   a. Searches documents for "Q1 financials" (RAG)
   b. Drafts response with citations
   c. Shows preview
6. Founder approves
7. Agent:
   a. Updates Request status=fulfilled
   b. Attaches response + snapshot (immutable, hashed)
   c. Logs audit entry
8. Investor receives notification → views response
```

### 3.4 Finance Module - AI Document Analysis

```
1. User uploads financial document (XLS/XLSX/CSV) to Finance page
2. Document stored in Supabase Storage (org-scoped path)
3. Next.js API route `/api/finance/analyze-document` called
4. FastAPI backend endpoint `/analyze-financial-document` invoked
5. Backend pipeline:
   a. file_parser.py extracts sheet structure (pandas/openpyxl)
   b. openai_financial.py calls GPT-4-turbo with extraction prompt
   c. financial_analyzer.py orchestrates workflow
   d. Returns JSON with metrics + confidence scores
6. Analysis stored in financial_analyses table (RLS-enforced)
7. Frontend displays AnalysisReviewCard component:
   a. Shows extracted metrics with confidence indicators
   b. Highlights low-confidence fields (<0.5) in yellow
   c. Allows manual corrections before approval
8. User approves → creates financial_snapshot record
9. Agent can interact via natural language:
   a. createFinancialSnapshot
   b. updateFinancialSnapshot
   c. getLatestFinancialSnapshot
   d. deleteFinancialSnapshot (ADMIN/OWNER only)
10. All agent actions logged to audit_log with before/after snapshots
```

**Key Components:**
- **Backend Services:** 3 Python services (file_parser, openai_financial, financial_analyzer)
- **API Routes:** 2 Next.js routes (analyze-document, analysis-status/[id])
- **UI Components:** 4 React components (upload dialog, review card, analysis list, table)
- **Agent Actions:** 4 CopilotKit actions with permission checks
- **Model:** GPT-4-turbo with structured JSON output

---

## 4) White-Label & Multitenancy

**Branding:**
- Custom domain mapped via DNS CNAME → Vercel/hosting
- Middleware resolves domain → org lookup
- CSS tokens applied: `--brand-primary`, `--brand-logo-url`
- PDFs/emails use org branding

**Tenant Isolation:**
- Every org-scoped table has `org_id` (NOT `tenant_id` for clarity)
- RLS policies: `WHERE org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())`
- Realtime channels scoped: `org_id=eq.{orgId}`
- Storage paths: `orgs/{orgId}/...`

**Module Flags (future):**
- `organizations.modules` JSONB: `{ "risks": true, "decisions": false }`
- UI conditionally renders features
- Agent tools check flags before executing

---

## 5) Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load (dashboard) | < 1.5s | Lighthouse |
| RAG retrieval (DB) | p95 < 500ms | OpenTelemetry |
| End-to-end draft render | p95 < 2.5s (no re-rank) | Client timing |
| Realtime latency | < 200ms | Supabase metrics |
| Concurrent users/org | 50+ | Load test |

**Optimizations:**
- TanStack Query with stale-while-revalidate
- Partial HNSW index (only embedded chunks)
- Paginated lists (20 items default)
- Lazy-loaded routes
- CDN for static assets

---

## 6) Security & Compliance (Architecture View)

**Defense-in-Depth:**
1. **Edge:** Cloudflare/Vercel DDoS protection
2. **Middleware:** JWT validation, rate limiting
3. **API:** Input validation (Pydantic/Zod)
4. **Database:** RLS policies (deny-by-default)
5. **Audit:** Immutable logs, append-only

**Secrets:**
- `SUPABASE_SERVICE_KEY` — server-only (FastAPI, Edge Functions)
- `OPENAI_API_KEY` — server-only
- `NEXT_PUBLIC_*` — safe for client exposure
- All secrets in `.env.local` (gitignored)

**Immutability:**
- Board pack snapshots include SHA256 hash
- `executive_summaries` have `snapshot_id` → versioned
- Audit log is append-only (no DELETE policy)

**Region Residency (Dedicated Node add-on):**
- Supabase project in customer-specified region (EU/UK/US)
- Storage buckets in same region
- OpenAI API calls via regional endpoints (when available)

---

## 7) Scalability & Future Considerations

**Current Limits (MVP):**
- 5,000 orgs on shared infrastructure
- 10,000 documents/org
- 100 concurrent users/org

**Scaling Path:**

| Scale Point | Solution |
|-------------|----------|
| 10k orgs | Table partitioning by `org_id` |
| 100k docs/org | Dedicated pgvector instance |
| 1k concurrent users/org | Read replicas + caching layer |
| Multi-region | Geo-distributed Supabase + edge caching |

**Observability:**
- OpenTelemetry traces (FastAPI → Supabase → OpenAI)
- LangSmith for agent debugging
- Supabase logs + metrics dashboard
- Alerts: RLS failures, embedding timeouts, >p95 latency

---

## 8) Technology Decisions (ADRs)

### Why Supabase?
- **Pro:** RLS, Auth, Realtime, Storage in one platform; Postgres for flexibility
- **Con:** Vendor lock-in
- **Decision:** Accept lock-in; mitigate with abstraction layers for critical paths

### Why pgvector vs. Pinecone/Weaviate?
- **Pro:** Co-located with relational data; RLS applies; simpler ops; lower cost
- **Con:** Scaling limits at >1M vectors/tenant
- **Decision:** Use pgvector for MVP; plan migration path for Dedicated Nodes >100k docs

### Why CopilotKit vs. LangChain-only?
- **Pro:** Built-in UI components; streaming; React hooks; lower boilerplate
- **Con:** Less control over agent loop
- **Decision:** Use CopilotKit for UI-facing agents; LangChain for backend tools

### Why FastAPI vs. Next.js API Routes?
- **Pro:** Python ML ecosystem (embeddings, PDF parsing); async by default; Pydantic validation
- **Con:** Extra service to deploy
- **Decision:** Use FastAPI for RAG/agent; Next.js routes for proxies/webhooks

---

## 9) Open Architecture Questions

1. **SAML SSO:** Integrate via Supabase Enterprise or custom IdP connector?
2. **Multi-LLM support:** Abstract LLM calls to support Claude/Gemini alongside OpenAI?
3. **Workflow engine:** Build custom or integrate Temporal/Inngest for long-running agent tasks?
4. **Data export format:** JSON, CSV, or full Postgres dump for tenant export?

---

## 10) Acceptance Criteria (Architecture Validation)

- ✅ All org-scoped tables have RLS policies
- ✅ No cross-tenant data leakage in manual RLS tests
- ✅ Agent tools enforce role checks before writes
- ✅ Realtime channels scoped by `org_id`
- ✅ RAG retrieval respects tenant isolation
- ✅ Audit log captures all agent writes
- ⏳ Performance targets met in staging (pending load tests)
- ⏳ Dedicated Node provisioning documented (pending Phase E)

---

## 11) Related Docs

- **Strategy:** `docs/LEVEL_PRODUCT_STRATEGY.md`
- **Permissions:** `docs/PERMISSIONS_AND_ROLES.md`
- **RAG Implementation:** `docs/RAG_IMPLEMENTATION_PLAN.md`
- **Data Model:** `docs/DATA_MODEL.md` (to be created)
- **Security:** `SECURITY.md`
- **API Reference:** `docs/API_REFERENCE.md` (to be created)

---

**End of Document**

*This is a living document. Update as architecture evolves. Major changes require review by Engineering Lead + Founder.*
