# SECURITY.md

## Security Posture

VAULTS implements defense-in-depth security with multi-tenant isolation at the database level.

## Row-Level Security (RLS)

### Principles
- **Deny by default** — All tables have RLS enabled
- **Organization isolation** — Every row is scoped to an `org_id`
- **User authorization** — Access based on user roles within organization

### Policy Pattern
```sql
-- Example RLS policy (modern pattern using org_memberships)
CREATE POLICY "org_isolation" ON public.tasks
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.org_memberships
    WHERE user_id = auth.uid()
  )
);
```

### Indexes
- `org_id` on all tables for performance
- Composite indexes on `(org_id, user_id)` where needed

## Secrets Management

### Development
- Use `.env.local` (gitignored)
- Never commit real credentials
- Provide safe defaults in `.env.example`

### Production
- Environment variables via secure vault
- Rotate keys quarterly
- Service keys never exposed to client

## Authentication & Authorization

### Auth Flow
1. User authenticates via Supabase Auth
2. JWT includes `tenant_id` claim
3. All API calls validate tenant membership
4. RLS policies enforce at database level

### Roles
- `OWNER` — Full vault administration, can change plans
- `ADMIN` — Manage users and settings, can change plans
- `EDITOR` — Create and edit content
- `VIEWER` — Read-only access

### Vault Plans & Seat Limits
- **Plan tiers**: Small (10 seats), Medium (25 seats), Enterprise (75 seats)
- **Seat enforcement**: Database-level checks prevent exceeding plan limits
- **Admin-only**: Only OWNER/ADMIN can change vault plans
- **Downgrade protection**: Plan downgrades blocked if current members exceed new limit
- **Invite blocking**: Invites automatically blocked when vault is at capacity
- **Real-time tracking**: members_count cached and updated via triggers
- **Audit**: All plan changes are visible in org history

## File Storage

### Security
- Files stored with path: `orgs/{org_id}/...`
- Storage policies enforce organization isolation
- Signed URLs for time-limited access
- No direct public access

## Trade Secrets Module Security

### Immutability Guarantees
- **Append-only architecture** — Secret versions are immutable after creation
- **RLS enforcement** — No UPDATE or DELETE policies on `secret_versions` table
- **SHA-256 content hashing** — Tamper detection for all secret content
- **RFC 3161 timestamping** — Cryptographic proof of existence at specific time
- **Storage versioning** — Backup immutability prevents accidental deletion

### Cryptographic Protection
- **Content hashing** — SHA-256 hash computed for every secret version
- **Timestamp tokens** — TSA-signed timestamps (RFC 3161 compliant)
- **Hash verification** — Automatic validation during evidence export
- **Chain of custody** — Complete audit trail from creation to access

### Access Controls
- **Explicit grants** — Users must be explicitly granted access to each secret
- **NDA acknowledgment** — Access tracked with NDA acceptance timestamp
- **Audit logging** — All secret access logged with IP address and user agent
- **Watermarked viewing** — Attribution trails for all secret views
- **Role-based access** — Only OWNER/ADMIN can grant/revoke secret access

### Evidence Export
The Secrets module provides comprehensive evidence packages suitable for legal proceedings:

**Export Contents:**
- All secret versions with timestamps
- SHA-256 hashes for tamper detection
- RFC 3161 timestamp tokens (TSA-signed)
- Complete audit trail (creation, modifications, access)
- NDA acceptance records
- Verification script for independent validation

**Legal Compliance:**
- Meets "reasonable measures" standard for trade secret protection
- Cryptographic proof of existence (timestamp tokens)
- Immutable record suitable for court evidence
- Chain of custody documentation
- Independent verification capability

### Production Requirements
**CRITICAL:** For production deployment, the Secrets module requires:
- ✅ Commercial TSA provider (DigiCert, Sectigo, GlobalSign)
- ✅ RFC 3161 library integration (replace mock implementation)
- ✅ Timestamp token verification testing
- ✅ Legal review of evidence export process
- ⚠️ DO NOT use FreeTSA in production (development only)

### Timestamp Authority Configuration
```bash
# Development (FreeTSA - free public TSA)
TIMESTAMP_AUTHORITY_URL=https://freetsa.org/tsr

# Production (commercial TSA required)
TIMESTAMP_AUTHORITY_URL=https://timestamp.digicert.com
TIMESTAMP_AUTHORITY_API_KEY=your-api-key

# Optional: eIDAS Qualified Timestamp Service Provider (EU/UK)
EIDAS_QTSP_URL=https://your-qtsp-provider.com/tsr
EIDAS_QTSP_API_KEY=your-qtsp-api-key
```

## Audit Trail

### What's Logged
- Authentication events
- Data modifications (via triggers)
- Agent actions (before/after snapshots)
- Break-glass access
- Secret access and NDA acknowledgments

### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "actor_id": "user_123",
  "org_id": "org_456",
  "action": "update",
  "resource": "tasks",
  "resource_id": "task_789",
  "changes": {...},
  "ip": "192.168.1.1"
}
```

## Incident Response

### Severity Levels
1. **Critical** — Data breach, RLS bypass
2. **High** — Authentication bypass, privilege escalation
3. **Medium** — XSS, information disclosure
4. **Low** — UI bugs, performance issues

### Response Process
1. Isolate affected tenant(s)
2. Preserve audit logs
3. Patch vulnerability
4. Notify affected users within 72h
5. Post-mortem within 7 days

## Security Headers

```typescript
// middleware.ts
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}
```

## Dependency Management

- Run `npm audit` weekly
- Auto-update patch versions
- Manual review for minor/major updates
- Security scanning in CI/CD

## Premium Security Features

### Immutable Snapshots
- Board pack outputs include SHA256 hash for tamper-proof verification
- `executive_summaries` table maintains versioned snapshots
- Audit trail is append-only (no DELETE policy)

### Region Residency (Dedicated Node add-on)
- Supabase project deployed in customer-specified region (EU/UK/US)
- Storage buckets colocated in same region
- Data never leaves customer's chosen jurisdiction
- Available as premium add-on (£2,500/mo + £2,000 setup)

### SSO Integration (add-on)
- Google/Microsoft OAuth (baseline)
- SAML/Okta support (premium add-on)
- SCIM provisioning (enterprise add-on)

### DPA & Compliance
- Data Processing Agreement available on request
- Sub-processor list: Supabase (database/auth), OpenAI (embeddings/LLM), Vercel (hosting)
- Security questionnaires and SOC 2 reports available for enterprise customers
- Backup/DR: RPO 1 hour, RTO 4 hours (Dedicated Node SLA)
- Uptime SLA: 99.9% (Dedicated Node only)

## Reporting Vulnerabilities

Email: security@levelops.com
PGP Key: [Published on website]

We aim to acknowledge reports within 48 hours and provide updates every 72 hours until resolved.