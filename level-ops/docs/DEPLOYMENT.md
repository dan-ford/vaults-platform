# VAULTS Platform - Complete Deployment Guide

**Last Updated:** 2025-10-18
**Status:** Production Deployed (Railway + Vercel)
**Estimated Time:** 2-3 hours for full deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [GitHub Repository Setup](#github-repository-setup)
4. [Railway Deployment (RAG Agent Backend)](#railway-deployment-rag-agent-backend)
5. [Vercel Deployment (Next.js Frontend)](#vercel-deployment-nextjs-frontend)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Production Configuration](#production-configuration)
8. [Smoke Testing Procedures](#smoke-testing-procedures)
9. [Monitoring and Alerts](#monitoring-and-alerts)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)
12. [Post-Deployment Maintenance](#post-deployment-maintenance)

---

## Overview

This guide covers deploying the VAULTS platform to production with:
- **Frontend:** Next.js 15 on Vercel
- **Backend:** Python FastAPI RAG agent on Railway
- **Database:** Supabase (Postgres + pgvector)
- **AI:** CopilotKit + OpenAI

### Architecture

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│   Vercel    │──────▶│   Railway    │──────▶│  Supabase  │
│  (Next.js)  │       │   (FastAPI)  │       │ (Postgres) │
└─────────────┘       └──────────────┘       └────────────┘
       │                      │                      │
       │                      │                      │
       ▼                      ▼                      ▼
  End Users             OpenAI API          pgvector + RLS
```

---

## Pre-Deployment Checklist

### Code Readiness
- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] All environment variables documented
- [ ] No secrets in source code
- [ ] `.env.example` up to date

### Database Readiness
- [ ] All migrations applied to production database
- [ ] RLS enabled on all tables
- [ ] RLS policies verified and tested
- [ ] Realtime enabled for necessary tables
- [ ] Storage buckets created with correct policies
- [ ] Indexes created for performance

### Security Readiness
- [ ] Secrets module disabled (not production-ready) or commercial TSA configured
- [ ] HaveIBeenPwned password protection ready to enable
- [ ] HTTPS enforced in production
- [ ] CSP headers configured
- [ ] Rate limiting implemented

### Service Accounts
- [ ] GitHub account ready
- [ ] Railway account created
- [ ] Vercel account created
- [ ] Supabase project running
- [ ] OpenAI API key obtained (with quota)
- [ ] CopilotKit API key ready

---

## GitHub Repository Setup

### Step 1: Create GitHub Repository

1. **Go to GitHub**
   - Navigate to: https://github.com/new
   - Or click the "+" icon → "New repository"

2. **Repository Settings:**
   ```
   Repository name: vaults-platform
   Description: VAULTS - Multi-tenant project management platform with AI
   Visibility: Private (recommended)

   DO NOT initialize with:
   ☐ README
   ☐ .gitignore
   ☐ license
   ```

   Click "Create repository"

3. **Copy the Repository URL**
   ```
   https://github.com/[your-username]/vaults-platform.git
   ```

### Step 2: Update Git Remote

```bash
# Check current directory
pwd
# Should be in /level-ops

# Remove old remote (if any)
git remote remove origin

# Add new remote
git remote add origin https://github.com/[your-username]/vaults-platform.git

# Verify
git remote -v
```

### Step 3: Prepare and Push Code

```bash
# Stage all changes
git add -A
git status  # Review what will be committed

# Create commit
git commit -m "Initial commit: VAULTS platform ready for deployment

- Next.js 15 with App Router
- Supabase integration with RLS
- Multi-tenant architecture
- CopilotKit AI assistant (24+ actions)
- RAG search backend (FastAPI)
- Full documentation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 4: Verify on GitHub

1. Refresh your GitHub repository page
2. Check these critical files are present:
   - ✅ `vercel.json` (Vercel configuration)
   - ✅ `package.json`
   - ✅ `docs/ENVIRONMENT_VARIABLES.md`
   - ✅ `app/providers.tsx`

---

## Railway Deployment (RAG Agent Backend)

The RAG agent backend provides document search and AI capabilities.

### Step 1: Create Railway Account

1. **Sign Up:**
   - Go to: https://railway.app
   - Click "Start a New Project"
   - Sign up with GitHub account (recommended)

2. **GitHub OAuth:**
   - Authorize Railway to access your repositories

### Step 2: Deploy Agent Backend

1. **Create New Project:**
   - Dashboard → "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `[your-username]/vaults-platform`
   - Click "Deploy Now"

2. **Configure Root Directory:**
   - Click "Settings" → "Service Settings"
   - Set "Root Directory" to: `agent`
   - Save changes

3. **Railway Auto-Detection:**
   - Railway will detect Python from `requirements.txt`
   - Automatically uses Python buildpack
   - Starts with `main.py`

### Step 3: Configure Environment Variables

1. **In Railway Dashboard:**
   - Select your agent service
   - Click "Variables" tab
   - Add the following variables:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_KEY=[your-service-key]

# OpenAI (REQUIRED for embeddings)
OPENAI_API_KEY=sk-proj-[your-key]

# RAG Configuration (Optional - has defaults)
FUSION_WEIGHT_VECTOR=0.65
FUSION_WEIGHT_BM25=0.35
TOP_K_PRE=100
TOP_K_MMR=15
TOP_K_FINAL=5
```

2. **Get OpenAI API Key:**
   - Go to: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy the key (starts with `sk-proj-`)
   - **NEVER commit this to git**

3. **Get Supabase Service Key:**
   - Supabase Dashboard → Settings → API
   - Copy "service_role" key (NOT anon key)
   - This key bypasses RLS (keep secret!)

### Step 4: Get Agent URL

1. **Generate Domain:**
   - Settings → Networking → "Generate Domain"
   - Railway creates: `vaults-agent-production.up.railway.app`

2. **Copy Full URL:**
   ```
   https://vaults-agent-production.up.railway.app
   ```

3. **Test Health Endpoint:**
   ```bash
   curl https://vaults-agent-production.up.railway.app/health
   # Should return: {"status": "healthy"}
   ```

### Step 5: Verify RAG Backend

```bash
# Test the search endpoint
curl -X POST https://vaults-agent-production.up.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test search",
    "organization_id": "test-org-id",
    "top_k": 5
  }'

# Expected: {"results": [], "query": "test search", "total_results": 0}
```

If you get this response, the agent is working! ✅

---

## Vercel Deployment (Next.js Frontend)

### Step 1: Create Vercel Account

1. **Sign Up:**
   - Go to: https://vercel.com
   - Click "Sign Up"
   - Choose "Continue with GitHub"
   - Authorize Vercel

### Step 2: Import Project

1. **Create New Project:**
   - Dashboard → "Add New..." → "Project"
   - Click "Import" next to `[your-username]/vaults-platform`

2. **Configure Project:**
   ```
   Project Name: vaults-platform
   Framework Preset: Next.js (auto-detected)
   Root Directory: level-ops
   Build Command: npm run build (auto)
   Output Directory: .next (auto)
   Install Command: npm install (auto)
   ```

3. **WAIT - Don't Deploy Yet!**
   - Click "Configure Project" to add environment variables first

### Step 3: Configure Environment Variables

Add these variables for **Production** environment:

#### Supabase (REQUIRED)
```bash
NEXT_PUBLIC_SUPABASE_URL
Value: https://[your-project].supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [get from Supabase Dashboard → API → anon/public key]

SUPABASE_SERVICE_KEY
Value: [get from Supabase Dashboard → API → service_role key]
```

#### Application (REQUIRED)
```bash
NEXT_PUBLIC_APP_NAME
Value: VAULTS

NEXT_PUBLIC_APP_URL
Value: https://vaults-platform.vercel.app
# (or your custom domain)
```

#### CopilotKit (REQUIRED)
```bash
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY
Value: [your-copilot-api-key]
```

#### RAG Agent (REQUIRED)
```bash
FASTAPI_URL
Value: https://vaults-agent-production.up.railway.app

OPENAI_API_KEY
Value: [same OpenAI key used in Railway]
```

**IMPORTANT:** For each variable, check all environments:
- ☑ Production
- ☑ Preview
- ☑ Development

### Step 4: Deploy

1. **Click "Deploy"**
   - Vercel will clone, install, build, and deploy
   - Watch build logs in real-time
   - Should complete in 3-5 minutes

2. **Expected Output:**
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages
   ✓ Finalizing page optimization
   ✨ Deployment ready
   ```

3. **Get Deployment URL:**
   - Vercel shows: `https://vaults-platform-abc123.vercel.app`

### Step 5: Verify Deployment

1. **Basic Tests:**
   - ✅ Page loads (no 500 errors)
   - ✅ Login form appears
   - ✅ No console errors (F12 → Console)

2. **Authentication Test:**
   - Click "Sign up"
   - Create test account
   - Verify email sent
   - Complete signup

---

## Environment Variables Reference

### Production Requirements

```env
# Supabase (CRITICAL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # KEEP SECRET

# Application
NEXT_PUBLIC_APP_NAME=VAULTS
NEXT_PUBLIC_APP_URL=https://your-domain.com

# CopilotKit
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=your-copilot-key

# RAG Agent
FASTAPI_URL=https://your-agent-domain.com
OPENAI_API_KEY=your-openai-key

# RAG Configuration (Optional)
FUSION_WEIGHT_VECTOR=0.65
FUSION_WEIGHT_BM25=0.35
TOP_K_PRE=100
TOP_K_MMR=15
TOP_K_FINAL=5
```

### Secrets Module (If Enabled)

```env
# CRITICAL FOR LEGAL COMPLIANCE
# Use commercial TSA, NOT FreeTSA
TIMESTAMP_AUTHORITY_URL=https://timestamp.digicert.com

# Optional: eIDAS Qualified Timestamp Service (EU/UK)
EIDAS_QTSP_URL=https://qtsp.provider.com/tsr
EIDAS_QTSP_API_KEY=your-qtsp-api-key
```

**⚠️ PRODUCTION REQUIREMENT:**
- FreeTSA is NOT suitable for production
- Use commercial TSA: DigiCert, Sectigo, or GlobalSign
- Cost: ~$500-2000/year

---

## Production Configuration

### Step 1: Enable HaveIBeenPwned (REQUIRED)

1. **Supabase Dashboard:**
   - https://supabase.com/dashboard/project/[your-project-id]
   - Authentication → Policies
   - Password Security

2. **Enable Protection:**
   - Toggle "Enable leaked password protection" → ON
   - Click "Save"

3. **Test:**
   - Try password `password123`
   - Should fail: "Password has been leaked"

### Step 2: Configure Custom Domain (Optional)

1. **In Vercel Dashboard:**
   - Project Settings → Domains
   - Click "Add Domain"
   - Enter your domain

2. **Configure DNS:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. **Wait for SSL:**
   - Vercel auto-provisions certificate (5-10 min)

4. **Update Environment:**
   - Update `NEXT_PUBLIC_APP_URL`
   - Redeploy

### Step 3: Database Verification

```sql
-- 1. Verify RLS enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return ZERO rows

-- 2. Verify all tables have policies
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_policies WHERE schemaname = 'public'
);
-- Should return ZERO rows

-- 3. Verify realtime publication
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
-- Should include all necessary tables
```

### Step 4: Storage Buckets

Verify buckets exist with correct policies:

1. **`documents`** - PDF uploads (10MB max)
2. **`vault-secrets`** - Secret files (25MB max, versioning enabled)
3. **`org-logos`** - Organization logos (5MB max, public read)
4. **`avatars`** - User avatars (5MB max, public read)

---

## Smoke Testing Procedures

### Authentication Tests
- [ ] User signup works
- [ ] Email verification works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] HaveIBeenPwned blocks weak passwords

### Organization Tests
- [ ] Create organization
- [ ] Invite team member
- [ ] Accept invitation
- [ ] Switch between organizations
- [ ] Update organization settings
- [ ] Upload organization logo

### Core Feature Tests
- [ ] Tasks: Create, edit, delete, mark complete
- [ ] Milestones: Create, track progress
- [ ] Risks: Create, update probability/impact
- [ ] Documents: Upload PDF, view, download
- [ ] Decisions: Create ADR-style decision
- [ ] Contacts: Add contact with details
- [ ] Reports: Generate weekly summary

### AI Feature Tests
- [ ] AI assistant opens
- [ ] AI action: Add task
- [ ] AI action: Create risk
- [ ] AI action: Search documents (RAG)
- [ ] AI responses are contextual

### RAG Search Tests (CRITICAL)
- [ ] Upload document with known content
- [ ] Verify `document_chunks` table populated
- [ ] Verify embeddings generated (not NULL)
- [ ] AI search returns relevant results
- [ ] Search across multiple documents works

### Real-time Tests
- [ ] Changes appear in another browser
- [ ] Notification count updates live
- [ ] New tasks appear without refresh

### Performance Tests
- [ ] Page loads < 3 seconds
- [ ] No console errors
- [ ] AI responses < 5 seconds
- [ ] Document upload < 30 seconds
- [ ] Mobile responsive

---

## Monitoring and Alerts

### Vercel Analytics

1. **Enable Analytics:**
   - Project Settings → Analytics
   - Turn on Web Analytics (free tier)

2. **Monitor:**
   - Page views
   - Core Web Vitals
   - Error rate

### Supabase Monitoring

1. **Database Health:**
   - Dashboard → Reports
   - Monitor disk usage, connections, slow queries

2. **Set Up Alerts:**
   - Settings → Integrations
   - Add webhook for critical alerts

### Railway Monitoring

1. **Agent Health:**
   - Railway Dashboard → Metrics
   - Monitor memory, CPU, request rate

2. **View Logs:**
   ```bash
   railway logs
   ```

### Custom Logging

```typescript
// lib/logger.ts
export function logEvent(event: string, data: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (Datadog, Logtail, etc.)
  }
}
```

---

## Troubleshooting

### Vercel Build Fails

**Common Causes:**
1. Missing environment variables
2. TypeScript errors
3. Missing dependencies

**Solution:**
- Check build logs
- Verify environment variables
- Run `npm run build` locally

### RAG Search Returns Nothing

**Diagnosis:**
```sql
-- Check if documents are chunked
SELECT COUNT(*) FROM document_chunks;

-- Check if embeddings generated
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
```

**Solutions:**
1. Verify `FASTAPI_URL` correct
2. Check Railway logs
3. Verify OpenAI API key valid

### Emails Not Sending

**Cause:** Supabase built-in email (rate limited)

**Solution:**
- Check spam folder
- Configure transactional email (Resend)

### Database Connection Issues

```bash
# Test connection
curl https://[your-project].supabase.co/rest/v1/
```

---

## Rollback Procedures

### Vercel Rollback

1. **Previous Deployment:**
   - Vercel → Deployments
   - Find working deployment
   - Click "Promote to Production"

### Railway Rollback

1. **Redeploy Previous:**
   ```bash
   railway rollback
   ```

### Database Rollback

1. **Restore Backup:**
   - Supabase → Database → Backups
   - Restore previous backup
   - Re-run migrations if needed

---

## Post-Deployment Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check uptime metrics
- [ ] Monitor database performance

### Monthly
- [ ] Review audit trail
- [ ] Check storage usage and costs
- [ ] Update dependencies (security patches)
- [ ] Test backup restoration

### Quarterly
- [ ] Rotate secrets and API keys
- [ ] Security audit
- [ ] Performance optimization review
- [ ] User feedback collection

### Annually
- [ ] Penetration testing
- [ ] Compliance review (GDPR, SOC 2)
- [ ] Disaster recovery drill
- [ ] Documentation update

---

## Cost Estimates

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Supabase Pro | $25 | 8GB DB, 100GB bandwidth |
| Vercel Pro | $20 | Or Railway/Render ($5-20) |
| OpenAI API | $10-100 | Depends on usage |
| Monitoring (Sentry) | $26 | Team plan |
| **Total** | **$81-171/mo** | Scales with usage |

---

## Support Resources

**Vercel:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**Supabase:**
- Docs: https://supabase.com/docs
- Discord: https://discord.com/invite/supabase

**CopilotKit:**
- Docs: https://docs.copilotkit.ai
- Discord: https://discord.gg/copilotkit

---

## Success Criteria

### Deployment Complete When:
- [ ] Code pushed to GitHub
- [ ] Agent deployed to Railway
- [ ] RAG search working
- [ ] Vercel deployment live
- [ ] HaveIBeenPwned enabled
- [ ] All smoke tests pass
- [ ] No critical errors in logs

### Production Ready When:
- [ ] Beta users onboarded
- [ ] Feedback incorporated
- [ ] Performance optimized
- [ ] Monitoring alerts configured
- [ ] Backup strategy verified
- [ ] Security checklist complete

---

**You're ready to deploy VAULTS! 🚀**

This comprehensive guide combines step-by-step deployment procedures with production best practices, security configurations, and troubleshooting guidance.

For detailed environment variable explanations, see: `ENVIRONMENT_VARIABLES.md`
For security considerations, see: `SECURITY.md`
For architecture details, see: `ARCHITECTURE.md`
