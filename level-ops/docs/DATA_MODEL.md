# Level — Data Model

**Owner:** Engineering
**Last Updated:** 2025-10-05
**Status:** Living document (sync with migrations)

---

## 0) Purpose

Complete data model for Level's multi-tenant executive operations platform. Every table, enum, relation, and index documented here. This is the source of truth for schema design.

---

## 1) Schema Overview

```
auth.users (Supabase managed)
    ↓
profiles (1:1) ← Core user metadata
    ↓
org_memberships (M:N) → organizations (Tenants)
    ↓
├─ milestones (Org-scoped executive objects)
├─ risks
├─ decisions
├─ tasks
├─ executive_summaries
├─ documents → document_chunks (RAG)
├─ org_invitations
└─ audit_log (Append-only)
```

---

## 2) Tables

### 2.1 Core Identity

#### `profiles`

User profile data (extends `auth.users`)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Supabase Auth user ID |
| `email` | `text` | NOT NULL, UNIQUE | User email (synced from auth) |
| `first_name` | `text` | NULLABLE | User's first name |
| `last_name` | `text` | NULLABLE | User's last name |
| `phone` | `text` | NULLABLE | Contact phone |
| `avatar_url` | `text` | NULLABLE | Profile picture URL |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Account creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last profile update |

**Indexes:**
- Primary key on `user_id`
- Unique on `email`

**RLS:**
- SELECT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()`

**Triggers:**
- `on_auth_user_created` → Auto-create profile on signup

---

### 2.2 Multitenancy (Organizations)

#### `organizations`

Tenant/org container with branding

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Org identifier |
| `name` | `text` | NOT NULL | Organization name |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe slug |
| `logo_url` | `text` | NULLABLE | Logo image URL |
| `brand_color` | `text` | NULLABLE | Hex color code (#RRGGBB) |
| `domain` | `text` | NULLABLE, UNIQUE | Custom domain (e.g., acme.level.app) |
| `settings` | `jsonb` | DEFAULT `'{}'` | Org-level settings (modules, features) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Org creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Unique on `slug`
- Unique on `domain` (where NOT NULL)

**RLS:**
- SELECT: Member of org (via `org_memberships`)
- INSERT: Service role only
- UPDATE: `OWNER` or `ADMIN` role

---

#### `org_role` (ENUM)

```sql
CREATE TYPE org_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
```

- **OWNER:** Full control (manage members, settings, billing)
- **ADMIN:** Manage members + settings (cannot delete org)
- **EDITOR:** Create/edit executive objects
- **VIEWER:** Read-only access

---

#### `org_memberships`

User ↔ Organization many-to-many with role

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Organization |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE | User |
| `role` | `org_role` | NOT NULL, DEFAULT `'VIEWER'` | User's role in this org |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Membership start |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last role change |

**Indexes:**
- Primary key: `(org_id, user_id)`
- Index on `user_id` (for user's org list)
- Index on `org_id` (for org's member list)

**RLS:**
- SELECT (self): `user_id = auth.uid()`
- SELECT (admin): Member of org with `OWNER`/`ADMIN` role
- INSERT: `OWNER`/`ADMIN` of org OR service role
- UPDATE: `OWNER`/`ADMIN` of org
- DELETE: `OWNER`/`ADMIN` of org

**Triggers:**
- `trg_owner_persistence` → Prevent removing last OWNER

---

#### `org_invitations`

Pending invitations to join an org

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Invite ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Target org |
| `email` | `text` | NOT NULL | Invitee email |
| `role` | `org_role` | NOT NULL, DEFAULT `'VIEWER'` | Role upon acceptance |
| `token` | `text` | NOT NULL, UNIQUE | Secure random token |
| `expires_at` | `timestamptz` | NOT NULL | Expiry (typically now() + 7 days) |
| `accepted_at` | `timestamptz` | NULLABLE | Acceptance timestamp |
| `created_by` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Inviter user ID |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Invite creation |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `email`
- Unique on `token`

**RLS:**
- All operations: `OWNER`/`ADMIN` of org

**RPC:**
- `accept_org_invite(token)` → Validates token, creates membership

---

### 2.3 Executive Objects (Org-Scoped)

#### `milestones`

Executive-level goals and milestones

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Milestone ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `title` | `text` | NOT NULL | Milestone name |
| `description` | `text` | NULLABLE | Details |
| `owner_user_id` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Responsible person |
| `due_date` | `date` | NULLABLE | Target completion |
| `status` | `text` | NOT NULL, DEFAULT `'not-started'` | Status (enum-like) |
| `priority` | `text` | NULLABLE | Priority level |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Custom fields |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, status)` (for filtered lists)

**RLS:**
- SELECT: Member of org
- INSERT/UPDATE: `EDITOR+` role in org
- DELETE: `ADMIN+` role in org

---

#### `risks`

Risk register

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Risk ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `title` | `text` | NOT NULL | Risk description |
| `owner_user_id` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Responsible person |
| `probability` | `text` | NULLABLE | Likelihood (low/medium/high) |
| `impact` | `text` | NULLABLE | Severity |
| `mitigation` | `text` | NULLABLE | Mitigation plan |
| `status` | `text` | NOT NULL, DEFAULT `'open'` | Status (open/mitigated/closed) |
| `due_date` | `date` | NULLABLE | Mitigation deadline |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Custom fields |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, status)`

**RLS:**
- Same pattern as `milestones`

---

#### `decisions`

Decision log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Decision ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `title` | `text` | NOT NULL | Decision summary |
| `rationale` | `text` | NULLABLE | Why this decision |
| `approver_user_id` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Decision maker |
| `decision_date` | `date` | NOT NULL | When decided |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Custom fields |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Index on `org_id`

**RLS:**
- Same pattern as `milestones`

---

#### `tasks`

Operational tasks (optional module)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Task ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `title` | `text` | NOT NULL | Task name |
| `description` | `text` | NULLABLE | Details |
| `assignee_user_id` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Assigned to |
| `status` | `text` | NOT NULL, DEFAULT `'todo'` | Status |
| `priority` | `text` | NULLABLE | Priority |
| `due_date` | `date` | NULLABLE | Deadline |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Custom fields |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, status)`

**RLS:**
- Same pattern as `milestones`

---

#### `executive_summaries`

Generated summaries (weekly exec, board packs)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Summary ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `period_start` | `date` | NOT NULL | Reporting period start |
| `period_end` | `date` | NOT NULL | Reporting period end |
| `type` | `text` | NOT NULL | Type (weekly/monthly/board-pack) |
| `content` | `text` | NOT NULL | Generated summary text |
| `citations` | `jsonb` | DEFAULT `'[]'` | Source references |
| `snapshot_hash` | `text` | NULLABLE | SHA256 hash (for immutability) |
| `pdf_url` | `text` | NULLABLE | Storage path to PDF |
| `created_by` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Creator |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, type, period_end)` (for latest summary queries)

**RLS:**
- SELECT: Member of org
- INSERT: `EDITOR+` role (or agent on behalf of user)
- UPDATE: `ADMIN+` only (for corrections)
- DELETE: `ADMIN+` (or immutable if snapshot_hash exists)

---

#### `financial_analyses`

AI-powered financial document analysis results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Analysis ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `document_id` | `uuid` | FK → `documents(id)` ON DELETE CASCADE | Source document |
| `file_type` | `text` | NOT NULL, CHECK IN ('xlsx', 'xls', 'csv', 'pdf', 'other') | File format |
| `analysis_status` | `text` | NOT NULL, DEFAULT 'pending' | Status (pending/processing/completed/failed/review) |
| `raw_analysis` | `jsonb` | NOT NULL | Complete GPT-4 response |
| `confidence_score` | `numeric(3,2)` | NULLABLE | AI confidence (0.00-1.00) |
| `extracted_data` | `jsonb` | NULLABLE | Structured financial metrics |
| `ai_insights` | `text[]` | NULLABLE | Array of insight strings |
| `ai_recommendations` | `text[]` | NULLABLE | Array of recommendations |
| `detected_issues` | `text[]` | NULLABLE | Detected problems/warnings |
| `reviewed_by` | `uuid` | FK → `auth.users(id)` | Reviewer user ID |
| `reviewed_at` | `timestamptz` | NULLABLE | Review timestamp |
| `approved` | `boolean` | DEFAULT FALSE | Approval status |
| `snapshot_id` | `uuid` | FK → `financial_snapshots(id)` | Created snapshot (if approved) |
| `error_message` | `text` | NULLABLE | Error details if failed |
| `processing_time_ms` | `integer` | NULLABLE | Processing duration |
| `created_by` | `uuid` | FK → `auth.users(id)` | Uploader |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, analysis_status)` (filtered queries)
- Index on `(org_id, created_at DESC)` (recent analyses)

**RLS:**
- SELECT: Member of org
- INSERT: `EDITOR+` role in org
- UPDATE: `EDITOR+` role in org
- DELETE: N/A (analyses are retained for audit trail)

**Realtime:**
- Enabled via `supabase_realtime` publication

---

### 2.4 Documents & RAG

#### `documents`

File metadata

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Document ID |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE CASCADE | Owner org |
| `name` | `text` | NOT NULL | File name |
| `description` | `text` | NULLABLE | Description |
| `category` | `text` | DEFAULT `'general'` | Category (general/contract/proposal/report/spec/other) |
| `file_path` | `text` | NOT NULL | Storage path (orgs/{org_id}/...) |
| `file_size` | `bigint` | NULLABLE | File size in bytes |
| `mime_type` | `text` | NULLABLE | MIME type |
| `text_content` | `text` | NULLABLE | Extracted text (for RAG) |
| `uploaded_by` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Uploader |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Upload time |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, category)`

**RLS:**
- Same pattern as `milestones`

---

#### `document_chunks`

RAG chunks with embeddings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Chunk ID |
| `org_id` | `uuid` | NOT NULL (org-scoped) | Organization ID |
| `document_id` | `uuid` | FK → `documents(id)` ON DELETE CASCADE | Source document |
| `chunk_index` | `integer` | NOT NULL, CHECK `>= 0` | Position in document |
| `content` | `text` | NOT NULL, CHECK `length > 0` | Chunk text |
| `embedding` | `vector(1536)` | NULLABLE | OpenAI embedding |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Extra metadata |
| `page` | `integer` | NULLABLE | Source page number |
| `content_sha256` | `text` | NULLABLE, CHECK `length = 64` | Content hash (dedup) |
| `token_count` | `integer` | NULLABLE | Token count (for cost tracking) |
| `heading` | `text` | NULLABLE | Detected heading |
| `section_path` | `text` | NULLABLE | Document structure path |
| `lang` | `text` | NULLABLE | Language code (ISO 639-1) |
| `tsv` | `tsvector` | NULLABLE | Full-text search vector |
| `version` | `integer` | DEFAULT 1 | Chunk version (for re-embedding) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Creation |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- UNIQUE on `(document_id, chunk_index)`
- HNSW (partial) on `embedding` WHERE `embedding IS NOT NULL` (vector similarity)
- GIN on `tsv` (full-text search)
- B-tree on `(org_id, document_id, chunk_index)` (neighbor fetches)
- B-tree on `(org_id, content_sha256)` WHERE `content_sha256 IS NOT NULL` (dedup)

**RLS:**
- SELECT: `org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())`
- INSERT: Same + enforces org_id match
- UPDATE/DELETE: Same

**Triggers:**
- Auto-update `tsv` on INSERT/UPDATE

---

### 2.5 Audit & Activity

#### `audit_log`

Immutable audit trail (append-only)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `bigserial` | PK | Log entry ID |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE SET NULL | Actor |
| `org_id` | `uuid` | FK → `organizations(id)` ON DELETE SET NULL | Org context |
| `action` | `text` | NOT NULL | Action type (create/update/delete/agent_write) |
| `resource_table` | `text` | NULLABLE | Affected table |
| `resource_id` | `uuid` | NULLABLE | Affected record ID |
| `details` | `jsonb` | DEFAULT `'{}'` | Before/after snapshots (redacted) |
| `ip_address` | `inet` | NULLABLE | Request IP |
| `user_agent` | `text` | NULLABLE | Client user-agent |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT NOW() | Log time |

**Indexes:**
- Primary key on `id`
- Index on `org_id`
- Index on `(org_id, created_at)` (for recent activity queries)
- Index on `resource_id` (for object history)

**RLS:**
- SELECT: `ADMIN+` role in org
- INSERT: Service role or agent (not directly from client)
- UPDATE/DELETE: None (append-only)

---

## 3) Enums & Constants

### `org_role`
```sql
'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'
```

### Status Values (text fields, enum-like)

**milestone.status:**
- `'not-started'` `'in-progress'` `'completed'` `'blocked'` `'cancelled'`

**risk.status:**
- `'open'` `'mitigated'` `'closed'` `'monitoring'`

**task.status:**
- `'todo'` `'in-progress'` `'done'` `'cancelled'`

**executive_summary.type:**
- `'weekly'` `'monthly'` `'board-pack'` `'quarterly'` `'custom'`

**document.category:**
- `'general'` `'contract'` `'proposal'` `'report'` `'specification'` `'other'`

---

## 4) Relations Summary

```
profiles 1:N org_memberships N:1 organizations
organizations 1:N milestones
organizations 1:N risks
organizations 1:N decisions
organizations 1:N tasks
organizations 1:N executive_summaries
organizations 1:N documents
documents 1:N document_chunks
organizations 1:N org_invitations
organizations 1:N audit_log
```

---

## 5) Acceptance Criteria

- ✅ All tables documented with columns, constraints, indexes
- ✅ RLS policies summarized per table
- ✅ Foreign keys enforce referential integrity
- ✅ All org-scoped tables now use `org_id` consistently (migrated from tenant_id)
- ✅ Enums and status values documented
- ⏳ Migration files in sync with this doc (validate quarterly)

---

## 6) Related Docs

- **Architecture:** `docs/ARCHITECTURE.md`
- **Permissions:** `docs/PERMISSIONS_AND_ROLES.md`
- **Migrations:** `supabase/migrations/`
- **RLS Patterns:** `docs/PERMISSIONS_AND_ROLES.md` Section 6

---

**End of Document**

*This data model evolves with migrations. Always update this doc when schema changes.*
