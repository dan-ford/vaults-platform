# Environment Variables Reference

This document lists all environment variables used by VAULTS, categorized by deployment phase and feature.

## Quick Start - Minimum Required for MVP

These variables are **REQUIRED** for basic deployment to Vercel:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://lkjzxsvytsmnvuorqfdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-dashboard>
SUPABASE_SERVICE_KEY=<from-supabase-dashboard>

# Application (REQUIRED)
NEXT_PUBLIC_APP_NAME=VAULTS
NEXT_PUBLIC_APP_URL=https://vaults.team

# CopilotKit (REQUIRED for AI features)
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=ck_pub_ab4d5b7b38e07de9596b6f6530b780de
```

## All Environment Variables by Category

### Core Infrastructure (REQUIRED)

#### Supabase
```bash
# Your Supabase project URL
# Get from: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://lkjzxsvytsmnvuorqfdl.supabase.co

# Public anonymous key (safe for client-side)
# Get from: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/settings/api
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Service role key (server-only, never expose to client)
# Get from: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/settings/api
SUPABASE_SERVICE_KEY=eyJhbGc...
```

#### Application Settings
```bash
# Application display name
NEXT_PUBLIC_APP_NAME=VAULTS

# Base URL of your deployment (Vercel auto-provides VERCEL_URL)
# Production: https://vaults.team
# Staging: https://vaults-staging.vercel.app
NEXT_PUBLIC_APP_URL=https://vaults.team
```

#### CopilotKit AI Platform
```bash
# CopilotKit Cloud API key for AI assistant features
# This is a PUBLIC key (ck_pub_*) - safe to deploy client-side
# Get from: https://cloud.copilotkit.ai
# Status: REQUIRED for AI actions to work
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=ck_pub_ab4d5b7b38e07de9596b6f6530b780de
```

---

### Feature Modules (OPTIONAL - Can Be Added Later)

#### RAG Search (Defer for MVP)
**Status:** Optional - Requires separate FastAPI backend deployment

```bash
# URL to your deployed agent backend
# Options: Railway, Render, fly.io, or dedicated server
# Cost: ~$5-20/month for basic tier
FASTAPI_URL=https://vaults-agent.railway.app

# OpenAI API key for AI features (required for RAG + Finance analysis)
# Get from: https://platform.openai.com/api-keys
# Used for:
#   1. RAG embeddings (text-embedding-3-small) - ~$0.10 per 1M tokens
#   2. Finance document analysis (GPT-4-turbo) - ~$0.01-0.03 per document
# Cost estimate: $10-30/month for typical usage
OPENAI_API_KEY=sk-proj-...
```

#### RAG Configuration (Advanced - Has Defaults)
```bash
# Hybrid search fusion weights (vector vs keyword)
FUSION_WEIGHT_VECTOR=0.65      # 65% vector similarity
FUSION_WEIGHT_BM25=0.35        # 35% keyword matching

# Retrieval parameters
TOP_K_PRE=100                  # Initial candidates
TOP_K_MMR=15                   # After diversity filter
TOP_K_FINAL=5                  # Final results returned

# Reranking (improves quality, adds latency)
RERANK_ENABLED=true
RERANK_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
```

#### Stripe Billing (Defer for MVP)
**Status:** Optional - Code complete, just needs configuration

```bash
# Stripe Secret Key (server-only)
# Test mode: sk_test_... | Live mode: sk_live_...
# Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_51...

# Stripe Publishable Key (client-side, safe)
# Test mode: pk_test_... | Live mode: pk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Webhook signing secret (for verifying webhook events)
# Create webhook: https://dashboard.stripe.com/test/webhooks
# Endpoint: https://vaults.team/api/stripe/webhooks
# Events: checkout.session.completed, customer.subscription.*
STRIPE_WEBHOOK_SECRET=whsec_...

# Product Price IDs (create in Stripe Dashboard)
# Products → Create → Set recurring billing
STRIPE_PRICE_ID_SMALL=price_1...      # $49/month
STRIPE_PRICE_ID_MEDIUM=price_2...     # $149/month
STRIPE_PRICE_ID_ENTERPRISE=price_3... # Custom
```

**When to Enable:** After 10+ pilot customers, before public launch

#### Transactional Email (Defer for MVP)
**Status:** Optional - Use for automated invitation emails

```bash
# Resend API Key (recommended)
# Get from: https://resend.com/api-keys
# Domain: vaults.email
# Cost: Free up to 3000 emails/month, then $0.0001/email
RESEND_API_KEY=re_...

# OR Postmark Server Token (alternative)
# Get from: https://account.postmarkapp.com/servers
POSTMARK_SERVER_TOKEN=...

# Email sender configuration
EMAIL_FROM_NAME=VAULTS
EMAIL_FROM_ADDRESS=noreply@vaults.email
```

**DNS Records Required for vaults.email:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
```

**When to Enable:** When user volume requires automated onboarding

#### Trade Secrets Module (Defer for MVP - Not Production Ready)
**Status:** Implemented but uses MOCK timestamps (not legally valid)

```bash
# RFC 3161 Timestamp Authority URL
# Development: https://freetsa.org/tsr (FREE but not legally binding)
# Production: Use commercial TSA (DigiCert, Sectigo, GlobalSign)
TIMESTAMP_AUTHORITY_URL=https://freetsa.org/tsr

# Optional: eIDAS Qualified Timestamp Service Provider (EU/UK)
# Required for EU legal compliance
EIDAS_QTSP_URL=https://your-qtsp-provider.com/tsr
EIDAS_QTSP_API_KEY=your-qtsp-api-key
```

**Production Requirements:**
- Must use commercial RFC 3161 TSA (cost: ~$500-2000/year)
- Current implementation uses mock tokens (NOT production-ready)
- Legal liability if used without real TSA
- **Recommendation:** Disable module until real TSA configured

**When to Enable:** After implementing real RFC 3161 library and TSA subscription

#### Google Maps (Optional Enhancement)
**Status:** Optional - For displaying address maps in organization profiles

```bash
# Google Maps API Key
# Get from: https://console.cloud.google.com/google/maps-apis
# Enable: Maps Embed API
# Cost: Free tier 28,000 loads/month
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

**API Restrictions (Security):**
- Restrict key to your domain (vaults.team) in Google Cloud Console
- Only enable "Maps Embed API" (not full Maps JS API)

**When to Enable:** Low priority, nice-to-have feature

---

### SSO Authentication (Future Enhancement)

**Status:** Configuration stubs present, not implemented

```bash
# Enable/disable SSO providers in UI
NEXT_PUBLIC_AUTH_GOOGLE=true
NEXT_PUBLIC_AUTH_MICROSOFT=true
NEXT_PUBLIC_AUTH_LINKEDIN=true
```

**Implementation Required:**
1. Configure OAuth apps in each provider
2. Add callback URLs to Supabase Auth settings
3. Create provider selection UI

**When to Enable:** Phase 2 enhancement

---

### Notifications (Stubs Only - Not Implemented)

**Status:** Placeholder configuration, no implementation

```bash
# Twilio for SMS (stub)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=

# WhatsApp Business (stub)
WHATSAPP_BUSINESS_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

**When to Enable:** Future enhancement, not roadmapped

---

## Deployment Checklist

### For Vercel Production Deployment

#### Phase 1: MVP (Minimum Viable Product)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_COPILOT_CLOUD_API_KEY`

**Features Enabled:**
- User authentication
- Multi-tenant organization management
- Tasks, Milestones, Risks, Documents, Decisions, Contacts
- Reports generation
- White-label branding
- Notifications (in-app only)
- AI assistant (28+ actions)
- Finance module with AI document analysis (XLS/CSV upload → GPT-4 extraction)

**Features Disabled/Limited:**
- AI document search (no RAG backend)
- Subscription billing (no Stripe)
- Email notifications (manual invites only)
- Trade secrets module (disabled via module toggle)

#### Phase 2: Production Features (Post-Launch)
- [ ] `FASTAPI_URL` (RAG search)
- [ ] `OPENAI_API_KEY` (RAG embeddings)
- [ ] `RESEND_API_KEY` (transactional email)
- [ ] `STRIPE_SECRET_KEY` (billing)
- [ ] `STRIPE_PUBLISHABLE_KEY` (billing)
- [ ] `STRIPE_WEBHOOK_SECRET` (billing)
- [ ] `STRIPE_PRICE_ID_*` (product prices)

#### Phase 3: Enterprise Features (Future)
- [ ] Secrets module with real RFC 3161 TSA
- [ ] Google Maps integration
- [ ] SSO providers (Google, Microsoft, LinkedIn)
- [ ] SMS/WhatsApp notifications

---

## Security Notes

### Never Commit to Git
These variables contain sensitive secrets and MUST use Vercel environment variables:
- `SUPABASE_SERVICE_KEY` (bypass RLS, unlimited access)
- `STRIPE_SECRET_KEY` (charge customers)
- `STRIPE_WEBHOOK_SECRET` (webhook verification)
- `OPENAI_API_KEY` (incurs costs)
- `RESEND_API_KEY` (send emails)

### Safe to Commit (Public Keys)
These are client-facing keys, safe to include in .env.example:
- `NEXT_PUBLIC_SUPABASE_URL` (project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS-protected, safe)
- `NEXT_PUBLIC_COPILOT_CLOUD_API_KEY` (ck_pub_* prefix = public key)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (if domain-restricted)

### Vercel-Specific
Vercel automatically provides these (don't set manually):
- `VERCEL_URL` (deployment URL)
- `VERCEL_ENV` (production/preview/development)
- `VERCEL_GIT_COMMIT_SHA` (git commit)

---

## Validation

### Runtime Validation
The application validates required environment variables on startup. Missing required variables will:
- Log clear error messages to console
- Show warning in development mode
- Gracefully disable features in production (if optional)

### Development Setup
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in required variables:
   - Get Supabase keys from dashboard
   - Use provided CopilotKit key (or get your own)
   - Leave optional variables commented/empty

3. Restart dev server:
   ```bash
   npm run dev
   ```

### Production Setup (Vercel)
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all Phase 1 variables (6 required)
3. Set environment: Production, Preview, or Development
4. Redeploy to apply changes

---

## Cost Estimates

### MVP (Free/Low Cost)
- Supabase Free tier: $0/month (up to 500MB database, 1GB storage)
- CopilotKit: $0-20/month (pay-as-you-go, depends on usage)
- Vercel Hobby: $0/month (includes custom domain)
- **Total: $0-20/month**

### Production (Small Scale)
- Supabase Pro: $25/month (8GB database, 100GB storage)
- CopilotKit: ~$50/month (estimated usage)
- Vercel Pro: $20/month (better performance, team features)
- RAG Agent (Railway): $5-20/month
- Resend: $0-20/month (3K emails free, then $0.0001/email)
- **Total: $100-135/month**

### Production (With Billing)
- Add Stripe: 2.9% + $0.30 per transaction (no monthly fee)
- Add Secrets TSA: $500-2000/year (~$40-170/month)
- **Total: $140-305/month + transaction fees**

---

## Troubleshooting

### Issue: CopilotKit API not working
**Symptom:** AI assistant actions fail or don't load
**Solution:** Check `NEXT_PUBLIC_COPILOT_CLOUD_API_KEY` is set in Vercel
**Verify:** Look for console warning about missing key

### Issue: Database RLS denies access
**Symptom:** "Permission denied" errors from Supabase
**Solution:** Check `SUPABASE_SERVICE_KEY` is correct (not anon key)
**Verify:** Service key should bypass RLS for admin operations

### Issue: Stripe webhooks not working
**Symptom:** Subscriptions created but not reflected in app
**Solution:** Check `STRIPE_WEBHOOK_SECRET` matches webhook endpoint
**Verify:** Test webhook in Stripe Dashboard → Webhooks → Send test event

### Issue: RAG search not working
**Symptom:** "Search Documents" AI action fails or returns no results
**Solution:** Deploy FastAPI backend and set `FASTAPI_URL`
**Alternative:** Disable RAG and defer to Phase 2

### Issue: Emails not sending
**Symptom:** Invitation emails never arrive
**Solution:** Check `RESEND_API_KEY` and DNS records for vaults.email
**Verify:** Test send from Resend dashboard

---

## Related Documentation
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md) (to be created)
- [Production Considerations](../PRODUCTION_CONSIDERATIONS.md)
- [Security Guide](../SECURITY.md)
- [Agent Backend Deployment](./AGENT_DEPLOYMENT.md) (to be created)
