# SECURITY.md — Level Ops

> ⚠️ **DEPRECATED:** This file is outdated and superseded by `level-ops/SECURITY.md`.
> This version remains for historical context and will be removed after Sprint 3.
> **Please refer to `level-ops/SECURITY.md` for current security documentation.**

## Data Security
- **Row-Level Security (RLS):** enabled on every table. Deny-by-default. Policies grant access only when `tenant_id` matches the user’s membership and the role permits the action.
- **Storage:** objects stored under `tenants/{tenantId}/...`. Signed URLs with short expiry. No public buckets for sensitive data.

## Authentication & Authorisation
- Supabase Auth for identity. Authorisation is enforced on the **server** and by **RLS**.
- Feature flags are enforced server-side as well as in the UI.

## Realtime
- Subscribe only to tenant-scoped channels. Never subscribe to global topics.

## Secrets
- Never commit secrets. Use `.env.local` (ignored by git). Provide `.env.example` only with non-sensitive placeholders.
- Keys with write power (e.g., Supabase service key) are **server-only**.

## Audit & Monitoring
- All agent writes produce an `activity_log` record with before/after (safely redacted).
- Error tracking logs correlation IDs. Audit logs are append-only.

## Incident Response
- Break-glass access requires explicit approval; all actions logged.
- In a suspected breach: revoke keys, rotate passwords, disable external connectors, export audit logs, notify tenant admins, and patch root cause.

## Compliance (baseline)
- Honour data export/deletion requests per tenant.
- Regional data residency to be configured per deployment.
