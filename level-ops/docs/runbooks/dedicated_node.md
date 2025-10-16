# Dedicated Node Setup Runbook

**Owner:** Platform Operations
**Last Updated:** 2025-10-06
**Status:** Premium add-on provisioning guide

---

## 0) Purpose

This runbook guides the provisioning of a Dedicated Node for enterprise customers requiring region residency, enhanced SLAs, and isolated infrastructure. Premium tier: **£2,500/month + £2,000 setup fee**.

---

## 1) Prerequisites

### Commercial
- [ ] Signed Enterprise Agreement (MSA)
- [ ] Data Processing Agreement (DPA) executed
- [ ] Payment confirmed (setup fee + first month)
- [ ] Customer designated technical contact

### Technical Discovery
- [ ] Preferred region confirmed (EU/UK/US)
- [ ] Expected data volume (docs, users, orgs)
- [ ] Uptime SLA requirement (99.9% baseline)
- [ ] Backup/DR requirements (RPO/RTO)
- [ ] Custom domain(s) provided
- [ ] SSO requirements (SAML/Okta/Google/Microsoft)

---

## 2) Region Options

### Available Regions

| Region | Supabase Location | Latency (London) | Data Residency |
|--------|-------------------|------------------|----------------|
| **EU (Ireland)** | eu-west-1 | ~10ms | GDPR-compliant, EU data stays in EU |
| **EU (Frankfurt)** | eu-central-1 | ~15ms | Germany data sovereignty |
| **UK (London)** | eu-west-2 | ~5ms | UK-only data residency |
| **US (N. Virginia)** | us-east-1 | ~80ms | US-based customers |
| **US (Oregon)** | us-west-2 | ~120ms | West Coast customers |
| **APAC (Singapore)** | ap-southeast-1 | ~180ms | APAC-based customers |

**Selection Criteria:**
- **Data residency law:** EU customers → EU region (GDPR)
- **Latency:** Closest region to primary user base
- **Cost:** All regions same price for this tier

**Acceptance:**
- [ ] Region selected and documented in customer record
- [ ] Region confirmed in DPA (data processing location clause)

---

## 3) Provisioning Steps

### 3.1 Supabase Project Creation

**Owner:** Platform Admin

```bash
# Create new Supabase project (via CLI or Dashboard)
supabase projects create \
  --org-id <supabase_org_id> \
  --name "Level - Acme Corp (Dedicated)" \
  --region eu-west-1 \
  --plan pro \
  --db-pass <secure_random_password>

# Note project ref for later: <project_ref>
```

**Configuration:**
- Plan: **Pro** (minimum for dedicated nodes)
- Database: Postgres 15+ with pgvector extension
- Compute: **XL instance** (4 vCPU, 8GB RAM) — baseline for dedicated
- Storage: **100GB** (expandable)
- Backups: **Point-in-time recovery** enabled (7-day retention)

**Acceptance:**
- [ ] Project created in customer's designated region
- [ ] Database credentials securely stored (1Password/Vault)
- [ ] Connection string tested from staging environment

### 3.2 Database Schema Migration

**Owner:** Platform Engineer

```bash
# Clone production migrations (tenant-isolated version)
cd level-ops
supabase db reset --db-url postgresql://<project_ref>

# Apply all migrations in order
supabase db push --db-url postgresql://<project_ref>

# Verify schema
psql postgresql://<project_ref> -c "\dt" # List tables
psql postgresql://<project_ref> -c "SELECT * FROM pg_extension WHERE extname = 'vector';" # Verify pgvector
```

**Critical Tables:**
- profiles, organizations, org_memberships, org_invitations
- milestones, risks, decisions, tasks, executive_summaries
- documents, document_chunks (with vector indexes)
- audit_log

**Acceptance:**
- [ ] All migrations applied successfully (zero errors)
- [ ] RLS policies enabled on all tables
- [ ] Indexes created (HNSW for vectors, GIN for tsvector)
- [ ] pgvector extension active

### 3.3 Storage Bucket Setup

```bash
# Create tenant-scoped storage bucket
supabase storage bucket create orgs \
  --public false \
  --file-size-limit 52428800 # 50MB limit

# Apply RLS policies to storage
supabase storage policy create orgs "Tenant isolation" \
  --for select \
  --using "bucket_id = 'orgs' AND (storage.foldername(name))[1] = auth.jwt()->>'tenant_id'"
```

**Acceptance:**
- [ ] `orgs` bucket created
- [ ] RLS enforced (users can only access their tenant's folder)
- [ ] File size limit configured (default: 50MB, customizable)

### 3.4 Auth Configuration

**Owner:** Platform Admin (via Supabase Dashboard)

**Steps:**
1. Navigate to Authentication → Providers
2. Enable required providers:
   - **Email/Password** (baseline)
   - **Google OAuth** (if requested)
   - **Microsoft OAuth** (if requested)
   - **SAML/Okta** (enterprise add-on)
3. Configure redirect URLs:
   - `https://<custom_domain>/auth/callback`
   - `https://<custom_domain>.level.app/auth/callback`
4. Set JWT expiry: **7 days** (configurable)
5. Enable MFA (optional, enterprise add-on)

**Acceptance:**
- [ ] All auth providers tested end-to-end
- [ ] Redirect URLs whitelisted
- [ ] JWT secret rotated (unique per customer)

### 3.5 Environment Variables

**Owner:** DevOps

Deploy customer-specific environment to Vercel/hosting:

```bash
# .env.production (Dedicated Node)
NEXT_PUBLIC_SUPABASE_URL=https://<project_ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_KEY=<service_key> # Server-only
OPENAI_API_KEY=<openai_key> # Customer-specific (optional)
FASTAPI_URL=https://api-acme.level.app # Dedicated FastAPI instance
CUSTOM_DOMAIN=acme.level.app
```

**Acceptance:**
- [ ] All secrets stored in secure vault
- [ ] Environment deployed to production (isolated subdomain)
- [ ] Health check passes: `curl https://acme.level.app/api/health`

---

## 4) Network & Custom Domain

### 4.1 DNS Configuration

**Customer provides:**
- Primary domain: `acme.level.app` (CNAME to Vercel)
- Custom domain (optional): `ops.acme.com` (CNAME to Vercel)

**Level configures:**
```bash
# Vercel custom domain setup
vercel domains add acme.level.app --project level-dedicated-acme
vercel domains add ops.acme.com --project level-dedicated-acme

# SSL certificate auto-provisioned (Let's Encrypt)
```

**Acceptance:**
- [ ] DNS propagation confirmed (<24 hours)
- [ ] SSL certificate active (A+ rating on SSLLabs)
- [ ] Both domains resolve to customer's isolated instance

### 4.2 Firewall & IP Whitelisting (Optional)

For customers requiring IP restrictions:

```sql
-- Supabase: Create IP whitelist policy
CREATE POLICY "ip_whitelist" ON auth.users
FOR ALL USING (
  inet_client_addr() <<= ANY(ARRAY[
    '203.0.113.0/24'::inet,  -- Customer office
    '198.51.100.0/24'::inet  -- Customer VPN
  ])
);
```

**Acceptance:**
- [ ] IP whitelist configured and tested
- [ ] Access from non-whitelisted IPs blocked
- [ ] Emergency break-glass procedure documented

---

## 5) Backup & Disaster Recovery

### 5.1 Backup Schedule

**Supabase Automatic Backups:**
- **Point-in-time recovery (PITR):** 7-day retention (Pro plan)
- **Daily full backups:** Retained 30 days
- **Manual snapshots:** On-demand (before major releases)

**Custom Backup Script:**
```bash
# Daily backup to S3 (customer-owned bucket)
pg_dump postgresql://<project_ref> | gzip > backup-$(date +%Y%m%d).sql.gz
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://acme-level-backups/
```

**Acceptance:**
- [ ] Automated daily backups confirmed (check Supabase dashboard)
- [ ] Manual snapshot tested (restore to staging)
- [ ] Customer S3 bucket configured (if requested)

### 5.2 SLA Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | Supabase status + Vercel monitoring |
| **RPO (Recovery Point Objective)** | 1 hour | PITR every 1 hour |
| **RTO (Recovery Timeframe Objective)** | 4 hours | Restore + verify <4 hours |
| **Support Response (P1)** | 1 hour | 24/7 on-call engineer |
| **Support Response (P2)** | 4 hours | Business hours |

**Monitoring:**
- Uptime Robot: https://acme.level.app/api/health (5-min intervals)
- Supabase Dashboard: Real-time alerts for downtime
- PagerDuty: On-call rotation for P1 incidents

**Acceptance:**
- [ ] SLA targets documented in customer agreement
- [ ] Monitoring alerts configured (Slack + PagerDuty)
- [ ] Quarterly SLA reports automated

---

## 6) Security Hardening

### 6.1 RLS Verification

**Run leakage tests:**
```sql
-- Test 1: Cross-tenant read (should fail)
SET request.jwt.claims = '{"tenant_id": "tenant_A"}';
SELECT * FROM tasks WHERE tenant_id = 'tenant_B'; -- Should return 0 rows

-- Test 2: Unauthorized write (should fail)
SET request.jwt.claims = '{"tenant_id": "tenant_A", "role": "viewer"}';
INSERT INTO tasks (tenant_id, title) VALUES ('tenant_A', 'Test'); -- Should error
```

**Acceptance:**
- [ ] All cross-tenant queries return zero rows
- [ ] Unauthorized writes blocked by RLS
- [ ] Leakage test results stored in audit_log

### 6.2 Audit Log Configuration

```sql
-- Enable audit trail for all org-scoped writes
CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, org_id, action, resource_table, resource_id, details)
  VALUES (
    auth.uid(),
    COALESCE(NEW.org_id, OLD.org_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all org-scoped tables
CREATE TRIGGER audit_milestones AFTER INSERT OR UPDATE OR DELETE ON milestones
FOR EACH ROW EXECUTE FUNCTION log_audit_entry();
-- (Repeat for risks, decisions, tasks, etc.)
```

**Acceptance:**
- [ ] Audit triggers active on all tables
- [ ] Sample writes logged (verify in audit_log)
- [ ] PII redacted in log details (mask emails, phone numbers)

### 6.3 DPA & Sub-Processors

**Customer receives:**
1. **Data Processing Agreement (DPA)**
   - Data controller: Customer
   - Data processor: Level Ops Ltd
   - Sub-processors: Supabase (DB/Auth), OpenAI (Embeddings/LLM), Vercel (Hosting)
   - Data location: Customer's chosen region
   - Retention: Customer-controlled (export + delete within 30 days on request)

2. **Security Questionnaire Responses**
   - ISO 27001 status: In progress (target Q2 2025)
   - SOC 2 Type II: Planned (target Q4 2025)
   - Penetration testing: Annual (third-party)
   - Vulnerability scanning: Monthly (Snyk + npm audit)

**Acceptance:**
- [ ] DPA signed by both parties
- [ ] Sub-processor list provided and approved
- [ ] Data flow diagram shared (user → Vercel → Supabase → OpenAI)

---

## 7) Go-Live Checklist

### 7.1 Pre-Launch (T-7 days)

- [ ] Database schema validated (all migrations applied)
- [ ] RLS policies tested (zero leakage)
- [ ] Backups scheduled and verified
- [ ] Custom domain(s) active with SSL
- [ ] Auth providers tested (Google/Microsoft/SAML)
- [ ] Monitoring alerts configured (Uptime Robot + PagerDuty)
- [ ] Audit log triggers active

### 7.2 Launch Day (T-0)

- [ ] Customer OWNER user invited (magic link or OAuth)
- [ ] Initial org provisioned (branding applied)
- [ ] Sample data imported (if requested)
- [ ] Customer completes first login successfully
- [ ] Weekly exec generated (smoke test)
- [ ] Support team notified (24/7 coverage active)

### 7.3 Post-Launch (T+7 days)

- [ ] Customer CSM conducts check-in call
- [ ] Performance metrics reviewed (latency, uptime)
- [ ] First invoice sent (£2,500/mo recurring)
- [ ] Knowledge base access granted (dedicated customer portal)
- [ ] Quarterly business review scheduled (QBR)

**Acceptance:**
- [ ] All checklist items completed
- [ ] Customer confirms: "Dedicated Node operational and meeting SLA"
- [ ] Platform team: "Zero P1 incidents in first 7 days"

---

## 8) Ongoing Operations

### 8.1 Monthly Maintenance

**Platform Operations tasks:**
- Review uptime reports (must meet 99.9% SLA)
- Apply security patches (Supabase + Vercel auto-update)
- Rotate service keys (quarterly)
- Audit log cleanup (archive logs >90 days to S3)
- Capacity review (CPU/RAM/Storage usage trends)

**Acceptance:**
- [ ] Monthly ops report sent to customer (uptime, incidents, capacity)
- [ ] SLA met or credit issued (1% credit per 0.1% downtime below 99.9%)

### 8.2 Scaling Guidelines

| Trigger | Action |
|---------|--------|
| CPU >70% sustained | Upgrade to 2XL instance (8 vCPU, 16GB RAM) |
| Storage >80% | Expand to 200GB (£50/mo incremental) |
| >10k documents/tenant | Enable table partitioning by org_id |
| >100 concurrent users/org | Add read replica (£500/mo) |

**Acceptance:**
- [ ] Scaling thresholds monitored (automated alerts)
- [ ] Customer notified 7 days before scaling action
- [ ] Scaling executed during maintenance window (Sunday 2-4am UTC)

---

## 9) Offboarding & Data Export

### 9.1 Cancellation Request

**Customer provides:**
- 30-day notice (per MSA)
- Data export format preference (JSON, CSV, or full Postgres dump)
- Deletion confirmation (or retention request)

**Level delivers:**
```bash
# Full tenant export (all tables)
pg_dump postgresql://<project_ref> \
  --schema=public \
  --data-only \
  --table=organizations \
  --table=milestones \
  --table=risks \
  ... > acme-export-$(date +%Y%m%d).sql

# Encrypt and deliver
gpg --encrypt --recipient customer@acme.com acme-export.sql
aws s3 cp acme-export.sql.gpg s3://customer-handoff/
```

**Acceptance:**
- [ ] Data export delivered within 7 days
- [ ] Customer confirms receipt and completeness
- [ ] Deletion scheduled (30 days post-cancellation)

### 9.2 Data Deletion

**Final steps:**
```bash
# Delete all org-scoped data
DELETE FROM org_memberships WHERE org_id = '<org_uuid>';
DELETE FROM documents WHERE org_id = '<org_uuid>';
DELETE FROM document_chunks WHERE tenant_id = '<org_uuid>';
DELETE FROM organizations WHERE id = '<org_uuid>';
-- (Cascading deletes handle child tables)

# Verify deletion
SELECT COUNT(*) FROM audit_log WHERE org_id = '<org_uuid>'; -- Should be 0

# Archive audit logs (90-day retention post-deletion)
aws s3 cp audit-logs-<org_uuid>.json s3://level-audit-archive/
```

**Acceptance:**
- [ ] All customer data deleted (verified by query)
- [ ] Audit logs archived (encrypted S3)
- [ ] Supabase project deprovisioned (or reassigned)
- [ ] Final invoice sent (prorated to cancellation date)

---

## 10) Troubleshooting

### Issue: Database performance degradation

**Diagnosis:**
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0; -- Unused indexes
```

**Fix:**
- Add missing indexes (e.g., `CREATE INDEX idx_tasks_org_status ON tasks(org_id, status);`)
- Upgrade compute tier (XL → 2XL)
- Enable connection pooling (PgBouncer)

### Issue: Backup restore fails

**Diagnosis:**
- Check PITR logs in Supabase Dashboard
- Verify backup integrity: `pg_restore --list backup.sql`

**Fix:**
- Restore to staging first (validate schema compatibility)
- If schema mismatch → apply missing migrations
- Escalate to Supabase support if data corruption detected

### Issue: Custom domain SSL error

**Diagnosis:**
- Check DNS propagation: `dig acme.level.app`
- Verify CNAME record points to Vercel

**Fix:**
```bash
# Re-provision SSL via Vercel
vercel certs renew acme.level.app
```

---

## 11) Key Contacts

| Role | Contact | Escalation Path |
|------|---------|----------------|
| **Platform Operations** | ops@level.app | For provisioning/scaling |
| **Security** | security@level.app | For RLS/DPA issues |
| **Customer Success** | success@level.app | For onboarding/QBRs |
| **24/7 Support (P1)** | +44 20 1234 5678 | PagerDuty on-call |

---

## 12) Appendix: Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| **Setup Fee** | £2,000 | One-time (includes provisioning + migration) |
| **Monthly Base** | £2,500 | XL instance + 100GB storage + Pro plan |
| **Optional Add-ons** | | |
| - SSO (SAML/Okta) | £500/mo | Enterprise auth |
| - Read Replica | £500/mo | High concurrency (>100 users) |
| - Extra Storage (+100GB) | £50/mo | Per 100GB block |
| - API Connectors | £200/mo | Per connector (Jira, Salesforce, etc.) |
| **Total (Baseline)** | £2,500/mo | Post-setup, no add-ons |

**Acceptance:**
- [ ] Customer invoiced correctly (setup + first month)
- [ ] Add-ons provisioned only when purchased
- [ ] Annual prepay discount applied (if requested): 10% off

---

**End of Runbook**

*Review quarterly with Ops team. Update as infrastructure evolves (new regions, features, SLA changes).*
