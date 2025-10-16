# Level — Positioning & Pricing

**Owner:** GTM (Sales & Marketing)
**Last Updated:** 2025-10-06
**Status:** Source of truth for sales materials

---

## 0) Purpose

This document defines Level's premium positioning, pricing tiers, guardrails, and ROI narrative for founders, investors, and enterprise customers.

---

## 1) Positioning Statement

### One-Liner
**Level is the private jet of executive portfolio operations**: a premium, white-label platform with an acting agent that drafts board-ready updates in minutes, gives investors a live portfolio view, and keeps everything audited and isolated.

### Expanded (Sales Deck)
Level replaces scattered spreadsheets, slide decks, and email threads with a single executive-layer system. Founders generate weekly updates in <10 minutes. Investors see real-time portfolio status without chasing. Board packs are branded, immutable, and audit-ready. Every action is RLS-protected and logged. This is not a task tool—it's executive clarity, delivered.

### Differentiation
| Competitor | Weakness | Level Advantage |
|------------|----------|-----------------|
| **Asana/Monday** | Task noise, no exec synthesis, no audit | Executive-only layer, agent-drafted summaries, full audit trail |
| **Generic dashboards** | Manual updates, stale data, no citations | Auto-refresh from live data, RAG-powered citations, immutable snapshots |
| **Email/Slides/Sheets** | Fragmented, no version control, no trust | Single source of truth, SHA256 hashes, RLS-enforced isolation |
| **Custom internal tools** | Months to build, no AI, brittle | Production-ready in 4 weeks, agent-assisted, battle-tested RLS |

---

## 2) Ideal Customer Profile (ICP)

### Primary ICP: Founders / C-Suite
**Persona:** CEO/Founder running 1-5 companies with complex boards (investors, advisors, stakeholders)

**Pain:**
- Spends 4+ hours/week manually drafting board updates
- Scattered data (Google Docs, Notion, email threads)
- No audit trail (board asks "where did this number come from?")
- Investors demand consistent, comparable reporting

**Outcome:**
- Weekly exec drafted in <10 minutes
- Board packs auto-generated (branded PDF + immutable snapshot)
- Investor requests fulfilled via agent (with citations)
- Full audit trail for compliance/governance

**Budget Authority:** £500-£2,500/month (company-funded or personal portfolio budget)

### Secondary ICP: Investors (Angels, Family Offices, PE/VC Portfolio Ops)
**Persona:** Investor managing 10-50 portfolio companies, needs consistent status across holdings

**Pain:**
- Chasing founders for updates (irregular, incomparable formats)
- No live visibility into portfolio risks/milestones
- Manual aggregation of board packs for LP reporting
- Compliance gaps (missing audit trails, no data sovereignty)

**Outcome:**
- Portfolio Console: live at-risk flags, last-update ages, trend deltas
- Batch board packs (select 10 companies → generate LP report in minutes)
- Structured requests to founders (fulfilled via agent with citations)
- GDPR/SOC 2-ready for institutional LPs

**Budget Authority:** £1,000-£10,000/month (fund operations budget or LP service fees)

### Anti-ICP (Explicitly Out)
- Single-team task management (use Asana/Linear)
- Engineering squads glued to Jira (use Jira)
- "Just Kanban" workflows (use Trello)
- SMBs with <£1M ARR (not premium-aligned)

---

## 3) Pricing Tiers

### Tier 1: Founder Portfolio
**£149 per user per month** (annual: £1,788/year, save 10%)

**Includes:**
- Up to 5 companies (organizations)
- Unlimited milestones, risks, decisions
- Weekly exec summaries (agent-drafted)
- 10GB document storage (RAG-enabled)
- Email + Google/Microsoft OAuth
- Standard support (business hours, <4hr response)

**Ideal for:**
- Serial founders managing 2-5 ventures
- Solo GPs with <10 portfolio companies
- Early-stage CEOs reporting to small boards

**Guardrails:**
- Max 5 organizations per user
- Max 3 users per organization (founder + 2 assistants)
- No custom domain (uses `yourname.level.app`)
- No SLA (best-effort uptime)

**Acceptance Criteria:**
- [ ] User can create 5 orgs, invite 2 members each
- [ ] Weekly exec generates in <10 min
- [ ] Document RAG retrieves with citations

---

### Tier 2: Company (Business Plan)
**£499 per tenant per month** (annual: £5,988/year, save 10%)

**Includes:**
- Single company (unlimited users within org)
- Unlimited milestones, risks, decisions, documents
- Weekly + monthly exec summaries
- Board pack generation (branded PDF + immutable snapshot)
- 50GB storage
- Investor request/response workflows
- Priority support (<2hr response)
- SSO (Google/Microsoft OAuth)

**Ideal for:**
- Scale-ups with active boards (Series A-C)
- Portfolio companies needing investor reporting
- Enterprises wanting exec-layer visibility (C-suite only)

**Guardrails:**
- Max 50 users per org (add-on: £10/user/month beyond 50)
- Max 10k documents (add-on: £50/10k docs)
- Custom subdomain included (`acme.level.app`)
- No dedicated infrastructure (shared Supabase)

**Acceptance Criteria:**
- [ ] Unlimited users within org
- [ ] Board pack generates with SHA256 hash
- [ ] Investor can send request, founder fulfils via agent

---

### Tier 3: Investor Studio
**£999 per org per month** (annual: £11,988/year, save 10%)

**Includes:**
- Up to 25 portfolio companies (organizations)
- Unlimited users (investor team + founders)
- Portfolio Console (live status cards, at-risk flags, trend deltas)
- Batch board packs (select 10 companies → generate LP report)
- 100GB storage
- White-label branding (investor firm's logo/colors)
- Custom domain (`ops.your-firm.com`)
- Premium support (<1hr response, 24/7 for P1)

**Ideal for:**
- Family offices (10-30 holdings)
- Early-stage VC funds (Seed/Series A)
- Angel syndicates with structured LP reporting

**Guardrails:**
- Max 25 companies (add-on: £50/company/month beyond 25)
- Max 100 users across all companies
- No region residency (shared EU infrastructure)
- No SLA (best-effort 99.5% uptime)

**Acceptance Criteria:**
- [ ] Portfolio Console shows 25 companies with status
- [ ] Batch board pack generates for 10 selected companies
- [ ] Custom domain resolves with SSL

---

### Tier 4: Enterprise / Dedicated Node
**£2,500 per node per month + £2,000 setup** (annual: £30,000/year + setup)

**Includes:**
- Dedicated Supabase project (isolated DB + compute)
- Region residency (EU/UK/US/APAC)
- Unlimited companies, users, documents
- Custom compute sizing (XL baseline, 2XL/4XL available)
- SLA: 99.9% uptime (credits for downtime)
- RPO: 1 hour (point-in-time recovery)
- RTO: 4 hours (disaster recovery)
- DPA + sub-processor list
- SOC 2 Type II roadmap access
- Annual penetration test results
- White-glove support (dedicated CSM, 24/7 on-call)

**Ideal for:**
- PE/VC funds (>50 portfolio companies)
- Public companies (audit/compliance requirements)
- Multi-national enterprises (data sovereignty laws)
- Regulated industries (GDPR, HIPAA-adjacent)

**Guardrails:**
- Minimum 12-month contract
- 30-day cancellation notice
- Data export + deletion within 30 days on request
- No refunds on setup fee

**Acceptance Criteria:**
- [ ] Dedicated Supabase project in customer's region
- [ ] SLA met (99.9% uptime, monthly report)
- [ ] DPA signed, sub-processor list approved
- [ ] Backup tested (restore to staging successful)

---

## 4) Add-Ons (All Tiers)

| Add-On | Price | Notes |
|--------|-------|-------|
| **Extra Users** (Tier 2) | £10/user/mo | Beyond 50 users |
| **Extra Companies** (Tier 3) | £50/company/mo | Beyond 25 companies |
| **Extra Storage** | £50/100GB/mo | All tiers |
| **SSO (SAML/Okta)** | £500/mo | Enterprise auth (Tier 3+) |
| **API Connectors** | £200/connector/mo | Jira, Salesforce, QuickBooks, etc. |
| **Professional Services** | £2,000/week | Custom workflows, integrations, migrations |
| **Dedicated CSM** | £1,500/mo | Weekly check-ins, QBRs (Tier 3+) |

---

## 5) ROI Calculator (Sales Tool)

### Founder Persona (Tier 1/2)
**Current state (manual process):**
- 4 hours/week drafting board updates × £200/hour founder time = **£800/week**
- 12 hours/month preparing board pack × £200/hour = **£2,400/month**
- Missed insights (no RAG/search) = **opportunity cost £5k/month**

**Total monthly cost of status quo:** ~£6,000/month

**Level cost:** £499/month (Tier 2)
**ROI:** £6,000 - £499 = **£5,501/month saved** (11x ROI)

**Time saved:** 16 hours/month → **1 full workweek reclaimed**

### Investor Persona (Tier 3)
**Current state:**
- 2 hours/week chasing 20 founders for updates × £500/hour GP time = **£1,000/week**
- 8 hours/quarter aggregating LP reports × £500/hour = **£4,000/quarter**
- Compliance gaps → potential LP churn = **risk of £50k AUM loss**

**Total monthly cost of status quo:** ~£5,000/month + risk

**Level cost:** £999/month (Tier 3)
**ROI:** £5,000 - £999 = **£4,001/month saved** (5x ROI)

**Time saved:** 8 hours/week → **50% reduction in portfolio ops overhead**

### Enterprise Persona (Tier 4)
**Current state:**
- Custom internal tool: £200k to build, £50k/year maintenance = **£66,667/year amortized**
- Compliance audits: £20k/year external auditors
- Data breaches (avg incident): £500k risk exposure

**Total annual cost:** ~£86,667/year + risk

**Level cost:** £30,000/year (Dedicated Node)
**ROI:** £86,667 - £30,000 = **£56,667/year saved** (2.9x ROI)

**Additional value:**
- Audit-ready from day 1 (no scrambling for SOC 2)
- RLS-enforced isolation (eliminates breach risk)
- Region residency (GDPR compliance out-of-box)

---

## 6) Guardrails & Governance

### Fair Use Policy (All Tiers)
- **Agent calls:** Max 1,000 LLM API calls/user/month (soft limit, monitoring only)
- **Document uploads:** Max 500 docs/month/org (anti-abuse)
- **Storage:** Auto-archive documents >1 year old (opt-in)
- **API rate limits:** 100 req/min/user (Tier 1-2), 500 req/min (Tier 3-4)

**Enforcement:**
- Soft limits → warning email at 80% usage
- Hard limits → graceful degradation (queue requests, no errors)
- Abuse → account review (e.g., scraping, crypto mining)

### Data Retention
- **Active data:** Retained while account active
- **Deleted data:** 30-day grace period, then permanent deletion
- **Audit logs:** 90-day retention (Tier 1-2), 1-year (Tier 3-4)
- **Backups:** 7-day PITR (Tier 1-3), 30-day (Tier 4)

### Security Commitments
- RLS enforced on all tables (deny-by-default)
- Immutable snapshots (SHA256 hash for board packs)
- No client-side bypass of RLS (server-enforced auth)
- Secrets never committed (Vault-based secrets management)
- Annual penetration testing (results shared with Tier 4 customers)

---

## 7) Competitive Positioning

### vs. Asana/Monday/ClickUp (Task Tools)
**Weakness:** Task noise, no executive synthesis, no audit trail
**Level wins:** Executive-only layer, agent-drafted summaries, full audit log

**Sales angle:** "Asana is for your engineering team. Level is for your board. Different layers, different needs."

### vs. Custom Dashboards (Tableau, Looker, PowerBI)
**Weakness:** Manual updates, stale data, no citations, no write-back
**Level wins:** Auto-refresh, RAG-powered answers, agent can act (CRUD)

**Sales angle:** "Dashboards show you *what*. Level shows you *why* and *what to do*—with citations and agent actions."

### vs. DIY Notion/Coda
**Weakness:** No RLS, no audit, no agent, fragile integrations
**Level wins:** Production-grade RLS, immutable snapshots, AI that acts

**Sales angle:** "Notion is a blank canvas. Level is a purpose-built executive suite with security baked in."

---

## 8) Objection Handling

### Objection 1: "We already use [Asana/Notion/Jira]"
**Response:** "Level doesn't replace your task tools—it sits on top. We extract executive-level insights (milestones, risks, decisions) and let your team keep working where they're comfortable. Think of us as your board-ready layer, not your daily ops tool."

### Objection 2: "Can't we build this ourselves?"
**Response:** "You could, but it'll cost £200k and 6 months to get RLS right, build RAG retrieval, and pass SOC 2. Level ships production-ready RLS, immutable audit, and agent workflows today. Our Dedicated Node gives you the control of in-house with zero engineering lift."

### Objection 3: "Pricing seems high for what it is"
**Response:** "Compare to your current state: 4 hours/week manually drafting updates = £800/week founder time. We save you £3,200/month for £499. That's an 6x ROI before counting risk reduction (no data breaches, audit-ready from day 1)."

### Objection 4: "What if our data leaks to another tenant?"
**Response:** "Impossible. RLS is enforced at the database level—Postgres won't return cross-tenant data even if the app tries. We run leakage tests in CI (zero failures in 500+ tests). Plus, Dedicated Nodes give you isolated infrastructure—no shared compute."

### Objection 5: "We need SAML/Okta SSO"
**Response:** "That's a £500/month add-on (Tier 3+). We support Google/Microsoft OAuth baseline, and SAML/Okta integrates in <48 hours. Happy to include in your annual contract."

---

## 9) Sales Process (4-Week Cycle)

### Week 1: Discovery
- Demo call (8-min script: Portfolio Console → Risk → Exec → PDF → Security)
- Qualify: ICP fit, budget authority, timeline
- Send ROI calculator (personalized to their current state)

### Week 2: Pilot Proposal
- Offer 4-week pilot (free or £1 placeholder invoice)
- Success criteria: 3 weekly execs, 1 board pack, NPS ≥8
- Assign CSM for onboarding

### Week 3: Pilot Execution
- Onboard founder/investor sponsor
- Import sample data (5 milestones, 3 risks, 3 docs)
- Generate first weekly exec (validate <10 min)
- Generate board pack (validate SHA256 hash)

### Week 4: Close
- Exit survey (NPS, open feedback)
- If NPS ≥8 → Present annual contract (10% discount)
- If NPS <8 → Extend pilot 2 weeks, iterate on feedback
- Commercial terms: MSA + DPA + SLA (if Dedicated Node)

**Close rate target:** 40% (pilot → paid conversion)

---

## 10) Marketing Messaging

### Hero (Website)
**Headline:** Executive Clarity for Founders and Investors
**Subhead:** A premium portfolio console with an acting agent—board-ready updates in minutes, not days.

### Demo Script (8 min)
1. **Portfolio Console** (1 min): Show 10 companies, at-risk flags, last-update ages
2. **Add a Risk** (1 min): "Runway <6 months" → Owner assigned → Agent suggests mitigation
3. **Weekly Exec** (2 min): Click "Generate Exec" → Agent drafts summary with citations → Approve → Show branded PDF
4. **Investor Request** (2 min): Investor asks "Q1 cashflow?" → Founder clicks "Fulfil with Agent" → Agent searches docs → Drafts response → Immutable snapshot created
5. **Security Slide** (2 min): RLS diagram, audit log sample, SHA256 hash verification

### Case Studies (Target 2 by Q1 2025)
1. **Founder Persona:** "How Acme Corp reduced board prep from 16 hours to <2 hours/month"
2. **Investor Persona:** "How XYZ Ventures scaled portfolio ops from 10 to 50 companies without adding headcount"

### SEO Keywords
- Executive operations platform
- Board pack automation
- Investor portfolio console
- AI executive assistant
- Multi-tenant dashboard with RLS
- Audit-ready executive reporting

---

## 11) Partner & Reseller Strategy

### Integration Partners (Revenue Share: 20%)
- **Accounting software:** QuickBooks, Xero (financial snapshots auto-import)
- **CRM:** HubSpot, Salesforce (investor contact sync)
- **Data rooms:** DocSend, Intralinks (secure doc sharing)

**Go-to-market:** Co-branded webinars, "Level + QuickBooks: Board-Ready Financials in 5 Minutes"

### Reseller Partners (Revenue Share: 30%)
- **Advisory firms:** Big 4, boutique consultancies (sell Level to portfolio clients)
- **Accelerators:** Y Combinator, Techstars (bundle Level for cohort companies)
- **LP services firms:** Carta, AngelList (white-label for fund admin)

**Go-to-market:** Partner portal, co-branded collateral, rev-share via Stripe Connect

---

## 12) Pricing Acceptance Criteria

### Tier 1 (Founder Portfolio)
- [ ] User can create 5 orgs, invite 2 members each
- [ ] Weekly exec generates in <10 min with citations
- [ ] Billing via Stripe (auto-renew annually with 10% discount)

### Tier 2 (Company)
- [ ] Unlimited users within org (tested with 50+)
- [ ] Board pack generates with SHA256 hash
- [ ] Custom subdomain resolves with SSL

### Tier 3 (Investor Studio)
- [ ] Portfolio Console shows 25 companies with live status
- [ ] Batch board pack generates for 10 selected companies
- [ ] Custom domain resolves (`ops.firm.com`)

### Tier 4 (Dedicated Node)
- [ ] Dedicated Supabase project in customer's region
- [ ] SLA met (99.9% uptime, monthly report sent)
- [ ] DPA signed, sub-processor list approved
- [ ] Backup tested (restore to staging successful)

---

## 13) Pricing Roadmap (Future Tiers)

### Q2 2025: Usage-Based Add-On
**AI Credits** (for heavy RAG users)
- Baseline: 1,000 agent calls/user/month included
- Overage: £0.10/call (auto-purchased in blocks of 1,000)
- Target: Power users running >100 queries/day

### Q3 2025: Industry Vertical Pricing
**Level for PE/VC** (Tier 3 variant)
- Pre-configured KPIs (ARR growth, burn multiple, LTV/CAC)
- LP reporting templates (quarterly fund performance)
- Co-investor data rooms (shared view, no edit)
- **£1,499/month** (25 companies + LP features)

### Q4 2025: API-Only Plan
**Level API** (for customers building on top)
- Headless Level (no UI, API + RLS only)
- Bring-your-own frontend
- **£999/month + £0.01/API call** (for SaaS builders embedding exec ops)

---

## 14) Key Metrics (Track Monthly)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **ACV (Annual Contract Value)** | £6,000 | Avg across all tiers |
| **Pilot → Paid Conversion** | 40% | Closed deals / pilots started |
| **Churn (Monthly)** | <3% | (Cancellations / active accounts) |
| **NPS (Sponsor)** | ≥8/10 | Exit survey, quarterly follow-up |
| **Time-to-First-Exec** | <7 days | Onboarding completion metric |
| **Dedicated Nodes Sold** | 2 in Q1 | £60k ARR (premium tier traction) |

---

**End of Document**

*Update pricing quarterly based on market feedback, cost of delivery (OpenAI, Supabase), and competitive landscape. Align with finance on margin targets (70% gross margin baseline).*
