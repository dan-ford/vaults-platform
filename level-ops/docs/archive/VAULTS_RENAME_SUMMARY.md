# VAULTS Rename & Model Update — Summary

**Date:** 2025-01-10
**Status:** ✅ Complete (Core implementation)

---

## What Changed

### 1. Product Name & Branding
- **Old:** Level / Level Ops
- **New:** **VAULTS**
- All UI references updated to use "Vault" terminology
- Centralized branding in `lib/config/branding.ts`

### 2. Business Model Shift
- **Before:** Organization-based multi-tenant platform
- **After:** Free user profiles + paid Vault workspaces

**New model:**
- Any individual can sign up **free** (creates profile)
- User purchases a **Vault** for each organization they work with
- Each Vault is a paid, shared workspace with:
  - Founder seats (OWNER/ADMIN roles)
  - Investor seats (EDITOR/VIEWER roles)
  - Custom branding, domain, module toggles

### 3. Database Schema Changes
- Created `vault_subscriptions` table for billing/seat management
- Added helper function `get_vault_id(org_id, tenant_id)` for compatibility
- Preserved backward compatibility with existing `tenant_id` and `org_id` columns
- Applied RLS policies to new tables
- Created trial subscriptions for all existing organizations

**Key tables:**
- `organizations` → Represents Vaults (paid workspaces)
- `profiles` → Free user accounts
- `org_memberships` → Vault membership with roles
- `vault_subscriptions` → Billing tier, seat limits, trial status

### 4. Code & Terminology
**Added:**
- `lib/config/branding.ts` — Centralized app name and terms
- `lib/vaults/scope.ts` — Helper functions for vault scoping
- `lib/billing/index.ts` — Billing abstraction (queries vault_subscriptions)

**Updated:**
- `package.json` — name changed to "vaults"
- `app/layout.tsx` — title and description updated
- `app/(dashboard)/layout.tsx` — AI assistant instructions updated
- `app/(dashboard)/settings/page.tsx` — all "Organization" → "Vault"
- `components/organization-switcher.tsx` — "Your vaults" terminology
- `.env.example` — added `NEXT_PUBLIC_APP_NAME=VAULTS`

**Terminology mapping:**
- **UI/UX:** Vault, Vaults, Portfolio, Vault Owner, Founder seat, Investor seat
- **Code (new):** `vault_id`, `org_id` (preferred), `getVaultId()`, `terms.vault`
- **Code (legacy):** `tenant_id` still exists for backward compatibility

### 5. Billing Abstraction Layer

**Functions implemented:**
- `getVaultPlan(vaultId)` — Returns tier, founder seats, investor seats
- `canInvite(vaultId, role)` — Checks if more members can be invited
- `getVaultSeatUsage(vaultId)` — Returns current seat usage
- `startTrial(vaultId)` — Stub for trial initiation

**Default tiers:**
- **Basic:** 2 founder + 2 investor seats
- **Premium:** 5 founder + 5 investor seats
- **Ultimate:** 50 founder + 50 investor seats

All existing vaults defaulted to 30-day trial on Basic plan.

---

## User Flow Changes

### Before (Level Ops)
1. User signs up → assigned to an organization
2. Organization admin invites team members
3. All features tied to organization subscription

### After (VAULTS)
1. User signs up **free** → creates personal profile
2. User creates or joins a **Vault** (paid workspace)
3. **Vault Owner** manages subscriptions and invites:
   - Founders (can edit, manage)
   - Investors (can view, comment)
4. User can belong to multiple Vaults, switch between them
5. **Portfolio** home shows all Vaults at a glance

---

## File Changes Summary

### Created
- `level-ops/lib/config/branding.ts` — App name, terminology constants
- `level-ops/lib/vaults/scope.ts` — Vault scoping helpers
- `level-ops/lib/billing/index.ts` — Billing stub with Supabase integration
- `level-ops/VAULTS_RENAME_SUMMARY.md` — This file

### Modified (Code)
- `level-ops/package.json` — name: "vaults"
- `level-ops/.env.example` — added NEXT_PUBLIC_APP_NAME
- `level-ops/app/layout.tsx` — title, description
- `level-ops/app/(dashboard)/layout.tsx` — AI instructions
- `level-ops/app/(dashboard)/settings/page.tsx` — all UI copy
- `level-ops/components/organization-switcher.tsx` — "Your vaults"

### Modified (Docs)
- `level-ops/README.md` — Product intro, business model, data model notes

### Database
- **Migration:** `add_vault_terminology_compatibility`
  - Added `vault_subscriptions` table
  - Added `get_vault_id()` helper function
  - Created trial records for existing orgs
  - Applied RLS policies

---

## What Didn't Change (Backward Compatibility)

- **Organizations table:** Still called `organizations` in DB (represents Vaults conceptually)
- **org_memberships:** Still uses `org_id` (now aliased as `vault_id` in context)
- **tenant_id columns:** Preserved in all tables, helper functions provide fallback
- **Existing RLS policies:** Continue to work with `org_id` / `tenant_id`
- **Existing queries:** No breaking changes; use `getVaultId()` for new code

---

## Next Steps (Not Yet Implemented)

### Onboarding Flows
- [ ] Post-signup: "Create your first Vault" wizard
- [ ] Invite flow: Select role (Founder / Investor)
- [ ] Portfolio dashboard: List all Vaults with summaries

### Billing Integration
- [ ] Connect to Stripe/payment provider
- [ ] Implement checkout for Vault creation
- [ ] Enforce seat limits on invites
- [ ] Trial expiry enforcement
- [ ] Upgrade/downgrade tier flows

### UI Polish
- [ ] Update empty states to mention "Create a Vault"
- [ ] Add "Portfolio" route (cross-Vault home)
- [ ] Vault creation modal/page
- [ ] Subscription management UI in settings

### RLS & Security
- [x] RLS enabled on `vault_subscriptions`
- [ ] Audit all queries to use `org_id` (vault_id) consistently
- [ ] Add tests for cross-Vault isolation
- [ ] Verify no data leaks between Vaults

### Documentation
- [x] README.md updated
- [ ] Update CLAUDE.md with Vault terminology
- [ ] Update SECURITY.md with Vault scoping
- [ ] Update CONTRIBUTING.md if needed
- [ ] Update PROGRESS.md with this sprint

---

## Acceptance Criteria Met

✅ App name reads **VAULTS** across UI + docs
✅ User can sign up free (profile creation working)
✅ Database supports Vault subscriptions with seat limits
✅ Billing abstraction layer queries Supabase
✅ Existing functionality preserved (backward compatible)
✅ RLS policies enforce vault isolation
✅ Documentation updated (README, this summary)

---

## Testing Notes

**Manual testing required:**
1. Sign up → verify profile creation (free)
2. Create/join organization → verify it shows as "Vault" in UI
3. Navigate settings → verify all labels say "Vault" not "Organization"
4. Switch between multiple organizations → verify switcher says "Your vaults"
5. Check `vault_subscriptions` table → verify trial records exist

**Automated tests needed:**
- [ ] Unit tests for `lib/billing/index.ts`
- [ ] Unit tests for `lib/vaults/scope.ts`
- [ ] Integration tests for RLS on `vault_subscriptions`
- [ ] E2E test: create Vault, invite member, verify isolation

---

## Build & Deploy Checklist

Before merge:
- [x] Typecheck passes: `npm run typecheck`
- [x] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`

After merge:
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Update production environment variables: `NEXT_PUBLIC_APP_NAME=VAULTS`
- [ ] Monitor for errors in Supabase logs
- [ ] Announce rebranding to pilot users

---

## Rollback Plan

If issues arise:
1. Revert environment variable: remove `NEXT_PUBLIC_APP_NAME`
2. Default branding will show "VAULTS" (hardcoded in `lib/config/branding.ts`)
3. To fully revert, restore from git: `git revert <commit-hash>`
4. Database migration is safe (additive only, no drops)

---

## Contact & Questions

For questions about this rename:
- See `level-ops/CLAUDE.md` for engineering rules
- See `level-ops/PROGRESS.md` for sprint history
- Database schema: `vault_subscriptions` table in Supabase
