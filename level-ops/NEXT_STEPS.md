# NEXT STEPS - Executive Layer Activation Guide

**Created:** October 18, 2025
**Purpose:** Post-deployment activation and validation procedures
**Audience:** Development team and platform administrators

---

## CRITICAL SITUATION SUMMARY

**What Happened:**
Commit `8f364f1` successfully deployed all Phase 1 & 2 executive layer code to production. However, the deployment is in a **dormant state** - all 7 new modules exist but are invisible to users because:

1. Navigation requires `executive_layer_v2` feature flag to be `true`
2. This flag defaults to `false` in `organizations.settings.modules`
3. No organizations currently have this flag enabled
4. TypeScript build is broken (22 errors), preventing new deployments

**Current User Experience:**
Users see the **old navigation** (Tasks, Milestones, Risks, Decisions, Documents, Contacts, Secrets) and have no way to access the new executive features.

**Production Database Status:**
All 8 new tables are created, have proper RLS policies, and are ready for use. Database is production-ready.

---

## IMMEDIATE ACTIONS REQUIRED (Critical Path)

### Step 1: Fix TypeScript Build (BLOCKER - 2-4 hours)

**Problem:** Cannot deploy new code until build passes.

**Root Cause:** Database types file is outdated - missing `decision_approvals` and `document_sections` tables.

**Solution:**

```bash
# Navigate to project directory
cd /mnt/d/Dropbox/GitHub/GIT\ Local/level_app_v1/level-ops

# Regenerate types from production database
npx supabase gen types typescript --project-id lkjzxsvytsmnvuorqfdl > lib/supabase/database.types.ts

# Verify no TypeScript errors (should return 0 errors)
npm run typecheck

# Verify build succeeds
npm run build

# If successful, commit the updated types
git add lib/supabase/database.types.ts
git commit -m "fix: regenerate database types for executive layer tables

- Add decision_approvals table definition
- Add document_sections table definition
- Fix TypeScript compilation errors (22 errors resolved)
- Required for production deployment after executive layer rollout"

git push origin main
```

**Acceptance Criteria:**
- `npm run typecheck` passes with 0 errors
- `npm run build` completes successfully
- Vercel auto-deploys successfully
- No TypeScript errors in build logs

---

### Step 2: Enable Feature Flag for Test Organization (2 hours)

**Purpose:** Make executive layer visible for testing before wider rollout.

**Prerequisites:**
- Step 1 complete (TypeScript build passing)
- Identify test organization ID

**SQL Commands:**

```sql
-- 1. List all organizations to find test org
SELECT id, name, slug, created_at
FROM organizations
ORDER BY created_at DESC;

-- 2. Enable executive layer for test organization
-- REPLACE <org_id> with actual UUID from step 1
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{modules,executive_layer_v2}',
  'true'
)
WHERE id = '<org_id>';

-- 3. Verify the flag was set correctly
SELECT
  name,
  slug,
  settings->'modules'->'executive_layer_v2' as exec_layer_enabled,
  settings->'modules' as all_module_flags
FROM organizations
WHERE id = '<org_id>';

-- Expected result: exec_layer_enabled should show 'true'
```

**Verification Steps:**
1. Log in as a member of the test organization
2. Check navigation - should see:
   - Profile (new)
   - Metrics (new)
   - Finance (new)
   - Reports (enhanced)
   - Packs (new)
   - Requests (new)
   - Documents (existing)
   - Governance (new)
   - Members (relabeled from Contacts)
   - Secrets (existing)
3. Old modules (Tasks, Milestones) should be **hidden**
4. Dashboard should be in top navigation (not left sidebar)

**If it doesn't work:**
- Clear browser cache and cookies
- Check browser console for errors
- Verify user is actually a member of the test organization
- Check `lib/hooks/use-feature-flag.ts` is reading settings correctly

---

### Step 3: Comprehensive Smoke Testing (8-12 hours)

**Purpose:** Validate all 7 new modules work correctly before user rollout.

**Who:** QA team or senior developer
**When:** After Steps 1 & 2 complete
**Where:** Test organization with feature flag enabled

#### Testing Approach

**Setup:**
1. Two browser windows/devices for realtime testing
2. Test accounts with different roles: OWNER, ADMIN, EDITOR, VIEWER
3. Screen recording tool for bug documentation
4. Spreadsheet to track checklist progress

**Detailed Checklist:**
See **REVISED_MODULE_PLAN.md** lines 343-460 for complete 180-item checklist covering:
- All 7 new modules (Vault Profile, Metrics, Finance, Reports, Packs, Requests, Governance)
- Document enhancements (sections, Q&A)
- Permission enforcement (VIEWER/EDITOR/ADMIN/OWNER)
- Realtime subscriptions
- AI assistant integration
- Notifications workflow

**Bug Reporting:**
For each bug found, document:
- Module name
- User role when bug occurred
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/screen recording
- Browser and OS
- Severity: Critical/High/Medium/Low

**Critical Bugs (Stop rollout):**
- Data loss or corruption
- RLS bypass (wrong org can see data)
- Complete feature failure
- Security vulnerability

**High Bugs (Fix before wider rollout):**
- Permissions not working correctly
- Realtime not updating
- Notifications not sending
- Forms not validating

**Medium/Low Bugs (Can defer):**
- UI polish issues
- Minor UX improvements
- Edge case handling
- Performance optimizations

---

### Step 4: Security & Performance Review (2-4 hours)

**Purpose:** Ensure production readiness.

#### Security Checklist

**RLS Policy Verification:**
```sql
-- Verify RLS is enabled on all new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'okrs', 'kpis', 'kpi_measurements', 'financial_snapshots',
    'board_packs', 'decision_approvals', 'requests', 'document_sections'
  );
-- All rows should show rowsecurity = true

-- Check RLS policies exist for each table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'okrs', 'kpis', 'kpi_measurements', 'financial_snapshots',
    'board_packs', 'decision_approvals', 'requests', 'document_sections'
  )
ORDER BY tablename, policyname;
-- Should see SELECT, INSERT, UPDATE, DELETE policies for each table
```

**Realtime Publication:**
```sql
-- Verify all new tables are in realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'okrs', 'kpis', 'kpi_measurements', 'financial_snapshots',
    'board_packs', 'decision_approvals', 'requests', 'document_sections'
  );
-- Should return 8 rows (all tables present)
```

**Supabase Security Advisor:**
```bash
# Run from Supabase dashboard or via API
# Check for:
# - Missing RLS policies
# - Missing indexes on foreign keys
# - Functions without search_path protection
# - Leaked passwords (HaveIBeenPwned integration)
```

#### Performance Checklist

**Database Indexes:**
```sql
-- Verify indexes on org_id for all new tables (critical for multi-tenant performance)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'okrs', 'kpis', 'kpi_measurements', 'financial_snapshots',
    'board_packs', 'decision_approvals', 'requests', 'document_sections'
  )
  AND indexdef LIKE '%org_id%';
-- Should see at least one index per table on org_id
```

**Page Load Performance:**
- Use Chrome DevTools Network tab
- All pages should load in < 3 seconds
- API calls should complete in < 500ms
- No N+1 query patterns (watch for multiple API calls per row)

---

## PHASED ROLLOUT PLAN

### Phase 1: Pilot Organizations (Week 1)

**Goal:** Validate in production with real users.

**Selection Criteria:**
- 2-3 friendly organizations willing to test
- Active users (login > 3x per week)
- Mix of company sizes
- Good communication channel with users

**Steps:**
1. Enable feature flag for pilot orgs (same SQL as Step 2)
2. Send onboarding email with:
   - What's new (list of 7 modules)
   - Key benefits (executive focus, immutable outputs)
   - Training video or walkthrough
   - Feedback form link
3. Monitor daily:
   - Error logs (Vercel, Railway, Supabase)
   - User feedback
   - Feature usage (which modules getting used most)
4. Weekly check-in call with each pilot org

**Success Criteria:**
- Zero critical bugs
- < 3 high-priority bugs
- Positive user feedback (NPS > 7)
- At least 50% of users actively using new modules

---

### Phase 2: Controlled Rollout (Weeks 2-4)

**Goal:** Gradual expansion while monitoring stability.

**Approach:**
- Week 2: Enable for 25% of organizations (smallest/simplest orgs first)
- Week 3: Enable for 50% of organizations
- Week 4: Enable for 75% of organizations
- Week 5: Enable for 100% of organizations

**Monitoring:**
- Daily error rate checks
- Weekly user satisfaction surveys
- Support ticket volume
- Feature adoption metrics

**Rollback Criteria:**
- Error rate > 5% of requests
- Multiple critical bugs reported
- Security incident
- User satisfaction drops significantly

**To rollback:**
```sql
-- Disable executive layer for all orgs
UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{modules,executive_layer_v2}',
  'false'
);

-- Or for specific org
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{modules,executive_layer_v2}',
  'false'
)
WHERE id = '<org_id>';
```

---

### Phase 3: Full Rollout (Week 5+)

**Goal:** All organizations on executive layer.

**Steps:**
1. Enable feature flag for remaining organizations
2. Send announcement email to all users
3. Update marketing website with new feature descriptions
4. Create help center articles for each new module
5. Monitor for 2 weeks before considering migration complete

**Post-Rollout Tasks:**
1. Remove feature flag checks from code (executive layer becomes default)
2. Archive legacy Tasks and Milestones code
3. Update README and documentation
4. Celebrate successful migration!

---

## ADMIN UI FOR FEATURE FLAG MANAGEMENT

**Future Enhancement:** Build admin interface for easier flag management.

**Current Process:** Manual SQL commands (shown above)
**Desired Process:** Admin UI with toggle switches

**Suggested Implementation:**
```typescript
// In /admin page, add feature flag management section
<Card>
  <CardHeader>
    <CardTitle>Feature Flags</CardTitle>
  </CardHeader>
  <CardContent>
    {organizations.map(org => (
      <div key={org.id} className="flex items-center justify-between">
        <span>{org.name}</span>
        <Switch
          checked={org.settings?.modules?.executive_layer_v2 || false}
          onCheckedChange={async (checked) => {
            await updateOrgSettings(org.id, {
              modules: {
                ...org.settings?.modules,
                executive_layer_v2: checked
              }
            });
          }}
        />
      </div>
    ))}
  </CardContent>
</Card>
```

---

## TROUBLESHOOTING GUIDE

### Issue: Feature flag enabled but modules not visible

**Possible Causes:**
1. Browser cache not cleared
2. User not member of organization
3. Feature flag not saved correctly in database
4. Navigation code has bug

**Debug Steps:**
```sql
-- Verify flag is actually set
SELECT name, settings
FROM organizations
WHERE id = '<org_id>';

-- Verify user is member
SELECT org_id, user_id, role
FROM org_memberships
WHERE user_id = '<user_id>' AND org_id = '<org_id>';
```

**Browser Console Debug:**
```javascript
// In browser console, check context
console.log(JSON.parse(localStorage.getItem('vaults-org-context')));

// Should show current org with settings.modules.executive_layer_v2 = true
```

### Issue: TypeScript build still failing after regenerating types

**Possible Causes:**
1. Types not committed to git
2. Vercel not rebuilding
3. Cache not cleared

**Steps:**
```bash
# Force clean build
rm -rf .next node_modules
npm install
npm run build

# If that works, commit and push
git add .
git commit -m "fix: force rebuild after type regeneration"
git push
```

### Issue: Realtime updates not working

**Check:**
```sql
-- Verify table in realtime publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = '<table_name>';

-- If missing, add it
ALTER PUBLICATION supabase_realtime ADD TABLE <table_name>;
```

### Issue: Permission errors when creating/editing

**Check:**
```sql
-- Verify RLS policy allows operation
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<user_id>"}';

SELECT * FROM <table_name> WHERE org_id = '<org_id>';
-- Should return rows if SELECT policy works

INSERT INTO <table_name> (org_id, title, created_by)
VALUES ('<org_id>', 'Test', '<user_id>');
-- Should succeed if INSERT policy works
```

---

## SUCCESS METRICS

**Technical Health:**
- Build passes: ✅ (after Step 1)
- Zero TypeScript errors: ✅ (after Step 1)
- All smoke tests pass: ⏳ (Step 3)
- Security review clean: ⏳ (Step 4)
- Page load < 3s: ⏳ (Step 4)

**User Adoption (2 weeks post-rollout):**
- 80% of active users access at least 1 new module
- 50% of organizations create OKRs
- 30% of organizations use Reports approval workflow
- 20% of organizations generate Board Packs
- NPS score > 8 for new features

**Business Impact (30 days post-rollout):**
- User engagement +20% (more time in app)
- Feature utilization +40% (more modules used per session)
- Support tickets about missing features -90%
- User satisfaction surveys show "more professional" sentiment

---

## CONTACTS FOR ISSUES

**Critical Bugs (Production Down):**
- On-call engineer: [Add contact]
- Escalation path: [Add details]

**Deployment Questions:**
- Development lead: [Add contact]
- DevOps: [Add contact]

**User Support:**
- Support team lead: [Add contact]
- Help desk: [Add contact]

---

## APPENDIX: DETAILED COMMIT ANALYSIS

**Commit 8f364f1 Contents:**
- 7 new module pages created
- 3 existing modules enhanced
- 8 database tables created in production
- Navigation structure updated
- Bottom-nav.tsx modified with feature flag checks
- All modules implement auto-refresh pattern
- All modules have realtime subscriptions
- All modules enforce RBAC permissions
- SHA-256 hashing implemented for Reports and Packs
- Notifications integration for Requests module

**Lines of Code Changed:**
- New files: ~6,500 lines
- Modified files: ~800 lines
- Total: ~7,300 lines (significant deployment)

**Database Changes:**
- 8 new tables
- 0 tables modified
- All tables have RLS enabled
- All tables in realtime publication
- All tables have proper indexes

**No Breaking Changes:**
- Legacy routes still work (/tasks, /milestones, /risks, /decisions)
- Existing data untouched
- Feature flag provides backward compatibility
- Can toggle between old and new navigation per org

---

## CONCLUSION

The executive layer transformation is **code complete and deployed** but requires activation to become visible to users. Follow the steps in order:

1. Fix TypeScript build (CRITICAL - 2-4 hours)
2. Enable flag for test org (2 hours)
3. Smoke test all modules (8-12 hours)
4. Security review (2-4 hours)
5. Pilot rollout (1 week)
6. Phased rollout (3-4 weeks)
7. Full activation (week 5)

**Estimated Total Time to Full Rollout:** 5-6 weeks from today

**Next Session Priority:**
1. Regenerate TypeScript types
2. Verify build passes
3. Deploy fixed build
4. Enable flag for test org
5. Begin smoke testing

**Critical Success Factors:**
- Don't skip smoke testing
- Don't rush the rollout
- Monitor error rates closely
- Be ready to rollback if needed
- Communicate clearly with users

---

**Document Owner:** Development Team
**Last Updated:** October 18, 2025
**Next Review:** After Step 3 complete
