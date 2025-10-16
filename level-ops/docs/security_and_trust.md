# Security & Trust Pack — Premium Features

**Owner:** Security & Compliance
**Last Updated:** 2025-10-06
**Status:** Customer-facing trust documentation

---

## 0) Purpose

This document consolidates Level's premium security features, compliance posture, and trust guarantees for enterprise customers, investors, and auditors.

---

## 1) Security Architecture Overview

### Defense-in-Depth Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Edge (DDoS, Rate Limiting)        │
│  Cloudflare / Vercel Edge Protection        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Layer 2: Application (Auth, Input Valid.)  │
│  Next.js Middleware + JWT Validation        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Layer 3: API (Pydantic, Role Checks)       │
│  FastAPI + CopilotKit Runtime               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Layer 4: Database (RLS, Policies)          │
│  Supabase Postgres with Row-Level Security  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Layer 5: Audit (Immutable Logs)            │
│  Append-only audit_log, snapshots with hash │
└─────────────────────────────────────────────┘
```

---

## 2) Row-Level Security (RLS)

### Principle: Deny-by-Default
**Every table has RLS enabled.** Postgres will **not** return cross-tenant data, even if the application tries.

**Example Policy (tasks table):**
```sql
CREATE POLICY "tenant_isolation" ON tasks
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM org_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

**Result:**
- User A (org_id=123) queries tasks → Sees only org 123 tasks
- User A tries `SELECT * FROM tasks WHERE org_id=456` → Returns **0 rows** (RLS blocks)

### RLS Testing
**Leakage Tests (Run in CI):**
```sql
-- Test 1: Cross-tenant read (should fail)
SET request.jwt.claims = '{"user_id": "user_A", "tenant_id": "tenant_A"}';
SELECT * FROM tasks WHERE org_id = 'tenant_B'; -- Returns 0 rows

-- Test 2: Unauthorized write (should fail)
SET request.jwt.claims = '{"user_id": "user_A", "role": "VIEWER"}';
INSERT INTO tasks (org_id, title) VALUES ('tenant_A', 'Test'); -- RLS error
```

**Acceptance:**
- ✅ 500+ leakage tests in CI (zero failures)
- ✅ Penetration testing (annual, third-party)
- ✅ No cross-tenant reads possible (proven in prod logs)

---

## 3) Immutable Audit Trail

### What's Logged
| Event | Data Captured | Retention |
|-------|---------------|-----------|
| **Auth events** | User login, logout, failed attempts | 90 days (Tier 1-2), 1 year (Tier 3-4) |
| **Agent writes** | Before/after snapshots (redacted PII) | Same |
| **Data modifications** | CREATE, UPDATE, DELETE with actor ID | Same |
| **Break-glass access** | Platform admin emergency access | Permanent |

**Example Log Entry:**
```json
{
  "id": "log_001",
  "timestamp": "2025-10-06T10:30:00Z",
  "user_id": "user_123",
  "org_id": "org_456",
  "action": "update",
  "resource_table": "milestones",
  "resource_id": "milestone_789",
  "details": {
    "before": {"status": "in-progress", "due_date": "2025-11-01"},
    "after": {"status": "completed", "due_date": "2025-10-30"}
  },
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0 ..."
}
```

### Immutable Snapshots (Board Packs)
**SHA256 Hash Verification:**
1. Board pack generated → PDF created
2. PDF content hashed: `sha256sum board-pack.pdf` → `abc123...`
3. Hash stored in `executive_summaries.snapshot_hash`
4. Hash printed on PDF footer

**Verification (by board member):**
```bash
# Recompute hash of delivered PDF
sha256sum board-pack-acme-2025-10.pdf
# Compare to hash in footer → If match, PDF is unmodified
```

**Acceptance:**
- ✅ All board packs have verifiable hashes
- ✅ Snapshots immutable (cannot edit after approval)

---

## 4) Data Sovereignty & Region Residency

### Dedicated Node (Premium Add-On)
**£2,500/month + £2,000 setup**

**Available Regions:**
| Region | Data Center | Compliance |
|--------|-------------|------------|
| **EU (Ireland)** | AWS eu-west-1 | GDPR |
| **EU (Frankfurt)** | AWS eu-central-1 | GDPR + German data sovereignty |
| **UK (London)** | AWS eu-west-2 | UK data residency |
| **US (N. Virginia)** | AWS us-east-1 | US-based customers |
| **US (Oregon)** | AWS us-west-2 | West Coast |
| **APAC (Singapore)** | AWS ap-southeast-1 | APAC customers |

**Guarantee:**
- **Data never leaves chosen region** (DB, storage, backups all co-located)
- **Processing happens in-region** (OpenAI API calls via regional endpoints where available)
- **DPA includes data location clause** (legally binding)

**Acceptance:**
- ✅ Supabase project provisioned in customer's region
- ✅ Storage bucket in same region
- ✅ DPA signed with data location clause

---

## 5) Compliance & Certifications

### Current Status (2025-10)
| Standard | Status | Notes |
|----------|--------|-------|
| **GDPR** | ✅ Compliant | DPA available, sub-processor list provided |
| **SOC 2 Type II** | 🔄 In Progress | Target: Q4 2025 |
| **ISO 27001** | 🔄 Planned | Target: Q2 2026 |
| **Penetration Testing** | ✅ Annual | Third-party (latest: 2025-09) |
| **Vulnerability Scanning** | ✅ Monthly | Snyk + npm audit |

### Data Processing Agreement (DPA)
**Includes:**
- Data controller: Customer
- Data processor: Level Ops Ltd
- Sub-processors: Supabase (DB/Auth), OpenAI (Embeddings/LLM), Vercel (Hosting)
- Data retention: Customer-controlled (export + delete within 30 days on request)
- Security measures: RLS, encryption at rest/in-transit, audit logs
- Breach notification: Within 72 hours (GDPR requirement)

**Available on request:** security@level.app

---

## 6) Backup & Disaster Recovery

### Backup Schedule
| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| **Point-in-Time Recovery (PITR)** | Every 1 hour | 7 days (Tier 1-3), 30 days (Tier 4) | Supabase managed |
| **Daily Full Backup** | Every 24 hours | 30 days | Supabase managed |
| **Manual Snapshots** | On-demand | 90 days | Customer-owned S3 (optional) |

### SLA Targets (Dedicated Node Only)
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | Supabase + Vercel monitoring |
| **RPO (Recovery Point Objective)** | 1 hour | PITR granularity |
| **RTO (Recovery Time Objective)** | 4 hours | Restore + verify time |

**SLA Credit Policy:**
- 99.9%-99.0%: 10% credit
- 99.0%-95.0%: 25% credit
- <95.0%: 50% credit

**Excluded Downtime:**
- Customer-initiated changes
- Scheduled maintenance (notified 7 days in advance)
- Force majeure (AWS/Supabase outages beyond our control)

---

## 7) SSO & Access Controls

### Supported Providers
| Provider | Tier | Setup Time | Cost |
|----------|------|------------|------|
| **Email/Password** | All tiers | Included | Free |
| **Google OAuth** | All tiers | Included | Free |
| **Microsoft OAuth** | All tiers | Included | Free |
| **SAML/Okta** | Tier 3+ | <48 hours | £500/month |
| **SCIM Provisioning** | Tier 4 | <1 week | £1,000/month |

### Multi-Factor Authentication (MFA)
**Available:** Tier 3+ (optional for Tier 1-2)
**Methods:**
- TOTP (Google Authenticator, Authy)
- SMS (via Twilio)
- Hardware keys (YubiKey, via WebAuthn)

**Enforcement:**
- Per-org policy (OWNER/ADMIN can require MFA for all users)
- Break-glass codes (10 one-time codes for recovery)

---

## 8) Encryption

### At-Rest
- **Database:** AES-256 (Supabase managed encryption)
- **Storage:** AES-256 (Supabase Storage encryption)
- **Backups:** AES-256 (encrypted before S3 upload)

### In-Transit
- **Client ↔ Server:** TLS 1.3 (A+ rating on SSLLabs)
- **Server ↔ Database:** TLS 1.2+ (Supabase connection)
- **Server ↔ OpenAI:** TLS 1.3

### Key Management
- **Service keys:** Rotated quarterly (automated via Vault)
- **JWT secrets:** Unique per customer (Dedicated Node)
- **Encryption keys:** AWS KMS (Dedicated Node, customer-managed keys available)

---

## 9) Incident Response

### Severity Levels
| Level | Definition | Response Time | Notification |
|-------|------------|---------------|--------------|
| **P1 (Critical)** | Data breach, RLS bypass, system down | 1 hour | Customer + regulators (if applicable) |
| **P2 (High)** | Auth bypass, privilege escalation | 4 hours | Customer |
| **P3 (Medium)** | XSS, information disclosure | 24 hours | Customer (if affected) |
| **P4 (Low)** | UI bugs, performance degradation | 72 hours | Internal only |

### Response Process
1. **Detect:** Automated alerts (Sentry, Supabase logs, Uptime Robot)
2. **Isolate:** Affected tenant(s) isolated (firewall rule, connection limit)
3. **Contain:** Patch vulnerability (hot-fix if needed)
4. **Notify:** Customer notified within SLA (72 hours for P1/P2 per GDPR)
5. **Post-Mortem:** Root cause analysis within 7 days (shared with Tier 4 customers)

**Recent Incidents (Public Log):**
- 2025-09-15: P3 (XSS in markdown rendering) → Patched <12 hours, no data accessed
- 2025-08-02: P4 (Realtime subscription lag) → Fixed <24 hours, no impact

**Acceptance:**
- ✅ 100% breach notification compliance (GDPR)
- ✅ Mean time to remediation (MTTR) <6 hours (P1)

---

## 10) Data Export & Deletion (Right to Erasure)

### Export Request
**Customer can request full data export anytime:**
```bash
# Via API (self-service for Tier 3+)
POST /api/export
{
  "org_id": "org_123",
  "format": "json" | "csv" | "postgres_dump"
}

# Delivered within 48 hours (encrypted archive)
```

**Export Includes:**
- All org-scoped data (milestones, risks, decisions, documents)
- Document chunks (RAG embeddings)
- Audit logs (last 90 days / 1 year depending on tier)
- User profiles (org members only)

### Deletion Request
**Customer can request permanent deletion:**
1. Submit request: `DELETE /api/orgs/{org_id}` (OWNER only)
2. 30-day grace period (data archived, not accessible)
3. After 30 days: Permanent deletion (cascading deletes)
4. Confirmation: `SELECT COUNT(*) FROM tasks WHERE org_id = 'org_123'` → 0 rows

**Acceptance:**
- ✅ Export delivered within 48 hours (tested quarterly)
- ✅ Deletion complete within 30 days (verified in prod logs)
- ✅ Right to erasure compliance (GDPR Art. 17)

---

## 11) Third-Party Sub-Processors

| Sub-Processor | Service | Data Processed | Location | DPA Available |
|---------------|---------|----------------|----------|---------------|
| **Supabase** | Database, Auth, Storage | All user data | Customer-chosen region | Yes |
| **OpenAI** | Embeddings, LLM | Document text, queries | US (opt-out of training) | Yes |
| **Vercel** | Hosting, Edge Functions | Metadata only (no PII) | Global (Edge) | Yes |
| **Stripe** | Billing | Payment info (tokenized) | US/EU | Yes |

**Customer Rights:**
- Object to sub-processor (30-day notice, can terminate contract)
- Request sub-processor audit reports (SOC 2, ISO 27001 where available)

---

## 12) Security Contact & Reporting

### Report a Vulnerability
**Email:** security@level.app
**PGP Key:** [Published on website]

**SLA:**
- Acknowledgment: <48 hours
- Updates: Every 72 hours until resolved
- Bounty: Up to £5,000 (for critical vulnerabilities)

### Security Team
| Role | Contact | Availability |
|------|---------|--------------|
| **Security Lead** | security-lead@level.app | Business hours |
| **On-Call Engineer** | +44 20 1234 5678 | 24/7 (P1 incidents) |
| **DPA/Compliance** | legal@level.app | Business hours |

---

## 13) Acceptance Criteria (Premium Trust Features)

### RLS & Isolation
- ✅ All tables have RLS enabled (100% coverage)
- ✅ Zero cross-tenant data leakage (500+ tests, zero failures)
- ✅ Penetration test passed (annual, third-party)

### Audit & Immutability
- ✅ All agent writes logged (before/after snapshots)
- ✅ Board pack snapshots have SHA256 hash (verifiable)
- ✅ Audit logs append-only (no DELETE policy)

### Region Residency (Dedicated Node)
- ✅ Customer data in chosen region (DB + Storage + Backups)
- ✅ DPA includes data location clause (signed)
- ✅ No cross-border data transfers (proven in network logs)

### Compliance
- ✅ GDPR compliant (DPA + sub-processor list + breach SLA)
- ✅ SOC 2 Type II in progress (target Q4 2025)
- ✅ Data export + deletion <30 days (tested quarterly)

### SLA (Dedicated Node)
- ✅ 99.9% uptime met (monthly report + credits if missed)
- ✅ RPO 1 hour / RTO 4 hours (tested via restore drills)
- ✅ 24/7 support for P1 incidents (response <1 hour)

---

## 14) Roadmap (Future Trust Features)

### Q4 2025
- **SOC 2 Type II certification** complete
- **SCIM provisioning** for enterprise SSO
- **Audit log export** (self-service API)

### Q2 2026
- **ISO 27001 certification** complete
- **Customer-managed encryption keys** (BYOK via AWS KMS)
- **Federated queries** (read-only investor access to portfolio data)

### Q4 2026
- **HIPAA compliance** (for healthcare portfolio companies)
- **Air-gapped deployment** (on-premises option for highly regulated industries)

---

**End of Document**

*Update quarterly with latest compliance status, incident reports, and roadmap progress. Share with enterprise customers during security reviews.*
