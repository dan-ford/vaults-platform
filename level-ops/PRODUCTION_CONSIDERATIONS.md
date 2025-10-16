# Production Deployment Considerations

> **Purpose:** This document outlines critical production considerations to ensure Level Ops deploys successfully as a fully functional, secure, and legally compliant application.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database & RLS](#database--rls)
3. [Supabase Configuration](#supabase-configuration)
4. [Secrets Module - Cryptographic Timestamping](#secrets-module---cryptographic-timestamping)
5. [Storage & File Management](#storage--file-management)
6. [Authentication & Authorization](#authentication--authorization)
7. [AI Agent & RAG](#ai-agent--rag)
8. [Performance & Scalability](#performance--scalability)
9. [Security & Compliance](#security--compliance)
10. [Monitoring & Logging](#monitoring--logging)
11. [Deployment Checklist](#deployment-checklist)

---

## 1. Environment Variables

### Required Variables

```env
# Supabase (CRITICAL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_KEY=your-production-service-key  # KEEP SECRET

# Application
NEXT_PUBLIC_APP_NAME=VAULTS
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# CopilotKit
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=your-production-copilot-key

# Agent API (FastAPI backend for RAG)
FASTAPI_URL=https://your-agent-api-domain.com

# OpenAI API (for embeddings)
OPENAI_API_KEY=your-production-openai-key
```

### Secrets Module - RFC 3161 Timestamping

```env
# CRITICAL FOR LEGAL COMPLIANCE
# Use a commercial TSA in production, NOT FreeTSA
TIMESTAMP_AUTHORITY_URL=https://timestamp.digicert.com

# Optional: eIDAS Qualified Timestamp Service Provider (EU/UK)
EIDAS_QTSP_URL=https://qtsp.provider.com/tsr
EIDAS_QTSP_API_KEY=your-qtsp-api-key
```

**⚠️ PRODUCTION REQUIREMENT:**
- **FreeTSA is NOT suitable for production** - it's a free service for testing only
- **Use a commercial TSA:**
  - DigiCert: https://timestamp.digicert.com
  - Sectigo: https://timestamp.sectigo.com
  - GlobalSign: https://timestamp.globalsign.com
- **Cost:** Typically included with SSL certificates or ~$500-2000/year
- **Verification:** Ensure TSA certificate chain is valid and trusted

### RAG Configuration

```env
FUSION_WEIGHT_VECTOR=0.65
FUSION_WEIGHT_BM25=0.35
TOP_K_PRE=100
TOP_K_MMR=15
TOP_K_FINAL=5
RERANK_ENABLED=true
RERANK_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
```

---

## 2. Database & RLS

### Pre-Deployment Verification

**Run these checks before going live:**

```sql
-- 1. Verify RLS is enabled on ALL tables
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
-- Should return ZERO rows (except lookup tables if any)

-- 3. Test RLS with test user
SET ROLE authenticated;
SELECT count(*) FROM secrets;  -- Should only see user's org secrets
RESET ROLE;
```

### Critical RLS Policies to Verify

- ✅ `secrets` - deny-by-default, org membership required
- ✅ `secret_versions` - immutable (no UPDATE/DELETE policies)
- ✅ `secret_files` - immutable (no UPDATE/DELETE policies)
- ✅ `secret_access` - admin/owner only for grants
- ✅ `secret_audit` - write-only for users, read-only for admins
- ✅ `organizations` - org membership required
- ✅ `org_memberships` - strict role-based access
- ✅ `documents` - org scoped
- ✅ `tasks`, `milestones`, `risks`, `decisions`, `contacts` - org scoped

### Migration Verification

```bash
# Verify all migrations applied
npx supabase db pull --schema public

# Check migration history
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

---

## 3. Supabase Configuration

### Realtime Setup

**Verify all tables are in realtime publication:**

```sql
-- List all tables in realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Expected tables:
-- - secrets
-- - secret_versions
-- - secret_access
-- - organizations
-- - org_memberships
-- - documents
-- - tasks, milestones, risks, decisions, contacts, reports
```

### Storage Buckets

**Create and configure buckets:**

1. **`documents`** bucket
   - Path: `tenants/{tenantId}/`
   - RLS: Enforce based on org membership
   - Max file size: 10MB
   - Allowed types: `application/pdf`

2. **`vault-secrets`** bucket (for Secrets module)
   - Path: `vaults/{vaultId}/secrets/{secretId}/{versionId}/`
   - RLS: Strict - only org members with explicit secret access
   - Versioning: **ENABLED** (critical for immutability)
   - Max file size: 25MB
   - Allowed types: `*/*` (any file type for attachments)

3. **`org-logos`** bucket
   - Path: `{orgId}/`
   - Public read
   - Max file size: 5MB
   - Allowed types: `image/*`

4. **`avatars`** bucket
   - Path: `{userId}/`
   - Public read
   - Max file size: 5MB
   - Allowed types: `image/*`

### Storage Policies (RLS)

```sql
-- Example: vault-secrets bucket policy
CREATE POLICY "Org members can read secret files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vault-secrets'
  AND auth.uid() IN (
    SELECT user_id FROM org_memberships
    WHERE org_id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Editors can upload secret files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vault-secrets'
  AND auth.uid() IN (
    SELECT user_id FROM org_memberships
    WHERE org_id = (storage.foldername(name))[1]::uuid
    AND role IN ('OWNER', 'ADMIN', 'EDITOR')
  )
);
```

---

## 4. Secrets Module - Cryptographic Timestamping

### Production TSA Setup

**Step 1: Choose a TSA Provider**

| Provider | URL | Cost | Trust Level |
|----------|-----|------|-------------|
| DigiCert | https://timestamp.digicert.com | Included with SSL cert | High |
| Sectigo | https://timestamp.sectigo.com | ~$500/year | High |
| GlobalSign | https://timestamp.globalsign.com | ~$1000/year | High |

**Step 2: Test TSA Connection**

```bash
# Test timestamp request (requires openssl)
openssl ts -query -data test.txt -sha256 -cert -out request.tsq
curl -H "Content-Type: application/timestamp-query" \
     --data-binary @request.tsq \
     https://timestamp.digicert.com \
     -o response.tsr

# Verify response
openssl ts -reply -in response.tsr -text
```

**Step 3: Implement RFC 3161 Library**

Replace mock implementation in `/api/secrets/timestamp/route.ts` with real library:

```bash
npm install rfc3161-client
```

```typescript
import { TimeStampClient } from 'rfc3161-client';

const client = new TimeStampClient({
  tsaUrl: process.env.TIMESTAMP_AUTHORITY_URL,
  hashAlgorithm: 'sha256',
});

const token = await client.timestamp(Buffer.from(hash, 'hex'));
```

**Step 4: Verification Script**

Ensure the verification script (`scripts/verify-secret-evidence.js`) uses real TSA certificate validation:

```javascript
const { verifyTimeStampToken } = require('rfc3161-client');

// Verify TSA token against trusted CA bundle
const isValid = await verifyTimeStampToken(token, {
  trustedCerts: [/* TSA CA certificates */],
});
```

### eIDAS Qualified Timestamps (EU/UK Only)

**For EU/UK customers requiring eIDAS compliance:**

1. **Choose a Qualified Trust Service Provider (QTSP):**
   - Intesi Group (Italy)
   - Namirial (Luxembourg)
   - SwissSign (Switzerland)

2. **Obtain API credentials** - typically requires business verification

3. **Configure in environment:**
   ```env
   EIDAS_QTSP_URL=https://qtsp.provider.com/api/v1/timestamp
   EIDAS_QTSP_API_KEY=your-api-key
   ```

4. **Update seal API** to call eIDAS QTSP in addition to RFC 3161

5. **Store both tokens:**
   - `tsa_token` - RFC 3161 (international)
   - `eidas_qts` - Qualified timestamp (EU/UK legal presumption)

### Legal Evidence Requirements

**Before deploying Secrets module, ensure:**

- ✅ TSA is from a trusted commercial provider
- ✅ TSA certificate chain is valid and trusted
- ✅ Timestamp tokens are stored in `bytea` format
- ✅ SHA-256 hashes are computed correctly (canonical JSON)
- ✅ Audit trail captures: actor, action, IP, user agent, timestamp
- ✅ Version records are truly immutable (no UPDATE/DELETE policies)
- ✅ Storage versioning is enabled (backup for deleted versions)
- ✅ Evidence export bundle includes verification script
- ✅ `SECURITY.md` documents the sealing process

---

## 5. Storage & File Management

### PDF Text Extraction

**Production considerations for `/api/extract-pdf-text`:**

- Uses `pdfjs-dist` library (Mozilla's PDF.js)
- Server-side only (no client-side extraction)
- Max file size: 10MB (enforced in UI)
- Timeout: 30 seconds per file
- Memory: ~100MB per concurrent extraction

**Scaling recommendations:**
- For high volume: offload to background queue (BullMQ + Redis)
- For large files: use streaming extraction
- Monitor memory usage: `pm2 monit` or similar

### File Upload Limits

- Documents: 10MB
- Secret attachments: 25MB total per secret
- Logos: 5MB
- Avatars: 5MB

**Enforce in middleware:**

```typescript
// middleware.ts
export const config = {
  matcher: '/api/upload/:path*',
};

export function middleware(request: NextRequest) {
  const size = request.headers.get('content-length');
  if (size && parseInt(size) > 10 * 1024 * 1024) {
    return new Response('File too large', { status: 413 });
  }
}
```

---

## 6. Authentication & Authorization

### Email Verification

**Enable in Supabase Dashboard:**
- Auth → Settings → Email Auth
- Enable "Confirm email"
- Set up email templates with branding

### Password Requirements

```typescript
// Enforce in signup flow
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REQUIREMENTS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
```

### Session Management

- Session duration: 7 days (default)
- Refresh token rotation: enabled
- Concurrent sessions: allowed (multi-device)

### OAuth Providers (Optional)

Configure in Supabase Dashboard if needed:
- Google
- GitHub
- Microsoft

---

## 7. AI Agent & RAG

### FastAPI Backend

**Deployment options:**

1. **Separate service (recommended):**
   ```bash
   # Deploy to Railway, Render, or DigitalOcean App Platform
   cd agent
   railway up
   ```

2. **Same VPC as Next.js (for security):**
   - Use internal networking
   - No public endpoint

### Vector Database

**Supabase pgvector is already configured:**

```sql
-- Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify embeddings table
\d document_chunks;
-- Should have: embedding vector(1536)
```

### RAG Performance Tuning

**Production settings (adjust based on load):**

```env
FUSION_WEIGHT_VECTOR=0.65  # Semantic search weight
FUSION_WEIGHT_BM25=0.35    # Keyword search weight
TOP_K_PRE=100              # Pre-filter candidates
TOP_K_MMR=15               # After MMR diversity
TOP_K_FINAL=5              # Final results to user
RERANK_ENABLED=true        # Use cross-encoder reranking
```

**Monitor these metrics:**
- Query latency: target <500ms
- Embedding generation: <200ms per document
- Reranking: <100ms

### OpenAI API Limits

- Rate limits: 3500 requests/minute (tier 1)
- Token limits: 1M tokens/minute
- Embedding model: `text-embedding-3-small` (cheaper, faster)

**Cost optimization:**
- Cache embeddings (already implemented)
- Batch embed operations
- Monitor usage: OpenAI dashboard

---

## 8. Performance & Scalability

### Database Indexes

**Verify all critical indexes exist:**

```sql
-- List all indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Critical indexes (should exist):
-- - secrets: org_id, status, vault_id
-- - secret_versions: secret_id, created_at
-- - secret_audit: secret_id, actor_id, created_at
-- - documents: org_id, created_at
-- - tasks: org_id, status, assignee_id
```

### Query Performance

**Run EXPLAIN ANALYZE on common queries:**

```sql
EXPLAIN ANALYZE
SELECT * FROM secrets
WHERE org_id = 'uuid'
ORDER BY created_at DESC
LIMIT 50;

-- Look for:
-- - Index Scan (good)
-- - Sequential Scan (bad - add index)
-- - Execution time < 50ms
```

### Caching Strategy

- **TanStack Query:** Already configured with staleTime/cacheTime
- **Server Components:** Use Next.js cache where possible
- **API Routes:** Add cache headers for static data

```typescript
// Example: cache organization settings
export async function GET(request: Request) {
  const data = await fetchOrgSettings();
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

### Rate Limiting

**Implement for API routes:**

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

export async function POST(request: Request) {
  // Apply rate limiting
  await limiter(request);
  // ... rest of handler
}
```

---

## 9. Security & Compliance

### HTTPS & SSL

- ✅ Enforce HTTPS in production
- ✅ Use TLS 1.2 or higher
- ✅ HSTS header enabled
- ✅ Redirect HTTP → HTTPS

```typescript
// middleware.ts
if (process.env.NODE_ENV === 'production' && !request.url.startsWith('https://')) {
  return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}`);
}
```

### Content Security Policy

```typescript
// middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://lkjzxsvytsmnvuorqfdl.supabase.co;
  connect-src 'self' https://lkjzxsvytsmnvuorqfdl.supabase.co https://api.openai.com;
  frame-ancestors 'none';
`;
```

### Secrets Management

**NEVER commit to Git:**
- ✅ `.env.local` in `.gitignore`
- ✅ Use environment variables in deployment platform
- ✅ Rotate secrets quarterly
- ✅ Use separate secrets for dev/staging/prod

### GDPR & Data Privacy

**Ensure compliance:**
- ✅ Cookie consent banner (if using analytics)
- ✅ Privacy policy link in footer
- ✅ Data export capability (user can download their data)
- ✅ Data deletion on account termination
- ✅ Audit trail for data access (already implemented)

### Trade Secrets Protection

**For Secrets module legal compliance:**
- ✅ NDA click-wrap before viewing sealed secrets
- ✅ Audit trail with IP address and user agent
- ✅ Watermarked viewing (implemented in Phase 4)
- ✅ Download requires reason code
- ✅ Anomaly detection for suspicious access
- ✅ Evidence export bundle with verification
- ✅ `SECURITY.md` documents reasonable measures

---

## 10. Monitoring & Logging

### Application Monitoring

**Recommended tools:**
- **Vercel Analytics** (if deploying to Vercel)
- **Sentry** for error tracking
- **LogRocket** for session replay (optional)

### Database Monitoring

**Supabase Dashboard:**
- Monitor query performance
- Check connection pool usage
- Review slow queries
- Set up alerts for high CPU/memory

### Custom Logging

```typescript
// lib/logger.ts
export function logSecretAccess(secretId: string, action: string, userId: string) {
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., Datadog, Logtail)
    fetch('https://logging-service.com/log', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.LOGGING_API_KEY}` },
      body: JSON.stringify({ secretId, action, userId, timestamp: new Date() }),
    });
  }
}
```

### Uptime Monitoring

- **UptimeRobot** (free tier available)
- **Pingdom**
- **Better Uptime**

Set up alerts for:
- Main app endpoint
- Agent API endpoint
- Supabase connection

---

## 11. Deployment Checklist

### Pre-Deployment (Local → Staging)

- [ ] All environment variables configured in `.env.local`
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - successful
- [ ] Test all critical flows manually:
  - [ ] Sign up / sign in
  - [ ] Create organization
  - [ ] Invite member (test email delivery)
  - [ ] Upload document
  - [ ] Create task/risk/decision
  - [ ] Enable Secrets module
  - [ ] Create and seal a secret
  - [ ] View sealed secret
  - [ ] Download seal certificate
- [ ] Verify RLS policies with test users
- [ ] Check all database migrations applied
- [ ] Verify storage buckets created and configured
- [ ] Test RAG search with real documents

### Staging → Production

- [ ] **Environment variables updated:**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (production)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production)
  - [ ] `SUPABASE_SERVICE_KEY` (production) - **KEEP SECRET**
  - [ ] `NEXT_PUBLIC_APP_URL` (production domain)
  - [ ] `TIMESTAMP_AUTHORITY_URL` (commercial TSA, NOT FreeTSA)
  - [ ] `OPENAI_API_KEY` (production quota)
  - [ ] `NEXT_PUBLIC_COPILOT_CLOUD_API_KEY` (production)
- [ ] **Database:**
  - [ ] All migrations applied to production DB
  - [ ] RLS policies verified on ALL tables
  - [ ] Realtime enabled for all necessary tables
  - [ ] Indexes created and optimized
- [ ] **Storage:**
  - [ ] All buckets created with correct RLS policies
  - [ ] Versioning enabled on `vault-secrets` bucket
  - [ ] Public access configured for logos/avatars
- [ ] **Secrets Module:**
  - [ ] Commercial TSA configured (NOT FreeTSA)
  - [ ] TSA connection tested and verified
  - [ ] RFC 3161 library implemented (replace mock)
  - [ ] eIDAS QTSP configured (if EU/UK customers)
  - [ ] Verification script tested
- [ ] **Security:**
  - [ ] HTTPS enforced
  - [ ] CSP headers configured
  - [ ] Rate limiting enabled
  - [ ] Secrets rotated (separate from dev)
- [ ] **Monitoring:**
  - [ ] Error tracking enabled (Sentry)
  - [ ] Uptime monitoring configured
  - [ ] Database monitoring alerts set
  - [ ] Log aggregation configured
- [ ] **Documentation:**
  - [ ] `README.md` updated with production setup
  - [ ] `SECURITY.md` reviewed and accurate
  - [ ] User guide created (optional)
  - [ ] Admin guide created (for vault owners)

### Post-Deployment

- [ ] Run smoke tests on production
- [ ] Monitor error rates for first 24 hours
- [ ] Review database query performance
- [ ] Check TSA timestamp generation works
- [ ] Verify email delivery (invitations, notifications)
- [ ] Test from multiple devices/browsers
- [ ] Load test critical endpoints
- [ ] Schedule first backup verification
- [ ] Document any deployment issues encountered
- [ ] Set up regular security audits (quarterly)

---

## Emergency Contacts

**In case of production issues:**

| Service | Contact | SLA |
|---------|---------|-----|
| Supabase Support | https://supabase.com/dashboard/support | 24h response |
| TSA Provider | [provider support email] | Varies |
| Hosting Platform | [platform support] | Varies |
| On-call Developer | [your contact] | Immediate |

---

## Compliance Certifications

**For regulated industries, consider:**
- SOC 2 Type II (Supabase is certified)
- ISO 27001 (Information Security)
- HIPAA (if handling healthcare data)
- GDPR compliance (for EU users)

**Supabase compliance:** https://supabase.com/security

---

## Regular Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check uptime metrics
- [ ] Monitor database performance

### Monthly
- [ ] Review audit trail for anomalies
- [ ] Check storage usage and costs
- [ ] Update dependencies (security patches)
- [ ] Test backup restoration

### Quarterly
- [ ] Rotate secrets and API keys
- [ ] Security audit (manual review)
- [ ] Performance optimization review
- [ ] User feedback collection

### Annually
- [ ] Penetration testing (hire external firm)
- [ ] Compliance review (GDPR, SOC 2, etc.)
- [ ] Disaster recovery drill
- [ ] Documentation update

---

## Cost Estimates (Production)

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Supabase Pro | $25 | Includes 8GB DB, 100GB bandwidth |
| Vercel Pro | $20 | Or Railway/Render ($5-20) |
| OpenAI API | $10-100 | Depends on usage |
| Commercial TSA | $50-200 | Annual cost amortized |
| Monitoring (Sentry) | $26 | Team plan |
| **Total** | **$131-365/mo** | Scales with usage |

**Scaling costs:**
- Each additional 1GB storage: ~$0.125/month
- Each additional 10GB bandwidth: ~$0.09/GB
- OpenAI scales with document uploads
- Consider reserved capacity for predictable costs

---

## Support & Escalation

**For production issues, escalate in this order:**

1. **Check this document** - most issues are covered
2. **Review logs** - Supabase dashboard, error tracking
3. **Search Supabase Discord** - community support
4. **Contact Supabase Support** - paid plans get priority
5. **Emergency hotline** - [set up your own on-call rotation]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-10 | Initial production considerations document |

---

**Document Owner:** Development Team
**Last Reviewed:** 2025-10-10
**Next Review:** 2026-01-10
