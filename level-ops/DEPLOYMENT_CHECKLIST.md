# VAULTS Deployment Checklist

**Start Time:** _________
**Completed:** _________
**Deployed By:** _________

---

## Pre-Deployment (Complete ✅)

- [x] CopilotKit API key moved to environment variable
- [x] Environment variables documented
- [x] Vercel configuration created (vercel.json)
- [x] RAG agent deployment strategy decided
- [x] Secrets module disabled (not production-ready)
- [x] Supabase security warnings fixed
- [x] Environment validation utility created
- [x] Comprehensive documentation created

---

## Part 1: GitHub Setup (15 min)

- [ ] Create new GitHub repository `vaults-platform`
- [ ] Set repository to Private
- [ ] Copy repository URL
- [ ] Remove old git remote: `git remote remove origin`
- [ ] Add new remote: `git remote add origin https://github.com/dan-ford/vaults-platform.git`
- [ ] Commit all changes: `git add -A && git commit -m "Initial commit"`
- [ ] Push to GitHub: `git push -u origin main`
- [ ] Verify code visible on GitHub

**Time:** _____ min | **Status:** ☐ Complete

---

## Part 2: RAG Agent Deployment (30 min)

### Railway Setup
- [ ] Create Railway account at https://railway.app
- [ ] Connect GitHub account
- [ ] Create new project from GitHub
- [ ] Select `dan-ford/vaults-platform` repository
- [ ] Set root directory to `agent`

### Environment Variables
- [ ] Get OpenAI API key from https://platform.openai.com/api-keys
- [ ] Get Supabase service key from dashboard
- [ ] Add to Railway:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `OPENAI_API_KEY`

### Verification
- [ ] Railway deployment completes successfully
- [ ] Generate domain in Railway settings
- [ ] Copy agent URL: `https://_______.up.railway.app`
- [ ] Test health endpoint: `/health` returns `{"status": "healthy"}`
- [ ] Test search endpoint (returns empty results is OK)

**Agent URL:** _________________________________

**Time:** _____ min | **Status:** ☐ Complete

---

## Part 3: Vercel Deployment (30 min)

### Vercel Setup
- [ ] Create Vercel account at https://vercel.com
- [ ] Connect GitHub account
- [ ] Import `dan-ford/vaults-platform` project
- [ ] Set root directory to `level-ops`
- [ ] Framework: Next.js (auto-detected)

### Environment Variables (6 Required + 2 RAG)

**Supabase:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://lkjzxsvytsmnvuorqfdl.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `_________________________________`
- [ ] `SUPABASE_SERVICE_KEY` = `_________________________________`

**Application:**
- [ ] `NEXT_PUBLIC_APP_NAME` = `VAULTS`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://vaults-platform.vercel.app` (or custom domain)

**CopilotKit:**
- [ ] `NEXT_PUBLIC_COPILOT_CLOUD_API_KEY` = `ck_pub_ab4d5b7b38e07de9596b6f6530b780de`

**RAG (Required):**
- [ ] `FASTAPI_URL` = `https://_______.up.railway.app` (from Part 2)
- [ ] `OPENAI_API_KEY` = `_________________________________` (same as Railway)

### Deployment
- [ ] Click "Deploy"
- [ ] Monitor build logs (3-5 minutes)
- [ ] Build completes successfully
- [ ] Copy deployment URL

**Deployment URL:** _________________________________

**Time:** _____ min | **Status:** ☐ Complete

---

## Part 4: Smoke Testing (30 min)

### Authentication
- [ ] Open deployment URL
- [ ] Login page loads correctly
- [ ] Click "Sign up"
- [ ] Create test account: `test@vaults.team`
- [ ] Receive verification email
- [ ] Complete signup
- [ ] Redirected to onboarding

### Organization
- [ ] Create organization: "Test Org"
- [ ] Choose slug: `test-org`
- [ ] Redirected to dashboard
- [ ] Dashboard loads without errors

### Core Features
- [ ] Create a task
- [ ] Create a milestone
- [ ] Create a risk
- [ ] Upload a PDF document
- [ ] Create a decision
- [ ] Add a contact
- [ ] Generate a report

### AI Assistant
- [ ] AI button appears in bottom-right
- [ ] Click AI button opens dialog
- [ ] Try AI action: "Add task: Test the AI assistant"
- [ ] Task is created successfully
- [ ] AI responds with confirmation

### RAG Search (CRITICAL)
- [ ] Upload test PDF with known content
- [ ] Wait 30 seconds for processing
- [ ] Check Supabase: `document_chunks` table has new rows
- [ ] Check embeddings: `embedding` column is NOT NULL
- [ ] Open AI assistant
- [ ] Type: "Search Documents: [keyword from PDF]"
- [ ] AI returns relevant chunks from PDF
- [ ] Result accuracy is acceptable

**Time:** _____ min | **Status:** ☐ Complete

---

## Part 5: Production Configuration (20 min)

### Supabase Security
- [ ] Go to https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl
- [ ] Authentication → Policies → Password Security
- [ ] Enable "Leaked password protection" → ON
- [ ] Save changes
- [ ] Test: Try password `password123` (should fail)

### Custom Domain (Optional)
- [ ] Vercel: Add domain `vaults.team`
- [ ] Configure DNS:
  - [ ] A record: `@` → `76.76.21.21`
  - [ ] CNAME record: `www` → `cname.vercel-dns.com`
- [ ] Wait for SSL certificate (5-10 min)
- [ ] Update `NEXT_PUBLIC_APP_URL` to `https://vaults.team`
- [ ] Redeploy

### Monitoring
- [ ] Vercel: Enable Web Analytics
- [ ] Railway: Check metrics dashboard
- [ ] Supabase: Review database health

**Time:** _____ min | **Status:** ☐ Complete

---

## Final Verification

### Functional
- [ ] All core features work
- [ ] AI assistant responds correctly
- [ ] RAG search returns relevant results
- [ ] Real-time updates work
- [ ] Mobile responsive
- [ ] No console errors

### Performance
- [ ] Page load < 3 seconds
- [ ] AI response < 5 seconds
- [ ] Document upload < 30 seconds
- [ ] No memory leaks

### Security
- [ ] HaveIBeenPwned enabled
- [ ] RLS working (users can't see other orgs)
- [ ] No secrets in source code
- [ ] HTTPS enforced
- [ ] Security headers present

---

## Post-Deployment Tasks

### Immediate
- [ ] Create production organization
- [ ] Upload sample data
- [ ] Invite first beta user
- [ ] Send deployment announcement

### Week 1
- [ ] Monitor error logs daily
- [ ] Check analytics
- [ ] Gather user feedback
- [ ] Fix critical bugs

### Week 2
- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Plan Phase 2 features

---

## Rollback Plan (If Needed)

### If Vercel Deployment Fails:
1. Check deployment logs for errors
2. Verify environment variables
3. Try previous deployment: Vercel → Deployments → Redeploy

### If RAG Agent Fails:
1. Check Railway logs: `railway logs`
2. Verify OpenAI API key valid
3. Check Supabase connection
4. Redeploy Railway service

### If Database Issues:
1. Supabase → Database → Backups
2. Restore previous backup
3. Re-run migrations if needed

---

## Success Criteria

**✅ MVP Launch Complete:**
- [ ] Code on GitHub
- [ ] Agent deployed to Railway
- [ ] RAG search working
- [ ] Vercel deployment live
- [ ] All smoke tests pass
- [ ] HaveIBeenPwned enabled
- [ ] No critical errors
- [ ] First user onboarded

---

## Deployment Notes

**Issues Encountered:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Solutions Applied:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Performance Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Next Actions:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Sign-Off

**Deployment Completed:** ☐ Yes ☐ No

**Deployed By:** _________________________________

**Date:** _________________________________

**Time:** _________________________________

**Total Duration:** _____ hours _____ minutes

**Status:** ☐ Production Ready ☐ Needs Fixes

---

**You're ready to deploy VAULTS with full RAG functionality! 🚀**

Follow this checklist step-by-step and check off each item as you complete it.

Detailed instructions available in: `docs/GITHUB_AND_VERCEL_DEPLOYMENT.md`
