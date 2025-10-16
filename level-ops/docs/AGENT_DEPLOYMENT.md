# Agent Backend Deployment Strategy

## Decision: Defer RAG Search for MVP

**Status:** RECOMMENDED APPROACH
**Date:** 2025-10-15
**Rationale:** Focus on core features for initial deployment, add RAG in Phase 2

---

## Executive Summary

The VAULTS agent backend (FastAPI with RAG search) is **fully implemented** but requires separate deployment infrastructure. For MVP launch, we recommend **deferring RAG functionality** and deploying the agent backend in Phase 2.

### Impact of Deferral
- **AI Assistant:** ✅ Still works (24+ actions for tasks, risks, milestones, etc.)
- **Document Upload:** ✅ Still works (PDF upload, text extraction, storage)
- **Document Search:** ❌ Disabled (no semantic/hybrid search)
- **"Search Documents" AI Action:** ❌ Disabled (requires RAG backend)

### User Experience Without RAG
Users can:
- Upload and download documents normally
- View document metadata and previews
- Use AI for tasks, risks, decisions, etc.
- Search other modules (tasks, contacts, etc.)

Users cannot:
- Search document contents with AI
- Ask questions about uploaded documents
- Use hybrid vector+keyword search

**Workaround:** Users search documents manually via file browser

---

## The Three Options

### Option A: Defer RAG (RECOMMENDED FOR MVP)
**Deploy:** Next.js app only
**Features:** All core modules except document search
**Timeline:** 0 additional hours
**Cost:** $0/month additional
**Complexity:** Simple

**Pros:**
- Fastest path to deployment
- No additional infrastructure
- Core features fully functional
- Can add later without code changes

**Cons:**
- No AI document search initially
- Competitive differentiation reduced

**When to Enable Phase 2:**
- After MVP validation with users
- When document search becomes requested feature
- Estimated timeline: 2-4 weeks post-launch

---

### Option B: Deploy to Railway (RECOMMENDED FOR PHASE 2)
**Deploy:** Next.js + FastAPI on Railway
**Features:** Full platform including RAG search
**Timeline:** 2 hours setup
**Cost:** $5-20/month
**Complexity:** Low

**Implementation Steps:**

1. **Create Railway Account** (5 min)
   - Sign up at https://railway.app
   - Connect GitHub account

2. **Deploy Agent Backend** (30 min)
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login
   railway login

   # Create new project
   railway init

   # Deploy from agent/ directory
   cd agent
   railway up
   ```

3. **Configure Environment Variables** (15 min)
   ```bash
   railway variables set OPENAI_API_KEY=sk-proj-...
   railway variables set SUPABASE_URL=https://lkjzxsvytsmnvuorqfdl.supabase.co
   railway variables set SUPABASE_SERVICE_KEY=eyJhbGc...
   ```

4. **Get Deployment URL** (5 min)
   ```bash
   railway domain
   # Example: https://vaults-agent.up.railway.app
   ```

5. **Update Vercel Environment** (5 min)
   - Add `FASTAPI_URL=https://vaults-agent.up.railway.app`
   - Redeploy Next.js app

6. **Test RAG Functionality** (30 min)
   - Upload test document
   - Try "Search Documents" AI action
   - Verify embeddings generated
   - Check search results quality

**Railway Pricing:**
- Hobby Plan: $5/month (500 hours compute)
- Developer Plan: $10/month (shared CPU, 8GB RAM)
- Pro Plan: $20/month (dedicated resources)

**Pros:**
- Easy deployment (one command)
- Automatic HTTPS
- Good free tier
- Scales automatically
- Built-in metrics

**Cons:**
- Additional service to monitor
- Cold starts possible on free tier
- Requires OpenAI API key ($0.10 per 1M embedding tokens)

---

### Option C: Deploy to Vercel Serverless (NOT RECOMMENDED)
**Deploy:** Convert FastAPI to Vercel Functions
**Features:** Full platform including RAG
**Timeline:** 8-12 hours refactoring
**Cost:** $0/month (included in Vercel)
**Complexity:** High

**Why Not Recommended:**
- Significant code refactoring required
- Cold starts (5-10 seconds) hurt RAG performance
- 10-second timeout may be too short for complex queries
- Vector search requires persistent connection (not ideal for serverless)
- Python serverless on Vercel is less mature than Node.js

**Only Consider If:**
- Single platform deployment is requirement
- No budget for additional services
- RAG performance not critical

---

## Agent Backend Architecture

### Current Implementation

**Stack:**
- FastAPI (Python web framework)
- Pydantic v2 (request validation)
- Supabase Python client (database access)
- pgvector (vector similarity search)
- rank_bm25 (keyword matching)
- OpenAI embeddings (text-embedding-3-small)

**Key Files:**
```
agent/
├── main.py              # FastAPI app entry point
├── config.py            # Environment configuration
├── routes/
│   ├── rag.py          # RAG search endpoints
│   └── health.py       # Health check
├── services/
│   ├── embeddings.py   # OpenAI embedding generation
│   ├── vector_search.py # pgvector similarity
│   └── hybrid_search.py # Fusion of vector + BM25
└── requirements.txt     # Python dependencies
```

**API Endpoints:**
- `GET /health` - Health check
- `POST /api/search` - Hybrid search (vector + BM25)
- `POST /api/embed` - Generate embeddings for document chunks

**Database Integration:**
- Reads from `document_chunks` table (created by PDF upload)
- Uses pgvector extension for similarity search
- Respects RLS (uses service key but filters by org)

---

## Deployment Checklist (When Ready)

### Pre-Deployment
- [ ] OpenAI API key obtained
- [ ] Railway account created (or alternative chosen)
- [ ] Test data uploaded to Supabase
- [ ] Vector indexes created in database

### Deployment
- [ ] Agent deployed to Railway
- [ ] Environment variables configured
- [ ] Health endpoint returns 200
- [ ] Database connection verified

### Integration
- [ ] `FASTAPI_URL` added to Vercel
- [ ] Next.js app redeployed
- [ ] CORS configured for vaults.team domain
- [ ] Test document search from UI

### Validation
- [ ] Upload PDF and verify chunks created
- [ ] Embeddings generated (check `document_chunks.embedding` not null)
- [ ] Search returns relevant results
- [ ] Response time <3 seconds
- [ ] Error handling works (try invalid queries)

---

## Alternative Hosting Options

### Render.com
**Pros:** Similar to Railway, good Python support
**Pricing:** Free tier available, paid starts $7/month
**Setup:** Similar to Railway (buildpack auto-detection)

### Fly.io
**Pros:** Edge deployment, very fast cold starts
**Pricing:** Free tier limited, paid $1.94/month minimum
**Setup:** Requires Dockerfile (already provided)

### Digital Ocean App Platform
**Pros:** Predictable pricing, good docs
**Pricing:** $5/month minimum (Basic plan)
**Setup:** GitHub integration, auto-deploy

### AWS Lambda / GCP Cloud Run
**Pros:** Pay-per-request, mature platforms
**Pricing:** Very cheap at low volume
**Setup:** More complex (container registry, IAM, etc.)

---

## Monitoring & Maintenance

### Key Metrics to Track
- Request latency (p50, p95, p99)
- Embedding generation time
- Search result quality (manual QA)
- Error rate
- Memory usage (embeddings can be large)

### Common Issues

**Issue:** Slow search results
**Solution:** Add indexes to `document_chunks(organization_id, embedding)`

**Issue:** Out of memory
**Solution:** Increase Railway plan or reduce batch size

**Issue:** Embeddings not generated
**Solution:** Check OpenAI API key and quota

**Issue:** CORS errors
**Solution:** Configure allowed origins in agent/main.py

---

## Cost Analysis

### OpenAI Embeddings
**Model:** text-embedding-3-small
**Cost:** $0.02 per 1M tokens (~1,500 pages)

**Example Costs:**
- 100 pages: $0.001 (negligible)
- 1,000 pages: $0.013 (~$0.01)
- 10,000 pages: $0.13 (~$0.13)
- 100,000 pages: $1.30 (~$1.30)

**Typical Usage:**
- Small org (10 users, 1,000 documents): ~$0.20/month
- Medium org (50 users, 10,000 documents): ~$2/month
- Enterprise org (500 users, 100,000 documents): ~$20/month

### Hosting (Railway)
**Hobby:** $5/month (500 hours = 20.8 days uptime)
**Pro:** $20/month (unlimited hours, better performance)

**Recommendation:** Start with Hobby, upgrade if usage high

---

## Decision Log

### MVP Launch (Phase 1)
**Decision:** Defer RAG search
**Reason:** Focus on core feature validation
**Impact:** AI document search disabled
**Alternative:** Manual document browsing

### Post-MVP (Phase 2)
**Decision:** Deploy to Railway when RAG becomes valuable
**Trigger:** User feedback requesting document search
**Timeline:** 2 hours implementation
**Cost:** $5-25/month (Railway + OpenAI)

### Future (Phase 3)
**Consider:** Self-hosted vector database (Qdrant, Weaviate)
**When:** >1M documents, cost optimization needed
**Benefit:** Lower embedding costs, more control

---

## Related Documentation
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [RAG Implementation Plan](../RAG_IMPLEMENTATION_PLAN.md)
- [Production Considerations](../PRODUCTION_CONSIDERATIONS.md)
