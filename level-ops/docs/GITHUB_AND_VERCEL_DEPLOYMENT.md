# GitHub and Vercel Deployment Guide

**Updated:** 2025-10-15
**Status:** Ready to deploy with RAG agent
**Estimated Time:** 2-3 hours

---

## Overview

This guide will walk you through:
1. Creating a new GitHub repository for VAULTS
2. Pushing your code to GitHub
3. Deploying the RAG agent backend to Railway
4. Connecting Vercel to GitHub
5. Configuring environment variables
6. Deploying to production

---

## Part 1: GitHub Repository Setup (15 minutes)

### Step 1: Create New GitHub Repository

1. **Go to GitHub**
   - Navigate to: https://github.com/new
   - Or click the "+" icon → "New repository"

2. **Repository Settings:**
   ```
   Repository name: vaults-platform
   Description: VAULTS - Multi-tenant project management platform with AI
   Visibility: Private (recommended for now)

   DO NOT initialize with:
   ☐ README
   ☐ .gitignore
   ☐ license
   ```

   Click "Create repository"

3. **Copy the Repository URL**
   - You'll see: `https://github.com/dan-ford/vaults-platform.git`
   - Keep this tab open

---

### Step 2: Update Git Remote

Open your terminal in the level-ops directory:

```bash
# Check current directory
pwd
# Should show: /mnt/d/Dropbox/GitHub/GIT Local/level_app_v1/level-ops

# Remove old remote (AidanCB)
git remote remove origin

# Add new VAULTS remote
git remote add origin https://github.com/dan-ford/vaults-platform.git

# Verify
git remote -v
# Should show:
# origin  https://github.com/dan-ford/vaults-platform.git (fetch)
# origin  https://github.com/dan-ford/vaults-platform.git (push)
```

---

### Step 3: Prepare Code for Push

```bash
# Stash any uncommitted changes temporarily
git add -A
git status  # Check what will be committed

# Create initial commit (this might be slow due to Dropbox)
git commit -m "Initial commit: VAULTS platform ready for deployment

- Next.js 15 with App Router
- Supabase integration with RLS
- Multi-tenant architecture
- CopilotKit AI assistant (24+ actions)
- RAG search backend (FastAPI)
- Stripe billing integration (deferred)
- Secrets module (disabled by default)
- Full documentation in docs/

Security improvements:
- CopilotKit API key moved to env variable
- All SECURITY DEFINER functions have search_path set
- Environment validation utility added
- Production-ready vercel.json

Ready for deployment with RAG agent.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Step 4: Push to GitHub

```bash
# Set upstream and push (this might take a few minutes)
git push -u origin main

# If you get an error about branch name, try:
git branch -M main
git push -u origin main
```

**Expected output:**
```
Enumerating objects: 1234, done.
Counting objects: 100% (1234/1234), done.
Delta compression using up to 4 threads
Compressing objects: 100% (567/567), done.
Writing objects: 100% (1234/1234), 2.34 MiB | 1.23 MiB/s, done.
Total 1234 (delta 456), reused 0 (delta 0)
To https://github.com/dan-ford/vaults-platform.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

### Step 5: Verify on GitHub

1. Refresh your GitHub repository page
2. You should see all your code
3. Check that these files are present:
   - ✅ `vercel.json`
   - ✅ `package.json`
   - ✅ `docs/ENVIRONMENT_VARIABLES.md`
   - ✅ `docs/AGENT_DEPLOYMENT.md`
   - ✅ `app/providers.tsx` (with env variable for CopilotKit)

---

## Part 2: RAG Agent Deployment to Railway (30 minutes)

Since RAG **must** be active from the start, let's deploy the agent backend first.

### Step 1: Create Railway Account

1. **Sign Up:**
   - Go to: https://railway.app
   - Click "Start a New Project"
   - Sign up with GitHub account (recommended)

2. **GitHub OAuth:**
   - Authorize Railway to access your repositories
   - This allows easy deployments from git

---

### Step 2: Deploy Agent Backend

**Option A: Deploy from GitHub (Recommended)**

1. **Create New Project:**
   - Dashboard → "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `dan-ford/vaults-platform`
   - Click "Deploy Now"

2. **Configure Root Directory:**
   - Railway will detect the repo
   - Click "Settings" → "Service Settings"
   - Set "Root Directory" to: `agent`
   - Save changes

3. **Railway will auto-detect Python:**
   - Sees `requirements.txt`
   - Uses Python buildpack automatically
   - Starts with `main.py`

**Option B: Deploy from Local Files (Alternative)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
cd agent/
railway init

# Deploy
railway up

# This uploads agent/ directory and deploys
```

---

### Step 3: Configure Environment Variables in Railway

1. **In Railway Dashboard:**
   - Select your agent service
   - Click "Variables" tab

2. **Add Required Variables:**

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://lkjzxsvytsmnvuorqfdl.supabase.co
SUPABASE_SERVICE_KEY=<your-service-key-from-supabase>

# OpenAI (REQUIRED for embeddings)
OPENAI_API_KEY=<your-openai-api-key>

# Optional: RAG Configuration (has defaults)
FUSION_WEIGHT_VECTOR=0.65
FUSION_WEIGHT_BM25=0.35
TOP_K_PRE=100
TOP_K_MMR=15
TOP_K_FINAL=5
```

3. **Get OpenAI API Key:**
   - Go to: https://platform.openai.com/api-keys
   - Create new secret key
   - Copy the key (starts with `sk-proj-...`)
   - **NEVER commit this to git**

4. **Get Supabase Service Key:**
   - Go to: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/settings/api
   - Copy "service_role" key (NOT anon key)
   - This key bypasses RLS (keep secret!)

5. **Save Variables:**
   - Click "Add Variable" for each
   - Railway will automatically redeploy

---

### Step 4: Get Agent URL

1. **In Railway Dashboard:**
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Railway creates: `vaults-agent-production.up.railway.app`

2. **Copy Full URL:**
   ```
   https://vaults-agent-production.up.railway.app
   ```

3. **Test Health Endpoint:**
   - Open in browser: `https://vaults-agent-production.up.railway.app/health`
   - Should see: `{"status": "healthy"}`

---

### Step 5: Verify RAG Backend Works

**Test the /api/search endpoint:**

```bash
curl -X POST https://vaults-agent-production.up.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test search",
    "organization_id": "test-org-id",
    "top_k": 5
  }'
```

**Expected Response:**
```json
{
  "results": [],
  "query": "test search",
  "total_results": 0
}
```

If you get this response (even with 0 results), the agent is working! ✅

---

## Part 3: Vercel Deployment (30 minutes)

### Step 1: Create Vercel Account

1. **Sign Up:**
   - Go to: https://vercel.com
   - Click "Sign Up"
   - Choose "Continue with GitHub"
   - Authorize Vercel

---

### Step 2: Import Project from GitHub

1. **Create New Project:**
   - Dashboard → "Add New..." → "Project"
   - Click "Import" next to `dan-ford/vaults-platform`

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
   - Otherwise deployment will fail

---

### Step 3: Configure Environment Variables

**In Vercel Project Settings → Environment Variables**

Add these variables for **Production** environment:

#### Required Variables (6)

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL
Value: https://lkjzxsvytsmnvuorqfdl.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: <get from Supabase Dashboard → API → anon/public key>

SUPABASE_SERVICE_KEY
Value: <get from Supabase Dashboard → API → service_role key>

# Application (REQUIRED)
NEXT_PUBLIC_APP_NAME
Value: VAULTS

NEXT_PUBLIC_APP_URL
Value: https://vaults-platform.vercel.app
(or your custom domain if ready)

# CopilotKit (REQUIRED)
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY
Value: ck_pub_ab4d5b7b38e07de9596b6f6530b780de
```

#### RAG Agent (REQUIRED for you)

```bash
# Agent Backend URL
FASTAPI_URL
Value: https://vaults-agent-production.up.railway.app

# OpenAI API Key (for client-side AI actions)
OPENAI_API_KEY
Value: <same OpenAI key you used in Railway>
```

**IMPORTANT:**
- For each variable, check: ☑ Production ☑ Preview ☑ Development
- This ensures the same config across all environments

---

### Step 4: Deploy to Vercel

1. **Click "Deploy"**
   - Vercel will:
     - Clone your repository
     - Install dependencies (npm install)
     - Run build (npm run build)
     - Deploy to global CDN

2. **Monitor Build:**
   - Watch the build logs in real-time
   - Should complete in 3-5 minutes
   - Vercel infrastructure is fast!

3. **Expected Output:**
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages (0/0)
   ✓ Collecting build traces
   ✓ Finalizing page optimization

   Route (app)                              Size     First Load JS
   ┌ ○ /                                    1.2 kB    85.3 kB
   ├ ○ /login                               1.5 kB    86.7 kB
   └ ○ /dashboard                           2.1 kB    87.9 kB
   ...

   ✨ Deployment ready
   ```

4. **Get Deployment URL:**
   - Vercel shows: `https://vaults-platform-abc123.vercel.app`
   - This is your staging URL

---

### Step 5: Verify Deployment

1. **Open Deployment URL**
   - Click the link Vercel provides
   - Should see VAULTS login page

2. **Test Basic Flow:**
   - ✅ Page loads (no 500 errors)
   - ✅ Login form appears
   - ✅ Sign up link works
   - ✅ No console errors (F12 → Console)

3. **Test Authentication:**
   - Click "Sign up"
   - Create test account: `test@vaults.team`
   - Verify email sent (check Supabase logs)
   - Complete signup
   - Should redirect to onboarding

4. **Test Organization Creation:**
   - Create test organization: "Test Org"
   - Choose slug: `test-org`
   - Should redirect to dashboard

5. **Test Core Features:**
   - ✅ Dashboard loads
   - ✅ Create a task
   - ✅ Upload a document
   - ✅ AI assistant button appears
   - ✅ Try an AI action (e.g., "Add task: Test RAG")

---

### Step 6: Test RAG Search

**Critical Test - RAG Must Work!**

1. **Upload a Test PDF:**
   - Go to Documents page
   - Click "Upload Document"
   - Upload any PDF (e.g., a test document with known text)
   - Wait for upload to complete

2. **Verify Document Processing:**
   - Check Supabase: `document_chunks` table should have new rows
   - Each chunk should have `embedding` column populated (binary data)
   - If embeddings are NULL, something's wrong with agent

3. **Test AI Document Search:**
   - Click AI assistant button
   - Type: "Search Documents: [query related to PDF content]"
   - Should return relevant chunks from your PDF

4. **If Search Fails:**
   - Check Railway logs: `railway logs`
   - Check Vercel logs: Deployment → Functions
   - Verify `FASTAPI_URL` is correct
   - Verify OpenAI API key is valid

---

## Part 4: Production Configuration (45 minutes)

### Step 1: Enable HaveIBeenPwned (REQUIRED)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl

2. **Navigate to Auth Settings:**
   - Left sidebar → Authentication
   - Click "Policies" tab
   - Scroll to "Password Security" section

3. **Enable Protection:**
   - Toggle "Enable leaked password protection" → ON
   - Click "Save" at bottom

4. **Test:**
   - Try creating user with password: `password123`
   - Should fail: "Password has been leaked in a data breach"

---

### Step 2: Configure Custom Domain (Optional)

**If you're ready to use vaults.team:**

1. **In Vercel Dashboard:**
   - Project Settings → Domains
   - Click "Add Domain"
   - Enter: `vaults.team`
   - Click "Add"

2. **Configure DNS:**
   - Go to your domain registrar (Namecheap, Google Domains, etc.)
   - Add these records:

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
   - Vercel automatically provisions SSL certificate
   - Takes 5-10 minutes
   - You'll see "Certificate issued" ✅

4. **Update Environment Variable:**
   - Vercel → Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` to `https://vaults.team`
   - Redeploy

---

### Step 3: Production Smoke Test

**Complete Test Checklist:**

#### Authentication
- [ ] User signup works
- [ ] Email verification works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works (test email flow)
- [ ] HaveIBeenPwned blocks weak passwords

#### Organizations
- [ ] Create organization
- [ ] Invite team member (test email)
- [ ] Accept invitation
- [ ] Switch between organizations
- [ ] Update organization settings
- [ ] Upload organization logo

#### Core Features
- [ ] Tasks: Create, edit, delete, mark complete
- [ ] Milestones: Create, track progress
- [ ] Risks: Create, update probability/impact
- [ ] Documents: Upload PDF, view, download
- [ ] Decisions: Create ADR-style decision
- [ ] Contacts: Add contact with details
- [ ] Reports: Generate weekly summary

#### AI Features
- [ ] AI assistant opens
- [ ] AI action: Add task
- [ ] AI action: Create risk
- [ ] AI action: Search documents (RAG)
- [ ] AI action: Summarize decisions
- [ ] AI responses are contextual

#### RAG Search (CRITICAL)
- [ ] Upload document with known content
- [ ] Check `document_chunks` table populated
- [ ] Check embeddings generated
- [ ] AI search returns relevant results
- [ ] Search across multiple documents works

#### Real-time
- [ ] Changes from one browser appear in another
- [ ] Notification count updates live
- [ ] New tasks appear without refresh

#### Performance
- [ ] Page loads < 3 seconds
- [ ] No console errors
- [ ] AI responses < 5 seconds
- [ ] Document upload < 30 seconds
- [ ] Mobile responsive (test on phone)

---

## Part 5: Monitoring & Maintenance

### Vercel Analytics

1. **Enable Analytics:**
   - Project Settings → Analytics
   - Turn on Web Analytics (free tier)

2. **Monitor:**
   - Page views
   - Performance (Core Web Vitals)
   - Top pages
   - Error rate

---

### Supabase Monitoring

1. **Database Health:**
   - Dashboard → Reports
   - Monitor disk usage
   - Check connection count
   - Watch for slow queries

2. **Set Up Alerts:**
   - Settings → Integrations
   - Add webhook for critical alerts
   - Get notified of downtime

---

### Railway Monitoring

1. **Agent Health:**
   - Railway Dashboard → Metrics
   - Monitor memory usage
   - Check request rate
   - Watch error logs

2. **View Logs:**
   ```bash
   railway logs
   ```

3. **Common Issues:**
   - Cold starts (first request slow)
   - Out of memory (upgrade plan)
   - OpenAI rate limits (add retry logic)

---

## Troubleshooting

### Issue: Vercel Build Fails

**Symptom:** Build errors during deployment

**Common Causes:**
1. Missing environment variables
2. TypeScript errors
3. Missing dependencies

**Solution:**
- Check build logs for specific error
- Verify all environment variables set
- Check that `vercel.json` is in root of `level-ops/`

---

### Issue: RAG Search Returns Nothing

**Symptom:** AI search doesn't find documents

**Diagnosis:**
```sql
-- Check if documents are being chunked
SELECT COUNT(*) FROM document_chunks;

-- Check if embeddings are generated
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;

-- Check recent errors
SELECT * FROM activity_log WHERE action = 'embed_document' AND status = 'error';
```

**Solutions:**
1. Verify `FASTAPI_URL` is correct
2. Check Railway agent logs
3. Verify OpenAI API key is valid
4. Check OpenAI usage limits

---

### Issue: Emails Not Sending

**Symptom:** Invite emails never arrive

**Cause:** Using Supabase built-in email (rate limited)

**Solution:**
- Short term: Check spam folder
- Long term: Configure Resend (see ENVIRONMENT_VARIABLES.md)

---

## Cost Summary

### Current Configuration

**Supabase:**
- Free tier: $0/month (500MB database, 1GB storage)
- Pro tier: $25/month (8GB database, 100GB storage)

**Railway (Agent Backend):**
- Hobby: $5/month (500 hours compute)
- Pro: $20/month (unlimited hours, better performance)

**Vercel:**
- Hobby: $0/month (personal projects)
- Pro: $20/month (team features, better analytics)

**OpenAI (Embeddings):**
- text-embedding-3-small: $0.02 per 1M tokens
- Typical usage: $1-10/month depending on document volume

**Total Minimum:** $5-10/month (Railway Hobby + OpenAI)
**Total Recommended:** $50-70/month (all Pro plans)

---

## Next Steps After Deployment

### Week 1: User Testing
- [ ] Create 3-5 test organizations
- [ ] Invite beta users
- [ ] Gather feedback
- [ ] Fix critical bugs

### Week 2: Monitoring
- [ ] Check analytics daily
- [ ] Monitor error rates
- [ ] Review Supabase usage
- [ ] Optimize slow queries

### Phase 2: Optional Features
- [ ] Enable Stripe billing (when needed)
- [ ] Configure transactional email (Resend)
- [ ] Implement real RFC 3161 for Secrets module
- [ ] Add custom domain DNS wizard
- [ ] Configure SSO providers

---

## Success Criteria

### ✅ Deployment Complete When:
- [ ] Code pushed to GitHub
- [ ] Agent deployed to Railway
- [ ] RAG search working
- [ ] Vercel deployment live
- [ ] Custom domain configured
- [ ] HaveIBeenPwned enabled
- [ ] All smoke tests pass
- [ ] No critical errors in logs

### ✅ Production Ready When:
- [ ] Beta users onboarded
- [ ] Feedback incorporated
- [ ] Performance optimized
- [ ] Monitoring alerts configured
- [ ] Backup strategy verified
- [ ] Security checklist complete

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

**You're ready to deploy! 🚀**

Follow these steps in order, and you'll have VAULTS live with full RAG functionality in 2-3 hours.
