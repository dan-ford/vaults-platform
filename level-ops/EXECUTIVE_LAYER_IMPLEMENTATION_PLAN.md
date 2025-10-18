# VAULTS Executive Layer Implementation Plan

**Document Owner:** Engineering Team
**Created:** 2025-10-18
**Status:** Strategic Roadmap
**Priority:** High Impact Transformation

---

## Executive Summary

### Transformation Overview

This plan transforms VAULTS from a general-purpose task-driven workspace into a focused **executive and investor communications platform**. The new positioning: "The executive operating layer for investors and founders—board-ready updates, defensible decisions, and portfolio visibility in minutes, not meetings."

### Current State Assessment

**Platform Health: 4.5/5** (Production-ready with strong foundation)

**Strengths:**
- ✅ Production deployment complete (GitHub, Railway, Vercel)
- ✅ Multi-tenant architecture with robust RBAC (OWNER/ADMIN/EDITOR/VIEWER)
- ✅ Comprehensive RAG system with hybrid search (pgvector + BM25)
- ✅ Row-Level Security enforced across all 27 tables
- ✅ Realtime subscriptions and auto-refresh patterns
- ✅ CopilotKit AI integration with 24 agent actions
- ✅ Secrets module with SHA256 hashing and evidence export
- ✅ White-label branding with WCAG 2.2 AA contrast validation
- ✅ Complete permissions system with UI guards and agent protection

**Current Modules (15 pages):**
1. Dashboard - Real-time metrics, charts, activity timeline
2. Tasks - Full CRUD with status workflow (5 tasks)
3. Milestones - Project milestones with progress tracking (1 milestone)
4. Risks - Risk register with impact/probability matrix (3 risks)
5. Decisions - Architecture Decision Records (1 decision)
6. Documents - PDF upload with RAG search (1 document, 84 chunks)
7. Contacts - Stakeholder management (6 contacts)
8. Reports - Weekly/monthly executive summaries
9. Secrets - Trade secret management with versioning
10. Search - Global hybrid search across documents
11. Notifications - In-app notifications with realtime
12. Settings - Org settings, members, branding, modules
13. Profile - User profile management
14. Admin - Platform admin (vault creation, user management)
15. Vault Profile - Company information and addresses

**Database Schema:**
- 27 tables with complete RLS policies
- All tables use `org_id` (migrated from `tenant_id`)
- Legacy `tenant_id` columns preserved for backward compatibility
- Comprehensive audit logging in `activity_log` table
- Multi-org membership support via `org_memberships`

**Gaps Identified:**
- ❌ No KPI tracking or financial snapshots
- ❌ No OKR/goal management framework
- ❌ No executive summary approval workflow
- ❌ No immutable, hashed board pack generation
- ❌ No investor request/response flow
- ❌ No portfolio-level cross-vault analytics
- ❌ No document sections with inline Q&A
- ❌ Module naming not signal-focused (Tasks vs Plan)
- ❌ Reports module lacks publish/hash mechanism

### High-Level Transformation Strategy

**Phase 0 - Setup & Instrument (1 week)**
- Create feature branch and development environment
- Add usage instrumentation (route hits, feature usage)
- Implement feature flag system
- Prepare database migration structure

**Phase 1 - Executive Core (4-6 weeks)**
- Implement KPIs & Financial Snapshots modules
- Build Summary approval and immutable publishing
- Create Packs module with PDF generation
- Convert Tasks → Requests with response workflow

**Phase 2 - Depth & Governance (3-4 weeks)**
- Add document sections with Q&A
- Implement decision approvals and cross-links
- Enhance Secrets evidence export
- Add OKR framework to Plan module

**Phase 3 - Portfolio & Insights (4-5 weeks)**
- Build Portfolio dashboard for investors
- Create Trends and Deltas cross-vault views
- Implement batch pack generation
- Add staleness alerts and KPI breach detection

**Total Timeline: 11-16 weeks from start to full launch**

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target Module Structure](#2-target-module-structure)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Route & Navigation Mapping](#4-route--navigation-mapping)
5. [Immutability & Hashing Strategy](#5-immutability--hashing-strategy)
6. [Migration Strategy](#6-migration-strategy)
7. [Feature Flags & Rollout](#7-feature-flags--rollout)
8. [Testing Strategy](#8-testing-strategy)
9. [User Impact Analysis](#9-user-impact-analysis)
10. [Phased Roadmap](#10-phased-roadmap)
11. [Open Questions & Ambiguities](#11-open-questions--ambiguities)
12. [Success Metrics](#12-success-metrics)

---

## 1. Current State Analysis

### 1.1 Existing Routes

**Dashboard Routes (15 pages):**
```
/dashboard          - Metrics dashboard
/tasks             - Task management (to become /requests)
/milestones        - Milestones (to merge into /plan)
/risks             - Risk register (keep as /risks)
/decisions         - Decision log (keep as /decisions)
/documents         - Document library (keep as /docs)
/contacts          - Contact management (archive or integrate)
/reports           - Report generation (to become /summary)
/secrets           - Trade secrets (keep as /secrets)
/search            - Global search (keep as /search)
/notifications     - Notifications center
/settings          - Settings (expand for modules)
/profile           - User profile
/admin             - Platform admin
/vaults/[id]/profile - Vault profile (to become /plan)
```

**API Routes (10 endpoints):**
```
/api/embeddings                              - OpenAI embedding proxy
/api/extract-pdf-text                        - PDF text extraction
/api/secrets/seal                            - Seal secret
/api/secrets/timestamp                       - TSA timestamp
/api/secrets/[id]/export-evidence            - Evidence bundle
/api/stripe/checkout                         - Stripe checkout
/api/stripe/portal                           - Stripe portal
/api/stripe/webhooks                         - Stripe webhooks
/api/vaults/[vaultId]/*                      - Vault operations
/api/webhooks/document-uploaded              - Document ingestion
```

### 1.2 Existing Database Tables

**Core Tables (27 total):**

1. **Identity & Auth:**
   - `profiles` - User profiles (2 rows)
   - `platform_admins` - Platform admin flags (1 row)

2. **Multi-Tenancy:**
   - `organizations` - Vaults (4 rows)
   - `org_memberships` - User-to-vault mapping with roles (5 rows)
   - `org_invitations` - Pending invitations (1 row)
   - `tenants` - Legacy tenant table (1 row, for backward compatibility)

3. **Executive Objects:**
   - `milestones` - Goals/milestones (1 row)
   - `risks` - Risk register (3 rows)
   - `decisions` - Decision log (1 row)
   - `tasks` - Tasks (5 rows) → Will become `requests`
   - `reports` - Generated reports (0 rows) → Will become `executive_summaries`

4. **Content & Documents:**
   - `documents` - Document metadata (1 row)
   - `document_chunks` - RAG chunks (84 rows)
   - `contacts` - Stakeholder contacts (6 rows)
   - `comments` - Comments system (0 rows)

5. **Secrets Module:**
   - `secrets` - Trade secrets (1 row)
   - `secret_versions` - Version history (1 row)
   - `secret_files` - Attached files (0 rows)
   - `secret_access` - Access control (0 rows)
   - `secret_audit` - Audit trail (2 rows)

6. **Vault Profiles:**
   - `vault_profiles` - Company information (0 rows)
   - `vault_addresses` - Company addresses (0 rows)
   - `vault_invites` - Vault invitations (0 rows)

7. **Subscriptions & Billing:**
   - `vault_subscriptions` - Vault billing (3 rows)
   - `subscriptions` - Stripe subscriptions (0 rows)

8. **System:**
   - `activity_log` - Audit logs (17 rows)
   - `user_notification_prefs` - Notification preferences (2 rows)
   - `notifications` - In-app notifications (0 rows)

### 1.3 Existing AI Actions

**24 CopilotKit Actions:**

1. **Tasks (6 actions):**
   - createTask, updateTaskStatus, deleteTask
   - listTasksByStatus, assignTask, updateTaskPriority

2. **Milestones (4 actions):**
   - createMilestone, updateMilestoneStatus, deleteMilestone
   - listMilestonesByStatus

3. **Risks (3 actions):**
   - createRisk, updateRisk, deleteRisk

4. **Decisions (3 actions):**
   - createDecision, updateDecision, deleteDecision

5. **Contacts (3 actions):**
   - createContact, updateContact, deleteContact

6. **Documents (4 actions):**
   - searchDocuments (RAG), listDocumentsByCategory
   - downloadDocument, deleteDocument

7. **Reports (2 actions):**
   - generateWeeklySummary, generateMonthlySummary

All actions include:
- Permission checks (canEdit, canDelete)
- Audit logging (before/after state)
- Org-scoped data access
- Standardized error messages

### 1.4 Key Technologies

**Frontend:**
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS + Radix UI
- TanStack Query
- CopilotKit (UI + runtime)
- Recharts (dashboard visualizations)

**Backend:**
- Supabase (Auth, Postgres, Storage, Realtime)
- FastAPI (Python, deployed to Railway)
- OpenAI API (embeddings + LLM)

**Database:**
- PostgreSQL with pgvector
- HNSW index for vector search
- GIN index for full-text search
- Row-Level Security on all tables

**Deployment:**
- GitHub: dan-ford/vaults-platform
- Vercel: Next.js frontend
- Railway: FastAPI agent
- Supabase: Database + auth

---

## 2. Target Module Structure

### 2.1 Per-Vault Modules (For Founders/C-Suite/Board)

**1. Plan** (Replaces: Milestones + Vault Profile + new OKRs)
- **Purpose:** Strategic objectives, key results, milestones
- **Data:** `okrs`, `milestones` (enhanced), `vault_profiles`
- **Features:** Owner assignment, due dates, links to Risks/Decisions
- **Route:** `/plan` (alias: `/milestones` for backward compatibility)
- **New Table:** `okrs` (org_id, objective, key_result, owner_id, due, status)

**2. Risks** (Keep as-is, enhance)
- **Purpose:** Probability × Impact matrix, mitigation tracking
- **Data:** `risks` (add: owner, due_date, mitigation_status)
- **Features:** Owner assignment, mitigation plans, status tracking
- **Route:** `/risks` (no change)
- **Schema Update:** Add owner_id, due_date, mitigation_status columns

**3. Decisions** (Keep as-is, add approvals)
- **Purpose:** Rationale, approvers, effective date, linked evidence
- **Data:** `decisions` (add: approvers, linked_docs)
- **Features:** Approval workflow, cross-links to Plan/Risks
- **Route:** `/decisions` (no change)
- **New Table:** `decision_approvals` (decision_id, approver_id, status, at)

**4. Metrics** (New module)
- **Purpose:** Core KPIs with trends and variance notes
- **Data:** `kpis`, `kpi_measurements`
- **Features:** Editable cadence, targets, sparklines, variance notes
- **Route:** `/metrics` (new)
- **New Tables:**
  - `kpis` (org_id, name, unit, target, owner_id, cadence)
  - `kpi_measurements` (kpi_id, period, value, variance_note, source_ref)

**5. Finance** (New module)
- **Purpose:** Monthly financial snapshots (ARR, cash, runway)
- **Data:** `financial_snapshots`
- **Features:** Revenue/ARR, margin, cash, burn, runway + notes
- **Route:** `/finance` (new)
- **New Table:** `financial_snapshots` (org_id, period, arr, revenue, gross_margin, cash, burn, runway_days, notes, source_ref)

**6. Summary** (Replaces: Reports, add approval)
- **Purpose:** Weekly/monthly executive update draft → approve → publish
- **Data:** `executive_summaries` (replace `reports`)
- **Features:** Auto-draft, citations, approval workflow, immutable hash
- **Route:** `/summary` (alias: `/reports` for backward compatibility)
- **Schema Update:** Rename `reports` → `executive_summaries`, add approval fields

**7. Packs** (New module)
- **Purpose:** Board/investor packs with agenda and attachments
- **Data:** `board_packs`
- **Features:** Immutable PDF + hash, attendees, agenda, watermarking
- **Route:** `/packs` (new)
- **New Table:** `board_packs` (org_id, meeting_date, agenda_jsonb, pdf_url, hash, attendees_jsonb)

**8. Requests** (Replaces: Tasks)
- **Purpose:** Structured information asks from investors
- **Data:** `investor_requests`, `request_responses` (rename `tasks`)
- **Features:** Due dates, response workflow, approval, hash
- **Route:** `/requests` (alias: `/tasks` for backward compatibility)
- **Schema Update:** Rename `tasks` → `investor_requests`, add response fields

**9. Docs** (Keep as Documents, add sections)
- **Purpose:** Canonical documents with sections, versioning, Q&A
- **Data:** `documents`, `document_sections`, `document_qa`
- **Features:** Section navigation, inline Q&A, citations
- **Route:** `/docs` (alias: `/documents` for backward compatibility)
- **New Tables:**
  - `document_sections` (document_id, path, order, title)
  - `document_qa` (section_id, question, answer, asked_by, resolved)

**10. Secrets** (Keep as-is)
- **Purpose:** Sealed files, watermarking, NDA gating, evidence export
- **Data:** `secrets`, `secret_versions`, `secret_files`, `secret_audit`, `secret_access`
- **Route:** `/secrets` (no change)

**11. Q&A** (New module or integrate into Docs)
- **Purpose:** Data-room style threads per section
- **Data:** `document_qa` (if separate) or merge into Docs
- **Features:** Resolved/Open states, threaded discussions
- **Route:** `/qa` (new) or inline in `/docs`

**12. Members** (Part of Settings)
- **Purpose:** Roles, permissions, brand settings
- **Data:** `org_memberships`, `organizations` (settings)
- **Features:** Email/PDF themes, role management
- **Route:** `/settings/members` (existing, enhance)

### 2.2 Portfolio Layer (For Investors)

**1. Portfolio** (New dashboard)
- **Purpose:** Tiles with On-Track/At-Risk, last update age, latest delta
- **Data:** Aggregated from all vaults user has access to
- **Features:** Vault cards, status indicators, staleness meters
- **Route:** `/portfolio` (new)
- **New Table:** `portfolio_flags` (org_id, flag_type, level, reason, created_at)

**2. Trends** (New analytics)
- **Purpose:** KPI variance across companies by time window
- **Data:** Cross-vault query on `kpi_measurements`
- **Features:** Time-series charts, comparison views
- **Route:** `/portfolio/trends` (new)

**3. Deltas** (New feed)
- **Purpose:** New/closed risks, slipped/achieved milestones, major decisions
- **Data:** Activity log across vaults with delta detection
- **Features:** Timeline view, filtering by type
- **Route:** `/portfolio/deltas` (new)

**4. Batch** (New bulk action)
- **Purpose:** Select vaults → generate combined brief or board pack bundle
- **Data:** Multi-vault summary generation
- **Features:** PDF export, watermarking, hash
- **Route:** `/portfolio/batch` (new)

**5. Alerts** (New notification center)
- **Purpose:** Stale updates, runway thresholds, KPI breaches, unanswered requests
- **Data:** `portfolio_alerts` or computed from existing data
- **Features:** Configurable thresholds, email/in-app notifications
- **Route:** `/portfolio/alerts` (new)

**6. Archive** (New historical view)
- **Purpose:** All published Summaries and Packs with hash and version trail
- **Data:** `executive_summaries`, `board_packs` (filtered to published)
- **Features:** Timeline view, hash verification, download
- **Route:** `/portfolio/archive` (new)

### 2.3 Module Comparison Matrix

| Current Module | New Module | Action | Data Migration | Route Alias |
|----------------|------------|--------|----------------|-------------|
| Tasks | Requests | Rename + enhance | `tasks` → `investor_requests` | `/tasks` → `/requests` |
| Milestones | Plan | Merge + expand | Add to Plan, keep table | `/milestones` → `/plan` |
| Risks | Risks | Enhance | Add columns | No change |
| Decisions | Decisions | Enhance | Add approvals | No change |
| Reports | Summary | Rename + workflow | `reports` → `executive_summaries` | `/reports` → `/summary` |
| Documents | Docs | Enhance | Add sections/Q&A | `/documents` → `/docs` |
| Secrets | Secrets | Keep | No change | No change |
| Contacts | (Archive?) | Optional | Mark deprecated | Optional `/contacts` |
| Vault Profile | Plan | Merge | Integrate into Plan view | Keep API route |
| Dashboard | Dashboard | Enhance | Add new metrics | No change |
| - | Metrics | New | New tables | `/metrics` (new) |
| - | Finance | New | New table | `/finance` (new) |
| - | Packs | New | New table | `/packs` (new) |
| - | Portfolio | New | Computed views | `/portfolio` (new) |

---

## 3. Database Schema Changes

### 3.1 New Tables

**1. okrs**
```sql
CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  key_result TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed', 'at-risk', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_okrs_org ON okrs(org_id);
CREATE INDEX idx_okrs_status ON okrs(org_id, status);

-- RLS policies (same pattern as milestones)
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
```

**2. kpis**
```sql
CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT, -- e.g., "USD", "%", "users"
  target NUMERIC,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly' CHECK (cadence IN ('daily', 'weekly', 'monthly', 'quarterly')),
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kpis_org ON kpis(org_id);

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
```

**3. kpi_measurements**
```sql
CREATE TABLE kpi_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period DATE NOT NULL, -- Start of measurement period
  value NUMERIC NOT NULL,
  variance_note TEXT, -- Explanation of variance
  source_ref UUID REFERENCES documents(id), -- Link to supporting document
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kpi_id, period)
);

CREATE INDEX idx_kpi_measurements_kpi ON kpi_measurements(kpi_id, period);
CREATE INDEX idx_kpi_measurements_org ON kpi_measurements(org_id);

ALTER TABLE kpi_measurements ENABLE ROW LEVEL SECURITY;
```

**4. financial_snapshots**
```sql
CREATE TABLE financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period DATE NOT NULL, -- Month-end date
  arr NUMERIC, -- Annual Recurring Revenue
  revenue NUMERIC, -- Monthly revenue
  gross_margin NUMERIC, -- Percentage
  cash NUMERIC, -- Cash balance
  burn NUMERIC, -- Monthly burn rate
  runway_days INTEGER, -- Calculated runway
  notes TEXT, -- Commentary
  source_ref UUID REFERENCES documents(id), -- Link to financial doc
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, period)
);

CREATE INDEX idx_financial_snapshots_org ON financial_snapshots(org_id, period DESC);

ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
```

**5. board_packs**
```sql
CREATE TABLE board_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  title TEXT NOT NULL,
  agenda JSONB NOT NULL DEFAULT '[]', -- Array of agenda items
  pdf_url TEXT, -- Storage path to generated PDF
  hash TEXT, -- SHA256 hash of PDF for immutability
  attendees JSONB DEFAULT '[]', -- Array of attendee objects
  approved_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_packs_org ON board_packs(org_id, meeting_date DESC);

ALTER TABLE board_packs ENABLE ROW LEVEL SECURITY;
```

**6. decision_approvals**
```sql
CREATE TABLE decision_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(decision_id, approver_id)
);

CREATE INDEX idx_decision_approvals_decision ON decision_approvals(decision_id);

ALTER TABLE decision_approvals ENABLE ROW LEVEL SECURITY;
```

**7. document_sections**
```sql
CREATE TABLE document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  path TEXT NOT NULL, -- e.g., "1.2.3" for hierarchical sections
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- Section content if applicable
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, path)
);

CREATE INDEX idx_document_sections_doc ON document_sections(document_id, order_index);

ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
```

**8. document_qa**
```sql
CREATE TABLE document_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES document_sections(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  asked_by UUID NOT NULL REFERENCES auth.users(id),
  answered_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_qa_doc ON document_qa(document_id);
CREATE INDEX idx_document_qa_section ON document_qa(section_id);
CREATE INDEX idx_document_qa_status ON document_qa(org_id, status);

ALTER TABLE document_qa ENABLE ROW LEVEL SECURITY;
```

**9. portfolio_flags**
```sql
CREATE TABLE portfolio_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('stale-update', 'risk-high', 'kpi-breach', 'runway-low', 'unanswered-request')),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_flags_org ON portfolio_flags(org_id, created_at DESC);
CREATE INDEX idx_portfolio_flags_type ON portfolio_flags(flag_type, level);

ALTER TABLE portfolio_flags ENABLE ROW LEVEL SECURITY;
```

### 3.2 Table Modifications

**1. Rename `reports` to `executive_summaries`**
```sql
-- Rename table
ALTER TABLE reports RENAME TO executive_summaries;

-- Add new columns for approval workflow
ALTER TABLE executive_summaries
  ADD COLUMN approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN hash TEXT, -- SHA256 hash for immutability
  ADD COLUMN citations JSONB DEFAULT '[]'; -- Array of citation objects

-- Update type check
ALTER TABLE executive_summaries
  DROP CONSTRAINT IF EXISTS reports_type_check,
  ADD CONSTRAINT executive_summaries_type_check
    CHECK (type IN ('weekly', 'monthly', 'board-pack', 'custom'));

-- Rename foreign key constraints
ALTER TABLE executive_summaries
  RENAME CONSTRAINT reports_org_id_fkey TO executive_summaries_org_id_fkey;
```

**2. Rename `tasks` to `investor_requests`**
```sql
-- Rename table
ALTER TABLE tasks RENAME TO investor_requests;

-- Add new columns for request/response workflow
ALTER TABLE investor_requests
  ADD COLUMN request_type TEXT DEFAULT 'information' CHECK (request_type IN ('information', 'document', 'data', 'action', 'agreed-action')),
  ADD COLUMN requester_id UUID REFERENCES auth.users(id),
  ADD COLUMN requested_at TIMESTAMPTZ,
  ADD COLUMN response_content TEXT,
  ADD COLUMN response_files JSONB DEFAULT '[]',
  ADD COLUMN responded_by UUID REFERENCES auth.users(id),
  ADD COLUMN responded_at TIMESTAMPTZ,
  ADD COLUMN response_hash TEXT; -- SHA256 for immutable responses

-- Update status check to include request statuses
ALTER TABLE investor_requests
  DROP CONSTRAINT IF EXISTS tasks_status_check,
  ADD CONSTRAINT investor_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'responded', 'approved', 'rejected', 'cancelled'));
```

**3. Enhance `milestones` table**
```sql
ALTER TABLE milestones
  ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN due_date DATE,
  ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN linked_risks UUID[] DEFAULT '{}', -- Array of linked risk IDs
  ADD COLUMN linked_decisions UUID[] DEFAULT '{}'; -- Array of linked decision IDs
```

**4. Enhance `risks` table**
```sql
ALTER TABLE risks
  ADD COLUMN due_date DATE, -- Mitigation deadline
  ADD COLUMN mitigation_status TEXT DEFAULT 'identified'
    CHECK (mitigation_status IN ('identified', 'planned', 'in-progress', 'completed', 'failed'));
```

**5. Enhance `decisions` table**
```sql
ALTER TABLE decisions
  ADD COLUMN effective_date DATE,
  ADD COLUMN linked_evidence UUID[] DEFAULT '{}', -- Array of document IDs
  ADD COLUMN approval_required BOOLEAN DEFAULT false;
```

**6. Enhance `documents` table**
```sql
ALTER TABLE documents
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN has_sections BOOLEAN DEFAULT false,
  ADD COLUMN qa_enabled BOOLEAN DEFAULT true;
```

### 3.3 Migration Strategy

**Phase 0: Preparation**
1. Create feature flag in `organizations.settings`:
   ```json
   {
     "modules": {
       "executive_layer_v2": false
     }
   }
   ```

2. Run database schema validation:
   ```sql
   -- Check for data that would break constraints
   SELECT * FROM tasks WHERE status NOT IN ('pending', 'in_progress', 'responded', 'approved', 'rejected', 'cancelled');
   SELECT * FROM reports WHERE type NOT IN ('weekly', 'monthly', 'board-pack', 'custom');
   ```

**Phase 1: Create New Tables**
```bash
# Migration: 20251018_create_executive_layer_tables.sql
- Create okrs, kpis, kpi_measurements, financial_snapshots
- Create board_packs, decision_approvals
- Create document_sections, document_qa, portfolio_flags
- Create RLS policies for all new tables
- Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE <table_name>;
```

**Phase 2: Modify Existing Tables**
```bash
# Migration: 20251018_enhance_existing_tables.sql
- Add columns to milestones, risks, decisions, documents
- Add indexes for new columns
- Update RLS policies if needed
```

**Phase 3: Rename Tables (Non-Breaking)**
```bash
# Migration: 20251018_rename_tables_with_aliases.sql
- Rename reports → executive_summaries (with view alias)
- Rename tasks → investor_requests (with view alias)
- Create views for backward compatibility:
  CREATE VIEW reports AS SELECT * FROM executive_summaries;
  CREATE VIEW tasks AS SELECT * FROM investor_requests;
```

**Phase 4: Data Migration**
```bash
# Migration: 20251018_migrate_data.sql
- Migrate existing milestones to include new fields
- Create default OKRs from existing vault profiles if present
- Preserve all existing data, no deletions
```

### 3.4 Backward Compatibility

**View Aliases:**
```sql
-- Allow old queries to continue working
CREATE OR REPLACE VIEW reports AS
  SELECT id, org_id, tenant_id, title, type,
         period_start, period_end, content_markdown,
         content_html, stats, created_by, created_at, updated_at
  FROM executive_summaries;

CREATE OR REPLACE VIEW tasks AS
  SELECT id, org_id, tenant_id, title, description,
         status, priority, assignee_id, milestone_id,
         due_date, metadata, created_by, created_at, updated_at
  FROM investor_requests;
```

**TypeScript Type Generation:**
```bash
# Regenerate types to include both old and new table names
npx supabase gen types typescript --project-id lkjzxsvytsmnvuorqfdl > lib/types/database.types.ts
```

---

## 4. Route & Navigation Mapping

### 4.1 New Route Structure

**Per-Vault Routes:**
```
/plan              - Plan (OKRs + Milestones + Vault Profile)
/risks             - Risks (unchanged)
/decisions         - Decisions (unchanged)
/metrics           - Metrics (new - KPI tracking)
/finance           - Finance (new - financial snapshots)
/summary           - Summary (was /reports, with approval workflow)
/packs             - Packs (new - board pack generation)
/requests          - Requests (was /tasks, investor information requests)
/docs              - Docs (was /documents, with sections/Q&A)
/secrets           - Secrets (unchanged)
/qa                - Q&A (new, or integrated into /docs)
/settings/members  - Members (existing, part of settings)
```

**Portfolio Routes (for Investors):**
```
/portfolio         - Portfolio dashboard (new)
/portfolio/trends  - Trends (new - cross-vault KPI analysis)
/portfolio/deltas  - Deltas (new - change feed)
/portfolio/batch   - Batch (new - multi-vault pack generation)
/portfolio/alerts  - Alerts (new - notification center)
/portfolio/archive - Archive (new - historical summaries/packs)
```

**System Routes (unchanged):**
```
/dashboard         - Main dashboard (enhanced with new metrics)
/search            - Global search
/notifications     - Notifications center
/settings          - Settings (all tabs)
/profile           - User profile
/admin             - Platform admin
```

### 4.2 Navigation Updates

**Bottom Navigation (Mobile):**
```typescript
// Before
const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/milestones", icon: Target, label: "Milestones" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/risks", icon: AlertTriangle, label: "Risks" },
  { href: "/decisions", icon: GitBranch, label: "Decisions" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/reports", icon: TrendingUp, label: "Reports" },
];

// After (with feature flag)
const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: executiveLayerEnabled ? "/plan" : "/milestones", icon: Target, label: executiveLayerEnabled ? "Plan" : "Milestones" },
  { href: "/risks", icon: AlertTriangle, label: "Risks" },
  { href: "/decisions", icon: GitBranch, label: "Decisions" },
  { href: executiveLayerEnabled ? "/metrics" : null, icon: BarChart3, label: "Metrics", hidden: !executiveLayerEnabled },
  { href: executiveLayerEnabled ? "/finance" : null, icon: DollarSign, label: "Finance", hidden: !executiveLayerEnabled },
  { href: executiveLayerEnabled ? "/summary" : "/reports", icon: TrendingUp, label: executiveLayerEnabled ? "Summary" : "Reports" },
  { href: executiveLayerEnabled ? "/packs" : null, icon: Package, label: "Packs", hidden: !executiveLayerEnabled },
  { href: executiveLayerEnabled ? "/requests" : "/tasks", icon: CheckSquare, label: executiveLayerEnabled ? "Requests" : "Tasks" },
  { href: "/docs", icon: FileText, label: "Docs" },
  { href: "/secrets", icon: Lock, label: "Secrets" },
];
```

**Hamburger Menu (Desktop):**
```typescript
// Add Portfolio section for users with multi-vault access
const menuSections = [
  {
    title: "Workspace",
    items: [...navItems] // Per-vault items
  },
  ...(hasMultipleVaults ? [{
    title: "Portfolio",
    items: [
      { href: "/portfolio", icon: LayoutGrid, label: "Overview" },
      { href: "/portfolio/trends", icon: TrendingUp, label: "Trends" },
      { href: "/portfolio/deltas", icon: Activity, label: "Deltas" },
      { href: "/portfolio/alerts", icon: Bell, label: "Alerts" },
      { href: "/portfolio/archive", icon: Archive, label: "Archive" },
    ]
  }] : []),
  {
    title: "System",
    items: [
      { href: "/search", icon: Search, label: "Search" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ]
  }
];
```

### 4.3 Route Aliases for Backward Compatibility

**Middleware Redirects:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get org settings to check if executive layer is enabled
  const executiveLayerEnabled = await getOrgSetting('modules.executive_layer_v2');

  // Redirect old routes to new routes if feature is enabled
  const redirectMap = executiveLayerEnabled ? {
    '/tasks': '/requests',
    '/reports': '/summary',
    '/documents': '/docs',
    '/milestones': '/plan',
  } : {};

  if (redirectMap[pathname]) {
    return NextResponse.redirect(new URL(redirectMap[pathname], request.url));
  }

  return NextResponse.next();
}
```

---

## 5. Immutability & Hashing Strategy

### 5.1 SHA-256 Hashing Implementation

**Utility Function:**
```typescript
// lib/utils/immutability.ts
import crypto from 'crypto';

export interface ImmutableSnapshot {
  id: string;
  type: 'executive_summary' | 'board_pack' | 'request_response';
  content: any; // Canonical JSON
  hash: string; // SHA256
  timestamp: string; // ISO 8601
  signed_by: string[]; // User IDs
}

export function computeContentHash(content: any): string {
  // Canonicalize JSON (sorted keys, no whitespace)
  const canonical = JSON.stringify(content, Object.keys(content).sort());
  return crypto.createHash('sha256').update(canonical, 'utf8').hexdigest();
}

export function createImmutableSnapshot(
  type: ImmutableSnapshot['type'],
  content: any,
  userId: string
): ImmutableSnapshot {
  const hash = computeContentHash(content);
  return {
    id: crypto.randomUUID(),
    type,
    content,
    hash,
    timestamp: new Date().toISOString(),
    signed_by: [userId]
  };
}

export function verifySnapshot(snapshot: ImmutableSnapshot): boolean {
  const recomputedHash = computeContentHash(snapshot.content);
  return recomputedHash === snapshot.hash;
}
```

### 5.2 Executive Summary Publishing Flow

**Workflow:**
```
1. Draft Generation (AI or manual)
   - Content stored in executive_summaries.content_markdown
   - Status: 'draft'
   - No hash yet

2. Preview & Edit
   - User reviews and can make changes
   - Still status: 'draft'
   - No hash yet

3. Approval
   - User clicks "Approve & Publish"
   - Canonicalize content + citations
   - Compute SHA256 hash
   - Update: approved_by, published_at, hash
   - Status: 'published'
   - Create immutable snapshot

4. Distribution
   - Generate branded PDF with watermark
   - Store PDF in Supabase Storage
   - Send email with hash included
   - Log to audit trail
```

**Database Update:**
```sql
-- Publishing function
CREATE OR REPLACE FUNCTION publish_executive_summary(
  summary_id UUID,
  approver_id UUID
) RETURNS executive_summaries AS $$
DECLARE
  summary executive_summaries;
  content_hash TEXT;
BEGIN
  -- Fetch current summary
  SELECT * INTO summary FROM executive_summaries WHERE id = summary_id;

  -- Compute hash of canonical content
  content_hash := encode(digest(
    jsonb_build_object(
      'content', summary.content_markdown,
      'citations', summary.citations,
      'period_start', summary.period_start,
      'period_end', summary.period_end,
      'type', summary.type
    )::text,
    'sha256'
  ), 'hex');

  -- Update summary with approval
  UPDATE executive_summaries
  SET
    approved_by = approver_id,
    published_at = NOW(),
    hash = content_hash,
    updated_at = NOW()
  WHERE id = summary_id
  RETURNING * INTO summary;

  RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3 Board Pack Watermarking

**PDF Generation with Watermark:**
```typescript
// lib/services/pdf-generator.ts
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

export async function generateBoardPack(
  packId: string,
  orgId: string,
  userId: string
): Promise<string> {
  const pack = await fetchBoardPack(packId);
  const org = await fetchOrganization(orgId);
  const user = await fetchUser(userId);

  const doc = new PDFDocument();
  const filePath = `/tmp/${packId}.pdf`;
  doc.pipe(createWriteStream(filePath));

  // Add watermark to every page
  doc.on('pageAdded', () => {
    doc.save();
    doc.opacity(0.1);
    doc.fontSize(48);
    doc.text(
      `CONFIDENTIAL - ${org.name} - ${user.email} - ${new Date().toISOString()}`,
      50, 400,
      { align: 'center', angle: 45 }
    );
    doc.restore();
  });

  // Add cover page with hash
  doc.fontSize(24).text(`Board Pack - ${pack.title}`, 100, 100);
  doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, 100, 150);
  doc.fontSize(10).text(`Hash: ${pack.hash}`, 100, 170);

  // Add agenda
  doc.addPage();
  doc.fontSize(18).text('Agenda', 100, 100);
  pack.agenda.forEach((item: any, i: number) => {
    doc.fontSize(12).text(`${i + 1}. ${item.title}`, 120, 140 + i * 30);
  });

  // ... add content sections

  doc.end();

  // Upload to Supabase Storage
  const storagePath = `orgs/${orgId}/packs/${packId}.pdf`;
  await uploadToStorage(filePath, storagePath);

  return storagePath;
}
```

### 5.4 Verification UI

**Hash Verification Component:**
```tsx
// components/immutability/hash-verifier.tsx
import { useState } from 'react';
import { verifySnapshot } from '@/lib/utils/immutability';

export function HashVerifier({ snapshot }: { snapshot: ImmutableSnapshot }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    const result = verifySnapshot(snapshot);
    setVerified(result);
    setIsVerifying(false);
  };

  return (
    <div className="border rounded p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Content Hash</p>
          <p className="text-sm text-muted-foreground font-mono">{snapshot.hash}</p>
        </div>
        <Button onClick={handleVerify} disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify Integrity'}
        </Button>
      </div>

      {verified !== null && (
        <div className={`mt-4 p-3 rounded ${verified ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={verified ? 'text-green-700' : 'text-red-700'}>
            {verified ? 'Content verified - hash matches' : 'Warning: Content has been modified'}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Migration Strategy

### 6.1 Development Branch Strategy

**Branch Structure:**
```
main (production)
└── feature/executive-layer-v2 (development branch)
    ├── feat/phase-0-setup
    ├── feat/phase-1-core-modules
    ├── feat/phase-2-governance
    └── feat/phase-3-portfolio
```

**Branch Protection:**
```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on:
  pull_request:
    branches: [main, feature/executive-layer-v2]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npm run test
```

### 6.2 Feature Flag Implementation

**Database Feature Flag:**
```sql
-- Add to organizations.settings
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{modules,executive_layer_v2}',
  'false'
);
```

**React Hook:**
```typescript
// lib/hooks/use-feature-flag.ts
import { useOrganization } from '@/lib/context/organization-context';

export function useFeatureFlag(flag: string): boolean {
  const { currentOrg } = useOrganization();

  if (!currentOrg?.settings?.modules) return false;

  return currentOrg.settings.modules[flag] === true;
}

// Usage in components
export default function NavigationMenu() {
  const executiveLayerEnabled = useFeatureFlag('executive_layer_v2');

  return (
    <nav>
      {executiveLayerEnabled ? (
        <Link href="/plan">Plan</Link>
      ) : (
        <Link href="/milestones">Milestones</Link>
      )}
    </nav>
  );
}
```

### 6.3 Gradual Rollout Plan

**Week 1: Phase 0**
1. Create `feature/executive-layer-v2` branch
2. Add feature flag to database
3. Deploy feature flag UI to settings page
4. Add usage instrumentation
5. No user-facing changes yet

**Week 2-3: Internal Testing**
1. Enable flag for 1 test organization
2. Test all new modules
3. Gather feedback
4. Fix issues

**Week 4-5: Beta Testing**
1. Enable for 3-5 pilot organizations
2. Weekly check-ins
3. Iterate on feedback
4. Document common workflows

**Week 6-7: Phased Rollout**
1. Enable for 25% of organizations
2. Monitor metrics
3. Enable for 50% of organizations
4. Monitor metrics

**Week 8: Full Rollout**
1. Enable for all organizations
2. Deprecate old routes (but keep aliases)
3. Update documentation
4. Announce launch

### 6.4 Rollback Strategy

**Emergency Rollback:**
```sql
-- Disable feature for all orgs
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{modules,executive_layer_v2}',
  'false'
);

-- Or disable for specific org
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{modules,executive_layer_v2}',
  'false'
)
WHERE id = '<org_id>';
```

**Data Rollback (if needed):**
```sql
-- All new tables are additive, no data deleted
-- If rollback needed, simply disable feature flag
-- Data remains in database for re-enablement
```

---

## 7. Feature Flags & Rollout

### 7.1 Feature Flag Schema

```typescript
// lib/types/feature-flags.ts
export interface FeatureFlags {
  modules: {
    executive_layer_v2: boolean;
    metrics: boolean;
    finance: boolean;
    packs: boolean;
    portfolio: boolean;
    document_sections: boolean;
    decision_approvals: boolean;
  };
  experiments: {
    ai_auto_draft: boolean;
    batch_pack_generation: boolean;
    portfolio_alerts: boolean;
  };
}
```

### 7.2 Feature Flag UI

**Settings Page Integration:**
```tsx
// app/(dashboard)/settings/page.tsx
export function SettingsPage() {
  const { canManage } = usePermissions();
  const { currentOrg, updateOrganization } = useOrganization();

  const handleToggleFeature = async (flag: string, enabled: boolean) => {
    const newSettings = {
      ...currentOrg.settings,
      modules: {
        ...currentOrg.settings.modules,
        [flag]: enabled
      }
    };

    await updateOrganization(currentOrg.id, { settings: newSettings });
  };

  if (!canManage) return <AccessDenied />;

  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="features">Features</TabsTrigger>
        {/* ... other tabs */}
      </TabsList>

      <TabsContent value="features">
        <Card>
          <CardHeader>
            <CardTitle>Beta Features</CardTitle>
            <CardDescription>
              Enable experimental features for your vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FeatureToggle
                name="executive_layer_v2"
                label="Executive Layer V2"
                description="New executive-focused modules (Plan, Metrics, Finance, Packs)"
                enabled={currentOrg.settings?.modules?.executive_layer_v2}
                onToggle={(enabled) => handleToggleFeature('executive_layer_v2', enabled)}
              />

              <FeatureToggle
                name="portfolio"
                label="Portfolio Dashboard"
                description="Cross-vault analytics for investors"
                enabled={currentOrg.settings?.modules?.portfolio}
                onToggle={(enabled) => handleToggleFeature('portfolio', enabled)}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
```

### 7.3 Rollout Metrics

**Key Metrics to Track:**

1. **Adoption Metrics:**
   - % of orgs with flag enabled
   - % of users accessing new modules
   - Daily active users per module

2. **Usage Metrics:**
   - Executive summaries created
   - Board packs generated
   - KPIs tracked
   - Financial snapshots created
   - Requests created/responded

3. **Performance Metrics:**
   - Page load time (new modules)
   - API response time (new endpoints)
   - Database query performance

4. **Quality Metrics:**
   - Error rate (new features)
   - User-reported issues
   - Support tickets

**Instrumentation:**
```typescript
// lib/analytics/track-feature-usage.ts
export async function trackFeatureUsage(
  feature: string,
  action: string,
  metadata?: Record<string, any>
) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  // Log to analytics service (PostHog, Mixpanel, etc.)
  await analytics.track({
    event: `${feature}_${action}`,
    userId: user.id,
    orgId: currentOrg.id,
    properties: {
      ...metadata,
      timestamp: new Date().toISOString(),
      feature_flag: currentOrg.settings?.modules?.[feature]
    }
  });

  // Also log to database for internal analysis
  await supabase.from('feature_usage_log').insert({
    org_id: currentOrg.id,
    user_id: user.id,
    feature,
    action,
    metadata,
    created_at: new Date().toISOString()
  });
}

// Usage in components
const handleCreateKPI = async () => {
  await trackFeatureUsage('metrics', 'create_kpi', { kpi_name: form.name });
  // ... actual creation logic
};
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**New Components:**
```typescript
// __tests__/components/metrics/kpi-card.test.tsx
import { render, screen } from '@testing-library/react';
import { KPICard } from '@/components/metrics/kpi-card';

describe('KPICard', () => {
  it('renders KPI with target and current value', () => {
    render(
      <KPICard
        kpi={{ name: 'MRR', unit: 'USD', target: 100000, current: 85000 }}
      />
    );

    expect(screen.getByText('MRR')).toBeInTheDocument();
    expect(screen.getByText('$85,000')).toBeInTheDocument();
    expect(screen.getByText('Target: $100,000')).toBeInTheDocument();
  });

  it('shows variance indicator', () => {
    const { container } = render(
      <KPICard
        kpi={{ name: 'MRR', target: 100000, current: 85000 }}
      />
    );

    // Should show 15% below target
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });
});
```

**New Utilities:**
```typescript
// __tests__/lib/utils/immutability.test.ts
import { computeContentHash, verifySnapshot } from '@/lib/utils/immutability';

describe('Immutability Utils', () => {
  it('computes consistent hash for same content', () => {
    const content = { title: 'Test', data: [1, 2, 3] };
    const hash1 = computeContentHash(content);
    const hash2 = computeContentHash(content);

    expect(hash1).toBe(hash2);
  });

  it('detects content modification', () => {
    const snapshot = {
      id: '123',
      type: 'executive_summary',
      content: { title: 'Original' },
      hash: computeContentHash({ title: 'Original' }),
      timestamp: new Date().toISOString(),
      signed_by: ['user1']
    };

    expect(verifySnapshot(snapshot)).toBe(true);

    // Modify content
    snapshot.content.title = 'Modified';
    expect(verifySnapshot(snapshot)).toBe(false);
  });
});
```

### 8.2 Integration Tests

**Database Operations:**
```typescript
// __tests__/integration/executive-summaries.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Executive Summaries', () => {
  let supabase;
  let testOrgId;
  let testUserId;

  beforeAll(async () => {
    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    // Create test org and user
  });

  it('creates draft summary', async () => {
    const { data, error } = await supabase
      .from('executive_summaries')
      .insert({
        org_id: testOrgId,
        title: 'Weekly Update',
        type: 'weekly',
        period_start: '2025-01-01',
        period_end: '2025-01-07',
        content_markdown: '# Summary\n\nTest content',
        created_by: testUserId
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.hash).toBeNull(); // Not published yet
    expect(data.published_at).toBeNull();
  });

  it('publishes summary with hash', async () => {
    // ... create draft

    const { data, error } = await supabase
      .rpc('publish_executive_summary', {
        summary_id: draftId,
        approver_id: testUserId
      });

    expect(error).toBeNull();
    expect(data.hash).toBeTruthy();
    expect(data.hash).toHaveLength(64); // SHA256 hex length
    expect(data.published_at).toBeTruthy();
    expect(data.approved_by).toBe(testUserId);
  });
});
```

### 8.3 RLS Policy Tests

**Multi-tenant Isolation:**
```typescript
// __tests__/security/rls-policies.test.ts
describe('RLS Policies - Executive Layer', () => {
  it('prevents cross-org access to KPIs', async () => {
    const org1Client = createClientForUser(user1, org1);
    const org2Client = createClientForUser(user2, org2);

    // Create KPI in org1
    const { data: kpi } = await org1Client
      .from('kpis')
      .insert({ org_id: org1.id, name: 'Revenue', target: 1000000 })
      .select()
      .single();

    // User from org2 should not see it
    const { data: stolen } = await org2Client
      .from('kpis')
      .select()
      .eq('id', kpi.id)
      .single();

    expect(stolen).toBeNull();
  });

  it('enforces role-based access to board packs', async () => {
    const viewerClient = createClientForUser(viewer, org);

    // Viewer cannot create board pack
    const { error } = await viewerClient
      .from('board_packs')
      .insert({
        org_id: org.id,
        meeting_date: '2025-02-01',
        title: 'Q1 Board Meeting',
        created_by: viewer.id
      });

    expect(error).toBeTruthy();
    expect(error.code).toBe('42501'); // Insufficient privilege
  });
});
```

### 8.4 End-to-End Tests

**Critical User Journeys:**
```typescript
// e2e/executive-summary-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Executive Summary Workflow', () => {
  test('founder can create, approve, and publish summary', async ({ page }) => {
    // Login as founder
    await page.goto('/login');
    await page.fill('[name="email"]', 'founder@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to Summary
    await page.goto('/summary');

    // Create draft
    await page.click('text=Create Summary');
    await page.fill('[name="title"]', 'Weekly Update - Jan 1');
    await page.selectOption('[name="type"]', 'weekly');
    await page.click('text=Generate with AI');

    // Wait for AI to generate
    await expect(page.locator('text=Draft ready')).toBeVisible({ timeout: 10000 });

    // Preview and approve
    await page.click('text=Preview');
    await expect(page.locator('.summary-preview')).toBeVisible();
    await page.click('text=Approve & Publish');

    // Verify published
    await expect(page.locator('text=Published successfully')).toBeVisible();
    await expect(page.locator('.hash-display')).toBeVisible();

    // Check hash is present
    const hash = await page.locator('.hash-display').textContent();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

---

## 9. User Impact Analysis

### 9.1 Impact by Role

**OWNER/ADMIN:**
- ✅ Access to all new modules
- ✅ Can enable/disable feature flags
- ⚠️ Need training on new workflows
- ⚠️ May need to update existing data

**EDITOR:**
- ✅ Can create KPIs, financial snapshots, requests
- ✅ Cannot publish summaries or packs (requires ADMIN)
- ⚠️ Workflow changes for task→request conversion

**VIEWER:**
- ✅ Read-only access to all new data
- ℹ️ No breaking changes
- ℹ️ Familiar navigation patterns

**INVESTOR:**
- ✅ New portfolio dashboard
- ✅ Cross-vault analytics
- ✅ Batch pack downloads
- ℹ️ Existing permissions unchanged

### 9.2 Breaking Changes

**None (with feature flag off):**
- All existing routes continue to work
- No data deleted or modified
- No permission changes
- Navigation unchanged

**With feature flag on:**
- ⚠️ Route names change (but aliases preserved)
- ⚠️ Navigation menu reorganized
- ⚠️ Tasks → Requests terminology change
- ⚠️ Reports → Summary terminology change
- ✅ All data accessible in new structure

### 9.3 Migration Path for Existing Users

**Week 1: Preparation**
- Prepare announcement materials
- Update help docs
- Create video tutorials
- Add in-app tooltips

**Week 2: Announcement**
- Email all users about upcoming changes
- Publish blog post explaining new features
- Offer optional preview webinar

**Week 3: Opt-in Beta**
- Allow users to enable feature flag themselves
- Provide feedback channel
- Offer 1:1 support sessions

**Week 4-6: Gradual Rollout**
- Enable for early adopters
- Monitor feedback
- Iterate on UX

**Week 7: Full Launch**
- Enable for all users
- Deprecate old terminology (but keep aliases)
- Celebrate launch

### 9.4 Support Strategy

**Help Resources:**
1. In-app tooltips for new modules
2. Video tutorials (3-5 min each)
3. Updated help docs
4. Migration guide (old → new)
5. FAQ section

**Support Channels:**
1. In-app chat (Intercom/Crisp)
2. Email support
3. Weekly office hours
4. Community forum

**Known Issues & Workarounds:**
1. Issue: Old bookmarks to `/tasks` may confuse users
   - Solution: Redirect with banner explaining change
2. Issue: Terminology confusion (Tasks vs Requests)
   - Solution: Glossary popup on first visit
3. Issue: Portfolio requires multi-vault access
   - Solution: Clear messaging if user only has 1 vault

---

## 10. Phased Roadmap

### Phase 0: Setup & Instrument (Week 1)

**Goals:**
- Set up development infrastructure
- Implement feature flag system
- No user-facing changes

**Tasks:**
1. ✅ Create `feature/executive-layer-v2` branch
2. ✅ Add feature flag schema to database
3. ✅ Implement feature flag hook and UI
4. ✅ Add usage instrumentation
5. ✅ Set up analytics dashboard
6. ✅ Create database migration structure
7. ✅ Update documentation

**Deliverables:**
- Feature flag system operational
- Database migration framework ready
- Analytics dashboard configured
- Development branch set up

**Success Criteria:**
- Feature flag can be toggled without errors
- Analytics tracking all key events
- Migration scripts tested on staging database

### Phase 1: Executive Core (Weeks 2-7)

**Goals:**
- Ship core executive modules
- Migrate existing data
- Enable for beta users

**Sprint 1 (Weeks 2-3): Metrics & Finance**
1. Create database tables (kpis, kpi_measurements, financial_snapshots)
2. Build Metrics page (/metrics)
   - KPI creation form
   - Measurement entry
   - Sparkline charts
   - Variance tracking
3. Build Finance page (/finance)
   - Monthly snapshot form
   - ARR/Revenue/Cash/Runway display
   - Trend charts
4. Add AI actions (createKPI, recordMeasurement, updateFinancials)
5. Write unit tests
6. Deploy to staging

**Sprint 2 (Weeks 4-5): Summary & Packs**
1. Rename reports → executive_summaries
2. Add approval workflow
   - Draft → Preview → Approve → Publish
   - SHA256 hashing on publish
   - Immutable snapshots
3. Build Packs page (/packs)
   - Board pack creation form
   - Agenda builder
   - PDF generation with watermark
   - Hash verification
4. Add AI actions (draftSummary, createPack, approveSummary)
5. Write integration tests
6. Deploy to staging

**Sprint 3 (Weeks 6-7): Requests & Plan**
1. Rename tasks → investor_requests
2. Add request/response workflow
   - Create request
   - Assign to team
   - Draft response
   - Approve response
   - Immutable snapshot
3. Merge Milestones + Vault Profile → Plan
   - Create OKRs table
   - Build Plan page with tabs
   - Migrate existing milestones
4. Add AI actions (createRequest, respondToRequest, createOKR)
5. Write E2E tests
6. Deploy to production (flag off by default)

**Deliverables:**
- 4 new modules operational
- 2 renamed modules with aliases
- All data migrated
- Test coverage >80%

**Success Criteria:**
- Beta users successfully create KPIs and summaries
- Hash verification works 100% of time
- No data loss during migration
- Performance metrics met (<2.5s page load)

### Phase 2: Depth & Governance (Weeks 8-11)

**Goals:**
- Add advanced features
- Improve decision governance
- Enhance document management

**Sprint 4 (Weeks 8-9): Document Sections & Q&A**
1. Create document_sections and document_qa tables
2. Build section editor
   - Hierarchical structure
   - Drag-and-drop reordering
   - Section navigation
3. Build Q&A interface
   - Inline questions
   - Threaded responses
   - Resolved/Open states
4. Add AI action (answerDocumentQuestion)
5. Write tests
6. Deploy to staging

**Sprint 5 (Weeks 10-11): Decision Approvals & Cross-links**
1. Create decision_approvals table
2. Build approval workflow
   - Request approvals
   - Approve/Reject
   - Notifications
3. Add cross-linking
   - Link decisions to risks
   - Link decisions to plan items
   - Link decisions to documents
4. Enhance Secrets module
   - Evidence bundle improvements
   - TSA integration (optional)
5. Write tests
6. Deploy to production

**Deliverables:**
- Document sections operational
- Q&A system functional
- Decision approvals working
- Cross-links visible in UI

**Success Criteria:**
- Users successfully create document sections
- Q&A threads remain organized
- Approval workflow tested with real users
- Evidence export includes all required files

### Phase 3: Portfolio & Insights (Weeks 12-16)

**Goals:**
- Build investor-focused features
- Enable cross-vault analytics
- Launch to all users

**Sprint 6 (Weeks 12-13): Portfolio Dashboard**
1. Create portfolio_flags table
2. Build Portfolio dashboard (/portfolio)
   - Vault tiles
   - On-Track/At-Risk indicators
   - Staleness meters
   - Quick actions
3. Implement At-Risk logic
   - High-impact open risks
   - Missed milestones
   - KPI breaches
   - Stale updates
4. Write tests
5. Deploy to staging

**Sprint 7 (Weeks 14-15): Trends & Deltas**
1. Build Trends page (/portfolio/trends)
   - Cross-vault KPI comparison
   - Time-series charts
   - Drill-down to specific vault
2. Build Deltas page (/portfolio/deltas)
   - Change feed across vaults
   - Filter by type (risk/milestone/decision)
   - Timeline view
3. Add AI action (generatePortfolioSummary)
4. Write tests
5. Deploy to staging

**Sprint 8 (Week 16): Batch & Alerts**
1. Build Batch page (/portfolio/batch)
   - Multi-vault selection
   - Combined brief generation
   - PDF bundle export
2. Build Alerts system
   - Threshold configuration
   - Email notifications
   - In-app alerts
3. Build Archive page
   - Historical summaries/packs
   - Hash verification
   - Download links
4. Final testing
5. Launch to all users

**Deliverables:**
- Portfolio layer complete
- 6 new portfolio pages
- Batch generation working
- Alert system operational

**Success Criteria:**
- Investors successfully use portfolio dashboard
- Trends show meaningful insights
- Batch generation creates valid PDFs
- Alerts trigger correctly

### Post-Launch: Optimization & Iteration (Ongoing)

**Week 17+:**
1. Monitor metrics and user feedback
2. Fix bugs and performance issues
3. Iterate on UX based on usage patterns
4. Add requested features
5. Optimize database queries
6. Improve AI prompts
7. Expand documentation
8. Run user satisfaction surveys

**Quarterly Reviews:**
1. Review adoption metrics
2. Analyze feature usage
3. Prioritize next enhancements
4. Update roadmap

---

## 11. Open Questions & Ambiguities

### 11.1 Business Logic Questions

**1. KPI Target Setting**
- Q: Should KPI targets be auto-calculated from historical data?
- A: TBD - Requires business decision
- Impact: Medium - affects UX complexity
- Decision by: End of Phase 0

**2. Executive Summary Auto-Generation**
- Q: What data sources should AI use for auto-draft?
  - Last week's milestones?
  - Changed risks?
  - New decisions?
  - Document uploads?
- A: TBD - Requires business decision
- Impact: High - core feature
- Decision by: Sprint 2 start

**3. Board Pack Approval Workflow**
- Q: Single approver or multi-signature required?
- A: TBD - May depend on org size/type
- Impact: Medium - affects schema and workflow
- Decision by: Sprint 2 start

**4. Portfolio "At-Risk" Logic**
- Q: What triggers "At-Risk" status?
  - High-impact open risks?
  - Missed milestones?
  - KPI below threshold?
  - Combination of above?
- A: TBD - Requires business decision
- Impact: High - key investor feature
- Decision by: Sprint 6 start

**5. Investor Request Permissions**
- Q: Can any investor create requests or only ADMIN?
- A: TBD - May be role-dependent
- Impact: Medium - affects permissions
- Decision by: Sprint 3 start

### 11.2 Technical Questions

**1. PDF Generation Library**
- Q: Use PDFKit, Puppeteer, or commercial service?
- Options:
  - PDFKit (open source, Node.js)
  - Puppeteer (HTML→PDF)
  - DocRaptor/Prince (commercial)
- A: TBD - Evaluate performance/quality
- Impact: Medium - affects implementation
- Decision by: Sprint 2 start

**2. TSA Integration for Secrets**
- Q: Required for MVP or optional premium feature?
- A: TBD - Check legal requirements
- Impact: Low - can add later
- Decision by: Phase 2 start

**3. Cross-Vault Query Performance**
- Q: How to optimize portfolio queries across many vaults?
- Options:
  - Materialized views
  - Caching layer (Redis)
  - Background jobs
- A: TBD - Load testing needed
- Impact: High if >50 vaults per user
- Decision by: Sprint 6 start

**4. Realtime for Portfolio**
- Q: Should portfolio dashboard update in realtime?
- A: TBD - May be too chatty
- Impact: Medium - affects architecture
- Decision by: Sprint 6 start

**5. Archive Storage Strategy**
- Q: How long to retain published packs/summaries?
- A: TBD - Legal/compliance requirement
- Impact: Low - affects storage costs
- Decision by: Phase 3 start

### 11.3 UX/Design Questions

**1. Module Icon Set**
- Q: What icons for new modules?
  - Plan: Target, Map, Compass?
  - Metrics: BarChart, TrendingUp, Activity?
  - Finance: DollarSign, CreditCard, PiggyBank?
  - Packs: Package, Archive, FolderOpen?
- A: TBD - Design review
- Impact: Low - aesthetic only
- Decision by: Sprint 1 start

**2. Navigation Structure**
- Q: Keep bottom nav or switch to sidebar for 12+ modules?
- A: TBD - Design decision
- Impact: Medium - affects mobile UX
- Decision by: Phase 1 start

**3. Empty States**
- Q: What to show when modules are empty?
  - Tutorial?
  - Quick start guide?
  - Video?
  - AI suggestion?
- A: TBD - Design review
- Impact: Medium - affects onboarding
- Decision by: Phase 1 start

**4. Hash Display Format**
- Q: Show full hash, truncated, or QR code?
- A: TBD - Design decision
- Impact: Low - UX preference
- Decision by: Sprint 2 start

**5. Approval UI Pattern**
- Q: Modal dialog or dedicated approval page?
- A: TBD - Design decision
- Impact: Low - UX preference
- Decision by: Sprint 2 start

### 11.4 Migration Questions

**1. Existing Tasks→Requests Conversion**
- Q: Auto-migrate or let users decide?
- A: TBD - Risk of data confusion
- Impact: High - affects user experience
- Decision by: Sprint 3 start

**2. Contacts Module Fate**
- Q: Deprecate, archive, or keep as-is?
- A: TBD - Check usage metrics
- Impact: Low if rarely used
- Decision by: Phase 0 end

**3. Reports→Summaries Data Migration**
- Q: Preserve all old reports or just recent?
- A: TBD - Check storage impact
- Impact: Low - can keep all
- Decision by: Sprint 2 start

**4. Feature Flag Granularity**
- Q: Single flag or per-module flags?
  - Single: `executive_layer_v2`
  - Granular: `metrics`, `finance`, `packs`, etc.
- A: TBD - Balance flexibility vs complexity
- Impact: Medium - affects rollout control
- Decision by: Phase 0 end

**5. Backward Compatibility Timeline**
- Q: How long to maintain route aliases?
  - 3 months?
  - 6 months?
  - Forever?
- A: TBD - Balance tech debt vs user disruption
- Impact: Low - can decide later
- Decision by: Full launch

---

## 12. Success Metrics

### 12.1 Adoption Metrics

**Feature Enablement:**
- Target: 80% of organizations enable executive_layer_v2 flag within 3 months
- Tracking: `organizations.settings.modules.executive_layer_v2 = true`

**Module Usage (per week):**
- Plan: ≥50% of orgs create ≥1 OKR or milestone update
- Metrics: ≥40% of orgs track ≥3 KPIs
- Finance: ≥60% of orgs enter ≥1 monthly snapshot
- Summary: ≥70% of orgs publish ≥1 summary
- Packs: ≥30% of orgs generate ≥1 board pack
- Requests: ≥40% of orgs create ≥1 request

**User Engagement:**
- Daily active users (DAU) increase by ≥20%
- Time in app increase by ≥30%
- Feature discovery rate >90% (users find new modules)

### 12.2 Quality Metrics

**Performance:**
- Page load time (95th percentile): <2.5s
- API response time (95th percentile): <500ms
- Hash generation time: <100ms
- PDF generation time: <5s

**Reliability:**
- Uptime: >99.9%
- Error rate: <0.1%
- Failed hash verifications: 0

**Data Integrity:**
- Zero data loss during migrations
- Zero cross-tenant data leaks
- 100% hash verification success rate

### 12.3 User Satisfaction Metrics

**NPS (Net Promoter Score):**
- Target: ≥40 overall
- Target: ≥50 for executive layer features

**Feature Satisfaction (1-5 scale):**
- Plan: ≥4.0
- Metrics: ≥4.0
- Finance: ≥4.2
- Summary: ≥4.5
- Packs: ≥4.3
- Portfolio: ≥4.4

**Support Metrics:**
- Support tickets related to new features: <5% of total
- Average resolution time: <24 hours
- Self-service resolution rate: >60%

### 12.4 Business Metrics

**Retention:**
- 30-day retention: >85%
- 90-day retention: >75%
- Churn rate: <5% per month

**Expansion:**
- Upgrade to Premium (for secrets): ≥20% of orgs
- Multi-vault adoption: ≥30% of users
- Referrals: ≥10% of new signups

**Time to Value:**
- Time to first published summary: <7 days
- Time to first board pack: <14 days
- Time to 10 active KPIs: <30 days

---

## Appendix A: API Endpoints

### New Endpoints Required

**Metrics Module:**
```
POST   /api/vaults/[vaultId]/kpis
GET    /api/vaults/[vaultId]/kpis
PATCH  /api/vaults/[vaultId]/kpis/[kpiId]
DELETE /api/vaults/[vaultId]/kpis/[kpiId]
POST   /api/vaults/[vaultId]/kpis/[kpiId]/measurements
GET    /api/vaults/[vaultId]/kpis/[kpiId]/measurements
```

**Finance Module:**
```
POST   /api/vaults/[vaultId]/financial-snapshots
GET    /api/vaults/[vaultId]/financial-snapshots
GET    /api/vaults/[vaultId]/financial-snapshots/[period]
PATCH  /api/vaults/[vaultId]/financial-snapshots/[id]
```

**Summary Module:**
```
POST   /api/vaults/[vaultId]/summaries
GET    /api/vaults/[vaultId]/summaries
POST   /api/vaults/[vaultId]/summaries/[id]/publish
POST   /api/vaults/[vaultId]/summaries/[id]/draft (AI-generated)
GET    /api/vaults/[vaultId]/summaries/[id]/verify-hash
```

**Packs Module:**
```
POST   /api/vaults/[vaultId]/packs
GET    /api/vaults/[vaultId]/packs
POST   /api/vaults/[vaultId]/packs/[id]/generate-pdf
GET    /api/vaults/[vaultId]/packs/[id]/download
POST   /api/vaults/[vaultId]/packs/[id]/publish
```

**Portfolio Module:**
```
GET    /api/portfolio/overview
GET    /api/portfolio/trends?metric=[kpi_name]&period=[days]
GET    /api/portfolio/deltas?type=[risk|milestone|decision]&since=[date]
POST   /api/portfolio/batch-pack
GET    /api/portfolio/alerts
PATCH  /api/portfolio/alerts/[id]/resolve
```

---

## Appendix B: Database Migration Files

### Migration Order

1. `20251018_create_okrs_table.sql`
2. `20251018_create_kpis_tables.sql`
3. `20251018_create_financial_snapshots.sql`
4. `20251018_create_board_packs.sql`
5. `20251018_create_decision_approvals.sql`
6. `20251018_create_document_sections.sql`
7. `20251018_create_document_qa.sql`
8. `20251018_create_portfolio_flags.sql`
9. `20251018_enhance_milestones.sql`
10. `20251018_enhance_risks.sql`
11. `20251018_enhance_decisions.sql`
12. `20251018_enhance_documents.sql`
13. `20251018_rename_reports_to_summaries.sql`
14. `20251018_rename_tasks_to_requests.sql`
15. `20251018_create_view_aliases.sql`
16. `20251018_add_realtime_publications.sql`

---

## Appendix C: Component Hierarchy

### New Components Structure

```
components/
├── metrics/
│   ├── kpi-card.tsx
│   ├── kpi-form.tsx
│   ├── measurement-entry.tsx
│   ├── kpi-chart.tsx
│   └── variance-indicator.tsx
├── finance/
│   ├── snapshot-form.tsx
│   ├── snapshot-card.tsx
│   ├── runway-calculator.tsx
│   └── trend-chart.tsx
├── summary/
│   ├── summary-editor.tsx
│   ├── summary-preview.tsx
│   ├── approval-dialog.tsx
│   ├── citation-list.tsx
│   └── hash-display.tsx
├── packs/
│   ├── pack-builder.tsx
│   ├── agenda-editor.tsx
│   ├── attendee-selector.tsx
│   ├── pdf-preview.tsx
│   └── watermark-config.tsx
├── requests/
│   ├── request-form.tsx
│   ├── request-card.tsx
│   ├── response-editor.tsx
│   └── approval-workflow.tsx
├── plan/
│   ├── okr-list.tsx
│   ├── okr-form.tsx
│   ├── milestone-timeline.tsx
│   └── profile-summary.tsx
├── portfolio/
│   ├── vault-tile.tsx
│   ├── status-indicator.tsx
│   ├── staleness-meter.tsx
│   ├── trend-chart.tsx
│   ├── delta-feed.tsx
│   └── batch-selector.tsx
└── immutability/
    ├── hash-verifier.tsx
    ├── signature-display.tsx
    └── integrity-badge.tsx
```

---

## Appendix D: AI Action Definitions

### New AI Actions

**Metrics:**
```typescript
useCopilotAction({
  name: "createKPI",
  description: "Create a new KPI to track",
  parameters: [
    { name: "name", type: "string", required: true },
    { name: "unit", type: "string", required: false },
    { name: "target", type: "number", required: false },
    { name: "cadence", type: "string", required: false }
  ],
  handler: async ({ name, unit, target, cadence }) => {
    if (!canEdit) return getCreatePermissionError("KPI", role);

    const { data, error } = await supabase
      .from('kpis')
      .insert({ org_id: currentOrg.id, name, unit, target, cadence, created_by: user.id })
      .select()
      .single();

    if (error) return getSupabaseErrorMessage(error);

    await logAgentAction('create', 'kpis', data.id, null, data);
    return `KPI "${name}" created successfully`;
  }
});

useCopilotAction({
  name: "recordKPIMeasurement",
  description: "Record a measurement for a KPI",
  parameters: [
    { name: "kpi_name", type: "string", required: true },
    { name: "value", type: "number", required: true },
    { name: "period", type: "string", required: true },
    { name: "variance_note", type: "string", required: false }
  ],
  handler: async ({ kpi_name, value, period, variance_note }) => {
    // ... implementation
  }
});
```

**Finance:**
```typescript
useCopilotAction({
  name: "updateFinancials",
  description: "Update monthly financial snapshot",
  parameters: [
    { name: "period", type: "string", required: true },
    { name: "arr", type: "number", required: false },
    { name: "revenue", type: "number", required: false },
    { name: "cash", type: "number", required: false },
    { name: "burn", type: "number", required: false },
    { name: "notes", type: "string", required: false }
  ],
  handler: async (params) => {
    // ... implementation
  }
});
```

**Summary:**
```typescript
useCopilotAction({
  name: "draftExecutiveSummary",
  description: "Generate an executive summary draft",
  parameters: [
    { name: "type", type: "string", required: true },
    { name: "period_start", type: "string", required: true },
    { name: "period_end", type: "string", required: true }
  ],
  handler: async ({ type, period_start, period_end }) => {
    // Gather data from past period
    const milestones = await fetchMilestones(period_start, period_end);
    const risks = await fetchRisks(period_start, period_end);
    const decisions = await fetchDecisions(period_start, period_end);
    const kpis = await fetchKPIMeasurements(period_start, period_end);

    // Generate summary with AI
    const summary = await generateSummaryContent({
      milestones, risks, decisions, kpis
    });

    // Create draft
    const { data, error } = await supabase
      .from('executive_summaries')
      .insert({
        org_id: currentOrg.id,
        type,
        period_start,
        period_end,
        content_markdown: summary.content,
        citations: summary.citations,
        created_by: user.id
      })
      .select()
      .single();

    if (error) return getSupabaseErrorMessage(error);

    return `Summary draft created. Review at /summary/${data.id}`;
  }
});
```

**Portfolio:**
```typescript
useCopilotAction({
  name: "generatePortfolioSummary",
  description: "Generate a summary across all vaults user has access to",
  parameters: [
    { name: "timeframe", type: "string", required: false }
  ],
  handler: async ({ timeframe = '30d' }) => {
    // ... implementation
  }
});
```

---

**End of Implementation Plan**

---

**Next Steps:**

1. Review this plan with stakeholders
2. Get approval on phased approach
3. Validate assumptions through user interviews
4. Create Sprint 1 tickets
5. Begin Phase 0 implementation
