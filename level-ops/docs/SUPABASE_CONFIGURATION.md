# Supabase Configuration Guide

This document covers manual configuration steps required in the Supabase Dashboard.

## Security Configuration

### Enable HaveIBeenPwned Password Protection

**Status:** REQUIRED before production deployment
**Severity:** HIGH (prevents compromised passwords)

#### What It Does
- Checks user passwords against HaveIBeenPwned's database of 600M+ leaked passwords
- Prevents users from setting compromised passwords during signup/reset
- Does NOT send actual passwords to external service (uses k-anonymity)
- Free to use, no API key required

#### How to Enable

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl
   - Login with your Supabase account

2. **Open Authentication Settings**
   - Left sidebar: Click "Authentication"
   - Click "Policies" tab
   - Scroll to "Password Security" section

3. **Enable Leaked Password Protection**
   - Find toggle: "Enable leaked password protection"
   - Switch to ON (enabled)
   - Click "Save" at bottom of page

4. **Verify Configuration**
   - Try creating test user with weak password: `password123`
   - Should receive error: "Password has been leaked in a data breach"
   - Try strong, unique password: should succeed

#### Technical Details
- Uses HaveIBeenPwned Passwords API v3
- Implements k-anonymity: only first 5 chars of SHA-1 hash sent
- Client-side check: Fast response (<500ms typical)
- Zero cost: Free public service

#### Configuration API (Alternative Method)
You can also enable via SQL (requires project owner):
```sql
-- This cannot be set via SQL - must use Supabase Dashboard
-- Auth configuration is managed at project level, not database level
```

**Note:** This setting is at the **project level**, not database level. Cannot be set via migrations.

---

## Database Configuration

### Realtime Publication

**Status:** COMPLETED ✅
**Details:** All tables already added to `supabase_realtime` publication

Verify with:
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Expected tables (17):
- activity_log
- contacts
- decisions
- document_chunks
- documents
- milestones
- notifications
- org_invitations
- org_memberships
- organizations
- profiles
- reports
- risks
- secret_access
- secret_audit
- secrets
- tasks

---

### Row Level Security (RLS)

**Status:** COMPLETED ✅ (except platform_admins - intentionally disabled)

All tables have RLS enabled with deny-by-default policies:
```sql
-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

#### platform_admins Table RLS
**Status:** INTENTIONALLY DISABLED
**Reason:** Platform admins need unrestricted access for break-glass operations
**Migration:** `20251010104518_disable_rls_on_platform_admins.sql`

This is by design. The warning can be ignored.

---

### Search Path Security

**Status:** COMPLETED ✅
**Last Fix:** Migration `fix_migrate_tenants_function_search_path`

All SECURITY DEFINER functions now have `SET search_path = ''` or `SET search_path = public`:
- accept_org_invite
- accept_org_invite_by_id
- create_notification
- ensure_owner_persistence
- handle_new_user
- handle_new_user_notification_prefs
- is_platform_admin
- is_tenant_admin
- is_tenant_member
- migrate_tenants_to_organizations (✅ just fixed)
- refresh_vault_member_count
- search_chunks_hybrid
- update_vault_member_count
- user_is_org_admin
- user_is_org_member

---

## Storage Configuration

### Storage Buckets

**Status:** PARTIALLY CONFIGURED
**Required for:** File uploads (documents, avatars, logos, secrets)

#### Existing Buckets

1. **avatars**
   - Purpose: User profile pictures
   - Public: Yes (read-only)
   - RLS: Enabled (users can upload their own)

2. **org-logos**
   - Purpose: Organization white-label logos
   - Public: Yes (read-only)
   - RLS: Enabled (admins only)

3. **documents**
   - Purpose: Document management uploads
   - Public: No
   - RLS: Enabled (organization-scoped)

4. **vault-secrets**
   - Purpose: Trade secret evidence files
   - Public: No
   - RLS: Enabled (strict access control)

#### Verify Buckets Exist
```sql
SELECT * FROM storage.buckets ORDER BY name;
```

#### Create Missing Buckets (if needed)
Go to: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/storage/buckets

---

## Email Configuration

### Email Templates

**Status:** REQUIRES CUSTOMIZATION for production
**Current:** Using Supabase default templates

#### Customize Templates

1. **Navigate to Email Templates**
   - Dashboard: Authentication → Email Templates

2. **Templates to Customize:**
   - Confirm signup
   - Magic Link
   - Invite user
   - Reset password
   - Change email address

3. **Branding Recommendations:**
   - Replace "Supabase" with "VAULTS"
   - Add logo: Use `{{ .SiteURL }}/logo.png`
   - Update colors to match brand
   - Keep action URLs intact

#### Example Template (Invite User)
```html
<h2>You have been invited</h2>
<p>You have been invited to join {{ .OrganizationName }} on VAULTS.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
```

---

## SMTP Configuration (Optional)

**Status:** OPTIONAL - Defer for MVP
**Current:** Using Supabase built-in email (300 emails/hour)

For higher volume, configure custom SMTP:
1. Dashboard: Project Settings → Auth → SMTP Settings
2. Recommended providers:
   - Resend (transactional email, vaults.email domain)
   - Postmark (reliable, good for auth emails)
   - AWS SES (cheap at scale)

**Defer Until:** Email volume exceeds 7,200/day (Supabase limit)

---

## API Settings

### API Keys

**Location:** https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/settings/api

**Required Keys:**
- `anon` / `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_KEY` (secret!)

**Key Rotation:**
If keys are compromised:
1. Generate new keys in dashboard
2. Update Vercel environment variables
3. Redeploy application
4. Old keys are invalidated immediately

---

## Database Settings

### Connection Pooling

**Status:** ENABLED (default)
**Mode:** Transaction mode
**Pool Size:** Scales with plan
- Free tier: 60 connections
- Pro tier: 200 connections

**Connection String:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

Use pooled connection for:
- Serverless functions (Vercel API routes)
- Edge functions
- High-concurrency workloads

Use direct connection for:
- Migrations
- Long-running queries
- Realtime subscriptions

---

## Monitoring & Alerts

### Database Health

**Monitor:**
- Disk usage (Free: 500MB, Pro: 8GB)
- Connection count (alert at 80% capacity)
- Query performance (slow queries >1s)

**Dashboard:** https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl/reports

### Recommended Alerts

1. **Disk Usage >80%**
   - Action: Cleanup old audit logs, or upgrade plan

2. **High Connection Count**
   - Action: Check for connection leaks, enable pooling

3. **Slow Queries**
   - Action: Add indexes, optimize queries

---

## Backups

### Automatic Backups

**Status:** ENABLED (default)
**Frequency:** Daily
**Retention:**
  - Free tier: 7 days
  - Pro tier: 30 days

**Restore Process:**
1. Dashboard: Database → Backups
2. Select backup date
3. Click "Restore"
4. Confirm (this will overwrite current database!)

### Manual Backups (Before Major Changes)

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Using Supabase CLI
supabase db dump -f backup.sql
```

**Store backups outside Supabase** (S3, GitHub, local)

---

## Performance Optimization

### Indexes

**Status:** COMPLETED ✅
**Key Indexes:**
- `organization_id` on all multi-tenant tables
- `user_id` for user-scoped queries
- `embedding` vector index on document_chunks (ivfflat)

### Query Performance

Check slow queries:
```sql
SELECT
  query,
  calls,
  total_exec_time / calls as avg_time_ms,
  total_exec_time
FROM pg_stat_statements
WHERE total_exec_time > 1000  -- More than 1 second total
ORDER BY total_exec_time DESC
LIMIT 20;
```

---

## Security Checklist

Before production deployment:

### Authentication
- [x] Password strength: Min 8 characters (default: 6, increase to 8+)
- [ ] **HaveIBeenPwned enabled** ← ACTION REQUIRED
- [ ] Email confirmation required: ON
- [ ] Email rate limiting: Enabled (prevent abuse)

### Database
- [x] RLS enabled on all user-facing tables
- [x] SECURITY DEFINER functions have search_path set
- [x] Service role key secured (not in source code)
- [x] No public write access (except via RLS)

### Storage
- [x] Public buckets: Read-only
- [x] Private buckets: RLS enforced
- [x] File size limits configured (default: 50MB)
- [x] Virus scanning: Enabled (Pro plan feature)

### API
- [ ] Rate limiting: Configure in Vercel (not Supabase)
- [ ] CORS: Restrict to vaults.team domain only
- [x] API keys rotated if previously exposed

---

## Troubleshooting

### Issue: "JWT expired" errors
**Cause:** Access tokens expire after 1 hour
**Solution:** Implement token refresh in app (already done in middleware)

### Issue: RLS policy denies access
**Cause:** User not properly added to organization
**Solution:** Check org_memberships table, verify user_id and org_id

### Issue: Realtime not working
**Cause:** Table not in supabase_realtime publication
**Solution:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE your_table;
```

### Issue: Storage upload fails
**Cause:** Bucket doesn't exist or RLS policy denies
**Solution:** Check bucket exists, verify RLS policies

---

## Related Documentation
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Production Considerations](../PRODUCTION_CONSIDERATIONS.md)
- [Security Guide](../SECURITY.md)
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) (to be created)

---

## Manual Action Items

### Immediate (Before MVP Deployment)
1. [ ] Enable HaveIBeenPwned password protection (5 min)
2. [ ] Verify all storage buckets exist (5 min)
3. [ ] Test email templates (optional, 15 min)

### Post-MVP (Phase 2)
1. [ ] Customize email templates with VAULTS branding (30 min)
2. [ ] Configure custom SMTP if needed (1 hour)
3. [ ] Set up monitoring alerts (30 min)
4. [ ] Configure custom domain for Supabase (optional)
