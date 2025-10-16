# Pilot Onboarding Runbook

**Owner:** Customer Success
**Last Updated:** 2025-10-06
**Status:** Operational guide for pilot customers

---

## 0) Purpose

This runbook guides the onboarding process for pilot customers from initial setup to successful board pack generation. Designed for founders/C-suite and investors testing Level before full deployment.

---

## 1) Pilot Success Criteria

### Exit Criteria (4-week pilot)
- ✅ 3 on-time weekly executive summaries delivered
- ✅ 1 approved board pack generated (branded PDF with snapshot hash)
- ✅ ≥80% risks have assigned owner + due date
- ✅ Sponsor NPS ≥8/10
- ✅ Zero cross-tenant data leakage incidents
- ✅ RLS policy tests passing in CI

### Quality Metrics
- Weekly exec generated in <10 minutes (founder time)
- Agent retrieval p95 <500ms
- Draft render p95 <2.5s (without re-rank)
- All agent writes captured in audit log

---

## 2) Pre-Pilot Setup (48 hours before kickoff)

### 2.1 Provision Tenant

**Owner:** Platform Admin (service role)

```bash
# Create organization via service role
supabase rpc create_organization '{
  "name": "Acme Corp",
  "slug": "acme",
  "logo_url": "https://storage.level.app/logos/acme.png",
  "brand_color": "#0052CC"
}'

# Seed initial OWNER membership
supabase rpc create_membership '{
  "org_id": "<org_uuid>",
  "user_email": "founder@acme.com",
  "role": "OWNER"
}'
```

**Acceptance:**
- [ ] Org created with unique slug
- [ ] Brand color meets WCAG AA contrast (use contrast checker)
- [ ] Custom subdomain configured (acme.level.app)
- [ ] Initial OWNER invited via email magic link

### 2.2 Configure SSO (Optional)

For pilots requiring Google/Microsoft OAuth:

```bash
# Enable OAuth provider in Supabase Auth
# Dashboard → Authentication → Providers → Google/Microsoft
# Add redirect URL: https://acme.level.app/auth/callback
```

**Acceptance:**
- [ ] OAuth flow tested end-to-end
- [ ] Email domain restriction applied (if requested)

### 2.3 Seed Sample Data (Optional)

For pilots without existing data:

```sql
-- 5 sample milestones
INSERT INTO milestones (org_id, title, owner_user_id, due_date, status)
VALUES
  ('<org_uuid>', 'Launch MVP', '<user_uuid>', '2025-11-01', 'in-progress'),
  ('<org_uuid>', 'Hire CTO', '<user_uuid>', '2025-10-15', 'not-started'),
  ...;

-- 3 sample risks
INSERT INTO risks (org_id, title, probability, impact, status)
VALUES
  ('<org_uuid>', 'Runway <6 months', 'medium', 'high', 'open'),
  ...;
```

**Acceptance:**
- [ ] Sample data visible in dashboard
- [ ] No RLS errors when viewing/editing

---

## 3) Week 1: Onboarding & First Exec

### Day 1 — Kickoff Call (30 min)

**Agenda:**
1. Product demo (8 min): Portfolio Console → Add risk → Agent drafts exec → Show branded PDF → Request/fulfil flow → Security slide (RLS + audit)
2. Premium positioning: "Private jet for exec ops" — clarity, speed, trust
3. ICP validation: Founders/C-suite or investors (angels/family offices/PE/VC)
4. Set weekly cadence: Fridays 4pm for exec review

**Deliverables:**
- [ ] Pilot sponsor identified
- [ ] Weekly meeting scheduled (recurring)
- [ ] Access credentials sent (magic link or OAuth)

### Days 2-3 — Data Import

**Guided by CSM:**
1. Upload key documents (board decks, strategy docs, financials)
2. Add 5-10 milestones (current quarter OKRs)
3. Add 3-5 risks (top concerns)
4. Add 2-3 decisions (recent approvals)

**Tooling:**
- Document upload triggers RAG ingestion webhook → FastAPI /ingest
- Show progress bar: "Processing... 3/5 documents embedded"
- Verify retrieval: "Search for 'Q1 revenue'" in CopilotChat

**Acceptance:**
- [ ] ≥3 documents embedded (confirmed in document_chunks table)
- [ ] Agent can cite sources when queried
- [ ] All milestones/risks have owners assigned

### Days 4-5 — First Weekly Exec

**Founder-led:**
1. Navigate to Dashboard → "Generate Weekly Exec" (CopilotKit action)
2. Agent queries recent milestones/risks + RAG context
3. Review preview, approve
4. System generates branded PDF + email
5. Immutable snapshot created (SHA256 hash recorded)

**CSM monitors:**
- Latency: retrieval + draft render within SLA
- Citations: ≥1 document cited per exec
- Audit log: agent write captured

**Acceptance:**
- [ ] First exec approved & sent (branded email + PDF)
- [ ] Snapshot hash verified (match PDF content)
- [ ] Sponsor feedback: NPS ≥7/10

---

## 4) Week 2: Requests & Investor Flow

### Investor Request Simulation

**Setup:**
1. CSM invites "investor" test user (VIEWER role)
2. Investor logs in → Portfolio Console → selects org
3. Investor creates Request: "Need Q1 cashflow projection"
4. Founder receives notification (Realtime subscription)

**Fulfillment:**
1. Founder clicks "Fulfil with Agent"
2. Agent searches documents via RAG ("Q1 cashflow")
3. Drafts response with citations
4. Founder approves → Request status=fulfilled, snapshot attached
5. Investor receives notification → views response

**Acceptance:**
- [ ] Request/response cycle <10 min
- [ ] Investor confirms trust in cited sources
- [ ] Audit log shows before/after snapshots

### Refine Branding

**Founder-led:**
1. Settings → Branding → Update logo/color
2. Generate new weekly exec
3. Verify PDF reflects branding changes

**Acceptance:**
- [ ] Logo appears on PDF header
- [ ] Brand color applied to headings/accents
- [ ] Contrast ratio validated (WCAG AA)

---

## 5) Week 3: Board Pack Generation

### Milestone Review

**Guided by CSM:**
1. Review all milestones: update statuses, add blockers
2. Review all risks: assign owners, set due dates (target ≥80%)
3. Add 1-2 decisions (recent approvals, pivots)

**Acceptance:**
- [ ] ≥80% milestones have status updates
- [ ] ≥80% risks have owner + due date
- [ ] ≥2 decisions logged

### Generate Board Pack

**Founder-led:**
1. Dashboard → "Generate Board Pack" (CopilotKit action)
2. Agent compiles:
   - Executive summary (period: last 30 days)
   - Milestone progress (completed, on-track, at-risk)
   - Risk register (top 5 by impact)
   - Decision log (last 30 days)
   - Financial snapshot (manual fields for v1)
   - Citations (source documents)
3. Review preview → Approve
4. System generates branded PDF with:
   - Org logo + colors
   - SHA256 hash footer
   - Timestamp + version
5. PDF stored in Supabase Storage (org-scoped path)

**Acceptance:**
- [ ] Board pack PDF generated <3 min
- [ ] All sections populated (no placeholders)
- [ ] Snapshot hash verifiable (rehash PDF → matches footer)
- [ ] Sponsor confirms: "Ready to share with board"

---

## 6) Week 4: Polish & Handoff

### Performance Validation

**CSM runs diagnostics:**
```bash
# Check RAG retrieval latency (p95)
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
FROM audit_log WHERE action = 'rag_query' AND org_id = '<org_uuid>';

# Verify RLS isolation (leakage test)
# As tenant A user, attempt to SELECT tenant B data → should fail
```

**Acceptance:**
- [ ] Retrieval p95 <500ms
- [ ] RLS leakage tests pass (zero cross-tenant reads)

### Exit Survey

**Sponsor completes:**
1. NPS: "How likely to recommend Level?" (0-10 scale)
2. Open feedback: "What would make this a 10?"
3. Conversion intent: "Ready to commit to annual plan?"

**CSM reviews:**
- If NPS ≥8 → Proceed to commercial discussion
- If NPS <8 → Schedule founder feedback call, iterate

**Acceptance:**
- [ ] Sponsor NPS ≥8/10
- [ ] All exit criteria met (3 execs, 1 board pack, 80% risks)
- [ ] Commercial proposal sent (or pilot extended 2 weeks)

---

## 7) Post-Pilot: Conversion or Offboarding

### Convert to Paid

**CSM delivers:**
1. Pricing proposal:
   - Founder Portfolio: £149/user/mo (≤5 companies)
   - Company Plan: £499/tenant/mo
   - Investor Studio: £999/org/mo (≤25 companies)
2. Optional add-ons:
   - Dedicated Node: £2,500/mo + £2,000 setup (region residency, SLA)
   - SSO (SAML/Okta): £500/mo
   - API connectors: £200/connector/mo
3. Contractual docs:
   - MSA (Master Service Agreement)
   - DPA (Data Processing Agreement)
   - SLA (if Dedicated Node)
4. Provisioning:
   - Migrate pilot tenant to production environment
   - Configure billing via Stripe
   - Enable advanced features (workflow automation, portfolio filters)

**Acceptance:**
- [ ] Signed contract received
- [ ] First invoice sent
- [ ] Pilot data migrated without loss

### Offboard (No Conversion)

**CSM actions:**
1. Export tenant data:
   ```bash
   # Full data export (JSON)
   supabase rpc export_tenant_data '{"org_id": "<org_uuid>"}'
   ```
2. Deliver export to sponsor (encrypted archive)
3. Schedule tenant deletion (30 days post-pilot end)
4. Send exit survey: "What would change your decision?"

**Acceptance:**
- [ ] Data export delivered within 48 hours
- [ ] Tenant marked for deletion (grace period: 30 days)
- [ ] Exit survey completed

---

## 8) Troubleshooting

### Issue: Agent retrieval returns no results

**Diagnosis:**
```sql
-- Check if document_chunks exist for tenant
SELECT COUNT(*) FROM document_chunks WHERE tenant_id = '<org_uuid>';

-- Verify embeddings populated
SELECT COUNT(*) FROM document_chunks
WHERE tenant_id = '<org_uuid>' AND embedding IS NOT NULL;
```

**Fix:**
- If chunks missing → Re-trigger ingestion webhook
- If embeddings NULL → Check FastAPI logs, OpenAI API key validity
- If RLS blocking → Verify JWT tenant_id claim matches org

### Issue: Branded PDF missing logo

**Diagnosis:**
- Check logo_url in organizations table
- Verify URL is publicly accessible (signed URL if in Storage)

**Fix:**
```sql
-- Update logo URL
UPDATE organizations SET logo_url = '<valid_url>' WHERE id = '<org_uuid>';
```

### Issue: Weekly exec generation fails

**Diagnosis:**
- Check audit_log for errors: `SELECT * FROM audit_log WHERE action = 'generate_exec' AND org_id = '<org_uuid>' ORDER BY created_at DESC LIMIT 5;`
- Common causes: Missing milestones/risks, RAG timeout, LLM API error

**Fix:**
- Ensure ≥1 milestone or risk exists
- Check OpenAI API status, retry
- Fallback: Manual exec template + agent refinement

---

## 9) Key Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| CSM Lead | sarah@level.app | For pilot blockers |
| Platform Support | support@level.app | For technical issues |
| Security Inquiries | security@level.app | For RLS/DPA questions |
| Founder (Dan) | dan@level.app | For product feedback |

---

## 10) Appendix: Weekly Checklist

**CSM uses this for each pilot:**

- [ ] **Pre-pilot:** Org provisioned, brand configured, OWNER invited
- [ ] **Week 1:** Kickoff call, data import, first exec approved
- [ ] **Week 2:** Investor request/response, branding refined
- [ ] **Week 3:** Board pack generated, snapshot verified
- [ ] **Week 4:** Exit survey (NPS ≥8), commercial proposal
- [ ] **Post-pilot:** Conversion or offboarding completed

**Success = All boxes checked + NPS ≥8 + Signed contract**

---

**End of Runbook**

*Update this doc as pilot process evolves. Review quarterly with CSM team.*
