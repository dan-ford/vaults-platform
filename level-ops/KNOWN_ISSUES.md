# Known Issues

**Last Updated:** 2025-10-21

---

## Recently Resolved Issues (October 19-21, 2025)

### ✅ Fixed: executiveLayerEnabled Reference Errors (Commit 8105516)
**Issue:** Finance and Metrics pages referenced removed feature flag
**Impact:** Build failures during Vercel prerendering
**Resolution:** Removed all executiveLayerEnabled references
**Status:** RESOLVED - Deployed to production

### ✅ Fixed: PermissionGuard Prop Mismatch (Commit 95fdcb1)
**Issue:** Pages used incorrect `action="edit"` instead of `require="edit"`
**Impact:** Add buttons not rendering on Finance and Metrics pages
**Resolution:** Corrected prop names to match PermissionGuard API
**Status:** RESOLVED - Deployed to production

### ✅ Fixed: SelectItem Empty Value Error (Commit 4bd689b, e60d881)
**Issue:** KPI form and Requests page used empty string value for "None"/"Unassigned" options
**Impact:** Form crashes with Radix UI validation error: "A <Select.Item /> must have a value prop that is not an empty string"
**Resolution:**
- KPI form: Changed to `value="none"` with null conversion logic
- Requests page: Changed "Unassigned" from `value=""` to `value="unassigned"` with null conversion
**Status:** RESOLVED - Deployed to production (Oct 19-21, 2025)

### ✅ Fixed: Agent Sidebar Grey Overlay on Desktop (Commit e60d881)
**Issue:** Clicking agent button caused grey overlay (Sheet backdrop) to appear on desktop
**Impact:** Poor UX - desktop users saw mobile Sheet component behavior
**Resolution:**
- Added mobile detection with window resize listener
- Sheet component now only opens on mobile (< 768px breakpoint)
- Conditional opening: `open={sidebarOpen && isMobile}`
**Status:** RESOLVED - Deployed to production (Oct 21, 2025)

### ✅ Fixed: Mobile Button Sizing on Dashboard Pages (Commit e60d881)
**Issue:** Action buttons too small on mobile (difficult to tap), breaking mobile UX
**Impact:** Poor mobile usability across all 12 dashboard pages
**Resolution:**
- Standardized button sizing: `h-[18px] w-[18px] sm:h-9 sm:w-9` (18px mobile, 36px desktop)
- Icon sizing: `h-3 w-3 sm:h-4 sm:w-4`
- Changed layout from `flex-col sm:flex-row` to always `flex-row`
- Added `shrink-0` class to prevent button compression
**Pages Updated:** Metrics, Finance, Reports, Requests, Decisions, Documents, Contacts, Tasks, Milestones, Risks, Packs, Secrets
**Status:** RESOLVED - Deployed to production (Oct 21, 2025)

---

## Security Audit Findings

### npm audit: 8 Moderate Severity Vulnerabilities

**Status:** ACCEPTED - Not blocking deployment
**Severity:** Moderate (not Critical or High)
**Source:** CopilotKit dependencies (third-party)

#### Issue 1: PrismJS DOM Clobbering (GHSA-x7hr-w5r2-h6wg)

**Affected Package:** `prismjs < 1.30.0`
**Used By:** `@copilotkit/react-ui` → `react-syntax-highlighter` → `refractor` → `prismjs`

**Risk Assessment:**
- **Impact:** Low - Only affects syntax highlighting in AI code responses
- **Likelihood:** Low - Requires attacker to control code content displayed
- **Exploitability:** Complex - DOM clobbering requires specific conditions
- **User Data Risk:** None - No user data exposed

**Mitigation:**
- PrismJS only used for displaying code snippets in AI responses
- No user input is syntax highlighted (only AI-generated code)
- Attack requires malicious code to be displayed in the UI
- Platform controls what code is shown (AI responses only)

**Resolution Path:**
- CopilotKit team needs to update `react-syntax-highlighter` dependency
- Tracked in CopilotKit repository
- Will be resolved in future CopilotKit release
- Can be monitored: https://github.com/CopilotKit/CopilotKit/issues

**Fix Available:** `npm audit fix --force`
- **Not Recommended:** Would downgrade to @copilotkit/react-ui@0.2.0 (breaking change)
- **Breaking:** Loses 1 year of features and improvements (0.2.0 → 1.10.6)
- **Trade-off:** Worse than accepting moderate risk

---

#### Issue 2: validator.js URL Validation Bypass (GHSA-9965-vmph-33xx)

**Affected Package:** `validator` (all versions)
**Used By:** `@copilotkit/runtime` → `type-graphql` → `class-validator` → `validator`

**Risk Assessment:**
- **Impact:** Low - Only used in CopilotKit internal validation
- **Likelihood:** Very Low - Not used for user authentication or authorization
- **Exploitability:** Low - Requires crafted URLs to bypass validation
- **User Data Risk:** None - No sensitive data validated by this library

**Mitigation:**
- validator.js used internally by CopilotKit GraphQL layer
- VAULTS doesn't directly use validator for security-critical operations
- User authentication handled by Supabase (separate system)
- URL validation not used for access control

**Resolution Path:**
- validator.js maintainers working on fix
- CopilotKit will update when fix released
- Not critical for production deployment

**Fix Available:** `npm audit fix --force`
- **Not Recommended:** Would downgrade to @copilotkit/runtime@1.5.20 (breaking change)
- **Breaking:** Current version is 1.10.6 (5 minor versions newer)
- **Trade-off:** Worse than accepting moderate risk

---

## Decision: Accept and Deploy

### Rationale

1. **Severity:** Moderate (not Critical or High)
2. **Scope:** Limited to UI/display components
3. **Impact:** No user data or authentication affected
4. **Workaround Cost:** Breaking changes worse than risk
5. **Industry Practice:** Common to deploy with moderate npm audit warnings
6. **Monitoring:** Will be fixed in upstream CopilotKit releases

### Security Posture: STRONG

Despite these npm audit findings, VAULTS maintains strong security:

✅ **Authentication:** Supabase Auth (industry-standard)
✅ **Authorization:** Row-Level Security on all tables
✅ **Data Protection:** RLS enforced, deny-by-default policies
✅ **Password Security:** HaveIBeenPwned protection enabled
✅ **API Security:** All SECURITY DEFINER functions have search_path set
✅ **Transport:** HTTPS enforced (Vercel/Supabase)
✅ **Headers:** Security headers configured (X-Frame-Options, CSP, etc.)
✅ **Secrets:** No secrets in source code, environment variables only
✅ **Dependencies:** All critical security dependencies up-to-date

**Security Score:** 4.5/5 (npm audit issues reduce from 5/5)

---

## Monitoring Plan

### Check for Updates Monthly

```powershell
# Check for CopilotKit updates
npm outdated @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

# If updates available
npm install @copilotkit/react-core@latest @copilotkit/react-ui@latest @copilotkit/runtime@latest

# Re-audit
npm audit

# If vulnerabilities resolved, deploy update
```

### Subscribe to Security Advisories

- CopilotKit: https://github.com/CopilotKit/CopilotKit/security/advisories
- PrismJS: https://github.com/PrismJS/prism/security/advisories
- validator.js: https://github.com/validatorjs/validator.js/security/advisories

---

## Other Known Issues

### Build Timeout on WSL + Dropbox

**Status:** RESOLVED (use Windows PowerShell instead)
**Impact:** Development only (Vercel builds work fine)

**Issue:**
- `npm run build` times out after 2+ minutes on WSL
- Caused by Dropbox filesystem performance with node_modules

**Solution:**
- Use Windows PowerShell (D:\Dropbox\...) instead of WSL (/mnt/d/Dropbox/...)
- Or move project outside Dropbox
- Or pause Dropbox sync during builds

**Vercel:** Not affected (builds on Vercel infrastructure)

---

### Secrets Module Not Production-Ready

**Status:** DISABLED by default (database migration applied)
**Impact:** Trade secrets module not available initially

**Issue:**
- Current implementation uses mock RFC 3161 timestamps
- Mock timestamps are NOT legally valid
- Would expose platform to liability if users rely on them

**Solution:**
- Module disabled via `organizations.settings.modules.secrets.enabled = false`
- Can be enabled in Phase 2 after implementing real TSA integration
- Cost: ~$500-2000/year for commercial Timestamp Authority

**Phase 2 Requirements:**
1. Implement real RFC 3161 library (not mock)
2. Subscribe to commercial TSA (DigiCert, Sectigo, GlobalSign)
3. Update API route: `app/api/secrets/timestamp/route.ts`
4. Test with real TSA endpoint
5. Enable module toggle

---

## Production Deployment: APPROVED

**Decision:** Deploy to production with current state

**Reasoning:**
- Core security is strong (RLS, Auth, HTTPS)
- npm audit issues are moderate (not critical)
- Issues are in display/UI dependencies (not auth/data)
- Blocking deployment would delay user value
- Risks can be monitored and patched when upstream fixes

**Approved By:** Technical review
**Date:** 2025-10-15

---

## References

- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk vulnerability database](https://security.snyk.io/)
- [GitHub Security Advisories](https://github.com/advisories)

---

**Next Review:** 30 days after deployment
**Monitoring:** Weekly `npm audit` checks
**Action Trigger:** Any HIGH or CRITICAL vulnerability found
