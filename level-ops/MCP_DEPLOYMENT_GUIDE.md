# MCP Server Deployment Guide - VAULTS Platform

## Quick Reference

After restarting Claude Code, use these MCP servers for deployment:

### Current MCP Server Status
```
✓ playwright     - Browser automation
✓ supabase       - Database operations
✓ copilot        - CopilotKit documentation
✓ github         - GitHub repository management
⚠ vercel         - Vercel deployment (OAuth - will authenticate on first use)
✓ railway        - Railway backend deployment
```

---

## Deployment Workflow

### Step 1: Deploy RAG Agent to Railway (CRITICAL - REQUIRED)

**Use Railway MCP:**
```
Ask: "Use Railway MCP to deploy the Python FastAPI agent from the /agent directory"
```

**What Railway MCP will do:**
- Create new Railway project
- Deploy FastAPI backend
- Configure environment variables
- Provide deployment URL for NEXT_PUBLIC_AGENT_URL

**Required Files:**
- `agent/main.py` - FastAPI application
- `agent/requirements.txt` - Python dependencies
- `agent/config.py` - Configuration
- `agent/services/` - Document processing, RAG, embeddings

**Cost:** ~$5-20/month

---

### Step 2: Deploy Next.js to Vercel

**Use Vercel MCP:**
```
Ask: "Use Vercel MCP to deploy the Next.js application to production"
```

**What Vercel MCP will do:**
- Create Vercel project
- Link to GitHub repository
- Deploy from main branch
- Provide production URL

**On First Use:**
- OAuth popup will appear
- Authenticate with your Vercel account
- Grant necessary permissions

---

### Step 3: Configure Environment Variables

**Required for Vercel (6 core + 2 for RAG):**

1. `NEXT_PUBLIC_SUPABASE_URL` - From Supabase dashboard
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase dashboard
3. `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard (secret)
4. `STRIPE_SECRET_KEY` - From Stripe dashboard (secret)
5. `STRIPE_WEBHOOK_SECRET` - From Stripe CLI/dashboard (secret)
6. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - From Stripe dashboard
7. `NEXT_PUBLIC_AGENT_URL` - Railway deployment URL
8. `AGENT_SECRET_KEY` - Generate secure random string

**Use Vercel MCP:**
```
Ask: "Use Vercel MCP to set these environment variables for production"
```

---

### Step 4: Configure Custom Domains

**Primary Domain:** vaults.team
**Email Domain:** vaults.email

**Use Vercel MCP:**
```
Ask: "Use Vercel MCP to configure custom domain vaults.team"
```

---

## Production Checklist

### Before Deployment
- [ ] All environment variables ready
- [ ] Supabase project ID confirmed: `lkjzxsvytsmnvuorqfdl`
- [ ] Stripe keys from dashboard
- [ ] Domain DNS access (vaults.team, vaults.email)

### After Railway Deployment
- [ ] Agent URL received and noted
- [ ] Test agent health endpoint: `{AGENT_URL}/health`
- [ ] Set NEXT_PUBLIC_AGENT_URL in Vercel

### After Vercel Deployment
- [ ] Production URL accessible
- [ ] All environment variables set
- [ ] Custom domains configured
- [ ] SSL certificates active

### Final Tests
- [ ] User signup/login works
- [ ] Vault creation works
- [ ] RAG search functional
- [ ] Stripe checkout flows work
- [ ] Email invites send correctly

---

## MCP Command Examples

### Check Railway Services
```
Ask: "Use Railway MCP to list my projects and services"
```

### Check Vercel Deployments
```
Ask: "Use Vercel MCP to show my recent deployments"
```

### Update Environment Variable
```
Ask: "Use Vercel MCP to update the NEXT_PUBLIC_AGENT_URL environment variable to [URL]"
```

### Redeploy After Changes
```
Ask: "Use Vercel MCP to trigger a new deployment from main branch"
```

---

## Troubleshooting

### Railway Issues
- Check logs: "Use Railway MCP to show logs for [service-name]"
- Restart service: "Use Railway MCP to restart [service-name]"
- Check environment: "Use Railway MCP to list environment variables"

### Vercel Issues
- Check build logs: "Use Vercel MCP to show build logs for latest deployment"
- Check environment: "Use Vercel MCP to list environment variables"
- Rollback: "Use Vercel MCP to rollback to previous deployment"

### Authentication Issues
- Vercel: First use will prompt OAuth - authenticate in browser
- Railway: Token pre-configured, should work immediately
- GitHub: Token pre-configured, should work immediately

---

## Documentation References

- **Full Guide:** `docs/GITHUB_AND_VERCEL_DEPLOYMENT.md`
- **Environment Vars:** `docs/ENVIRONMENT_VARIABLES.md`
- **Agent Setup:** `docs/AGENT_DEPLOYMENT.md`
- **Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **Known Issues:** `KNOWN_ISSUES.md`

---

## Cost Estimates

- **Supabase:** Free tier (sufficient for pilot)
- **Railway:** ~$5-20/month (agent backend)
- **Vercel:** Free tier or Pro $20/month (recommended for production)
- **Stripe:** Pay-as-you-go (transaction fees only)

**Total Estimated:** $25-40/month for production-ready platform

---

## Repository Info

- **GitHub:** https://github.com/dan-ford/vaults-platform
- **Branch:** main
- **Commit:** Latest (222 files, 67,330 lines)
- **Build Status:** ✓ Passing (25.3s)
