# COMMERCIAL_INFRASTRUCTURE_ROADMAP.md

## Executive Summary

VAULTS dashboard is at 90% production readiness. The next phase focuses on commercial infrastructure: public-facing website, subscription management, code reusability, and developer experience improvements.

**Current State**: Production-ready multi-tenant dashboard with comprehensive security, RLS policies, AI assistant, and 8 core modules.

**Next Phase Goal**: Launch commercial platform with subscription management, public marketing site, and reusable component architecture.

---

## 1. Current State Assessment

### Completed (90% Production Ready)
- Multi-tenant dashboard (8 core modules: Tasks, Milestones, Risks, Decisions, Documents, Contacts, Secrets, Reports)
- Row-Level Security (RLS) policies on all tables with org isolation
- CopilotKit AI assistant with 24 actions and RAG search
- Audit logging and activity tracking
- Role-based permissions (OWNER, ADMIN, EDITOR, VIEWER)
- Vault plan management (Small/Medium/Enterprise tiers)
- TypeScript strict mode, ESLint, Prettier, pre-commit hooks
- RLS security test suite (30+ tests ready to run)
- Documentation updated with correct VAULTS branding

### Missing for Full Production Launch
- Public-facing homepage/marketing site
- Subscription/payment flow with Stripe
- Pricing page with plan comparison
- Public vs authenticated routing
- Commercial TSA for Secrets module (currently using FreeTSA mock)
- Accessibility audit (WCAG 2.2 AA compliance)
- Performance optimization (Lighthouse scores)
- End-user documentation

### Technical Debt
- Some agent interactions need more explicit error handling
- Accessibility audit not performed
- Performance benchmarking not done
- Test coverage at <5% (RLS tests created but not integrated into CI)

---

## 2. Strategic Decision: Architecture for Public Website

### Recommendation: Option A - Separate Next.js Marketing App

**Architecture**: Two Next.js applications in mono-repo structure

```
level-mono-repo-v1/
├── apps/
│   ├── vaults-app/          # Existing dashboard (authenticated users)
│   ├── vaults-marketing/    # New: Public website (SEO-optimized)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── utils/               # Shared utilities
│   ├── types/               # Shared TypeScript types
│   ├── config/              # Shared configs (Tailwind, ESLint)
```

**Why Option A (Recommended)**:
- **Independent deployment**: Marketing site deploys separately (Vercel static), dashboard on different cadence
- **SEO optimization**: Marketing app uses Next.js SSG/ISR for fast page loads and search indexing
- **Team separation**: Marketing team can iterate on homepage without touching auth logic
- **Performance**: Static marketing site = sub-200ms load times, dashboard can prioritize interactivity
- **Security**: Clearer separation between public and authenticated surfaces
- **Cost**: Marketing site on Vercel free tier, dashboard on paid tier

**Why NOT Option B (Public Routes in Existing App)**:
- Mixed deployment concerns (marketing changes force dashboard redeployment)
- Marketing team needs access to entire codebase
- Harder to optimize for different use cases (SEO vs interactivity)

**Why NOT Option C (Static Site Generator)**:
- No interactivity for pricing calculator, contact forms
- Harder to integrate with Stripe Checkout

---

## 3. Stripe Integration Plan

### Dependencies to Install
```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

### MCP Server Configuration
Add to Cursor/Claude Desktop settings (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp-server"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```

### Database Schema Updates

**New table: `subscriptions`**
```sql
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  plan_tier text NOT NULL CHECK (plan_tier IN ('free', 'small', 'medium', 'enterprise')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_owners_manage_subscription" ON public.subscriptions
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.org_memberships
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
  )
);

-- Index for performance
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
```

### API Routes to Create

**`app/api/stripe/checkout/route.ts`**
- Create Stripe Checkout session for plan upgrade
- Input: `org_id`, `plan_tier`
- Output: `checkout_url`

**`app/api/stripe/webhooks/route.ts`**
- Handle Stripe webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Update `subscriptions` table and `vaults.plan_tier`
- Verify webhook signature with `STRIPE_WEBHOOK_SECRET`

**`app/api/stripe/portal/route.ts`**
- Create Stripe Customer Portal session for subscription management
- Input: `org_id`
- Output: `portal_url`

### Frontend Components

**`app/(public)/pricing/page.tsx`**
- Display plan tiers: Free (10 seats), Small (25 seats), Medium (50 seats), Enterprise (custom)
- Pricing: Free ($0), Small ($49/mo), Medium ($149/mo), Enterprise (contact)
- CTA buttons: "Start Free" or "Upgrade to [Plan]"
- Authenticated users see current plan with "Manage Subscription" link

**`app/(dashboard)/settings/billing/page.tsx`**
- Current plan display
- Upgrade/downgrade options (OWNER/ADMIN only)
- "Manage Billing" button (opens Stripe Customer Portal)
- Subscription status, renewal date, payment method

### Environment Variables (`.env.example`)
```bash
# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_ID_SMALL=price_...
STRIPE_PRICE_ID_MEDIUM=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...
```

### Stripe Dashboard Configuration
1. Create products: "VAULTS Small", "VAULTS Medium", "VAULTS Enterprise"
2. Set recurring prices: $49/mo, $149/mo, custom
3. Enable Customer Portal with billing history, payment methods, cancellation
4. Add webhook endpoint: `https://vaults.app/api/stripe/webhooks`
5. Subscribe to events: `checkout.session.completed`, `customer.subscription.*`

---

## 4. Mono-Repo Strategy

### Recommended Tool: Turborepo

**Why Turborepo**:
- Incremental builds (only rebuild changed packages)
- Remote caching (share builds across team via Vercel)
- Parallel execution of tasks
- Simple configuration vs Nx
- Vercel native integration

### Migration Steps

**Step 1: Initialize Mono-Repo**
```bash
cd /mnt/d/Dropbox/GitHub/GIT\ Local/level-mono-repo-v1/
npx create-turbo@latest
```

**Step 2: Move Existing App**
```bash
mkdir -p apps/vaults-app
mv ../level_app_v1/level-ops/* apps/vaults-app/
```

**Step 3: Extract Shared Packages**

**Package 1: `@vaults/ui`** (Shared UI components)
```bash
mkdir -p packages/ui
```

Extract:
- `components/ui/alert.tsx`
- `components/ui/badge.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/dialog.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/select.tsx`

Dependencies: `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`

**Package 2: `@vaults/utils`** (Shared utilities)
Extract:
- `lib/utils.ts` (cn function)
- `lib/utils/contrast.ts`
- `lib/utils/error-handling.ts`
- `lib/utils/permission-errors.ts`

Dependencies: `clsx`, `tailwind-merge`

**Package 3: `@vaults/types`** (Shared TypeScript types)
Extract:
- `lib/supabase/database.types.ts` (Supabase generated types)
- Common types: `Role`, `PlanTier`, `PermissionAction`

Dependencies: None (pure types)

**Package 4: `@vaults/config`** (Shared configurations)
Extract:
- `tailwind.config.ts` (shared Tailwind preset)
- `tsconfig.json` (shared TypeScript base config)
- `.eslintrc.json` (shared ESLint rules)
- `.prettierrc.json` (shared Prettier config)

**Step 4: Create Marketing App**
```bash
cd apps
npx create-next-app@latest vaults-marketing --typescript --tailwind --app --no-src-dir
```

Install shared packages:
```bash
cd vaults-marketing
npm install @vaults/ui @vaults/utils @vaults/types @vaults/config
```

**Step 5: Configure Turborepo**

**`turbo.json`**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Root `package.json`**:
```json
{
  "name": "vaults-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.3.4"
  }
}
```

### Package Publishing Strategy

**Internal Packages (Not Published to npm)**:
- Use local workspace references
- Version with `0.x.x` to indicate pre-release
- Share via mono-repo only

**Future: External Packages (If Building Multi-Product)**:
- Publish `@vaults/ui` to private npm registry
- Other products (e.g., VAULTS Analytics) can import
- Semantic versioning (1.x.x for stable)

---

## 5. GitHub MCP Server Installation

### Installation Steps

**1. Configure in Cursor/Claude Desktop**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

**2. Create GitHub Personal Access Token**
- Go to GitHub Settings > Developer Settings > Personal Access Tokens > Fine-grained tokens
- Create token with permissions:
  - `repo` (full control)
  - `read:org` (read organization data)
  - `read:user` (read user profile)
- Copy token to config above

**3. Available MCP Tools**
Once configured, you'll have access to:
- `mcp__github__create_repository` - Create new repos
- `mcp__github__search_repositories` - Search GitHub repos
- `mcp__github__create_or_update_file` - Commit files
- `mcp__github__push_files` - Batch commit multiple files
- `mcp__github__create_issue` - Create issues
- `mcp__github__create_pull_request` - Create PRs
- `mcp__github__fork_repository` - Fork repos
- `mcp__github__create_branch` - Create branches

**4. Usage Example**
With GitHub MCP installed, you can:
- "Create a new branch for homepage feature"
- "Search for Next.js examples in our organization"
- "Create an issue for Stripe integration"
- "Push all changes to new PR"

---

## 6. MCP Servers Summary

### Already Installed
1. **Supabase MCP** (`mcp__supabase__*`) - Database operations, migrations, table management
2. **CopilotKit MCP** (`mcp__copilot__*`) - Documentation and code search
3. **Playwright MCP** (`mcp__playwright__*`) - Browser automation for testing

### Recommended to Add
1. **Stripe MCP** - Subscription management, payment testing
2. **GitHub MCP** - Repository operations, PR creation, issue management

### Configuration File Location
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Example Complete Config
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_..."
      }
    },
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp-server"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_..."
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

---

## 7. Implementation Roadmap (4-Week Plan)

### Week 1: Stripe Integration + Pricing Page
**Priority**: HIGH - Enables revenue generation

**Tasks**:
1. Install Stripe SDK and configure MCP server (2 hours)
2. Create `subscriptions` table with RLS policies (2 hours)
3. Build API routes: `/api/stripe/checkout`, `/api/stripe/webhooks`, `/api/stripe/portal` (8 hours)
4. Create pricing page: `app/(public)/pricing/page.tsx` (6 hours)
5. Add billing management to settings: `app/(dashboard)/settings/billing/page.tsx` (4 hours)
6. Test subscription flow: signup > upgrade > downgrade > cancel (4 hours)
7. Add Stripe webhook endpoint in Stripe Dashboard (1 hour)

**Deliverables**:
- Working subscription flow with Stripe Checkout
- Pricing page with Free, Small, Medium, Enterprise tiers
- Billing management in dashboard settings
- Webhook handler for subscription updates

**Success Metrics**:
- User can upgrade from Free to Small plan
- Subscription status updates in real-time via webhooks
- Customer Portal allows self-service plan changes

---

### Week 2: Homepage + Public Routing
**Priority**: HIGH - Enables customer acquisition

**Tasks**:
1. Create marketing app structure: `apps/vaults-marketing` (2 hours)
2. Design homepage layout (hero, features, social proof, CTA) (6 hours)
3. Build homepage components: Hero, FeatureGrid, Testimonials, CTA (8 hours)
4. Create public navigation with login/signup links (2 hours)
5. Configure public routes: `/`, `/pricing`, `/about`, `/contact` (4 hours)
6. Implement SEO metadata with Next.js Metadata API (3 hours)
7. Deploy marketing site to Vercel (2 hours)

**Deliverables**:
- Public homepage at `vaults.app` (or similar)
- Navigation between marketing and app subdomains
- SEO-optimized static pages with Open Graph tags
- Contact form with email notification

**Success Metrics**:
- Lighthouse score >90 for performance, accessibility, SEO
- Homepage loads in <1 second
- Clear CTAs driving to signup/pricing pages

---

### Week 3: Mono-Repo Setup + Package Extraction
**Priority**: MEDIUM - Enables code reusability for future products

**Tasks**:
1. Initialize Turborepo in `level-mono-repo-v1` (2 hours)
2. Move existing app to `apps/vaults-app` (1 hour)
3. Extract `@vaults/ui` package (8 components) (6 hours)
4. Extract `@vaults/utils` package (4 utilities) (3 hours)
5. Extract `@vaults/types` package (database types) (2 hours)
6. Extract `@vaults/config` package (Tailwind, ESLint, TypeScript) (3 hours)
7. Update import paths in `vaults-app` to use `@vaults/*` (4 hours)
8. Move marketing app to `apps/vaults-marketing` (2 hours)
9. Configure Turborepo build pipeline (3 hours)
10. Test full mono-repo build and dev commands (2 hours)

**Deliverables**:
- Turborepo mono-repo structure with 2 apps, 4 packages
- Shared UI components across apps
- Single `npm run dev` command runs both apps
- Single `npm run build` builds entire mono-repo

**Success Metrics**:
- `turbo run build` succeeds without errors
- Incremental builds (only rebuild changed packages)
- Type safety across package boundaries

---

### Week 4: MCP Servers + Developer Workflow Improvements
**Priority**: LOW - Improves developer experience but not user-facing

**Tasks**:
1. Install and configure Stripe MCP server (1 hour)
2. Install and configure GitHub MCP server (1 hour)
3. Document MCP setup in `docs/DEVELOPER_SETUP.md` (2 hours)
4. Create AI-assisted development workflows (3 hours):
   - "Create PR for feature X"
   - "Test Stripe subscription flow"
   - "Search Supabase docs for RLS patterns"
5. Run RLS test suite and integrate into CI (4 hours)
6. Set up Turborepo remote caching via Vercel (2 hours)
7. Add pre-commit hooks for mono-repo (2 hours)

**Deliverables**:
- Stripe and GitHub MCP servers configured
- Developer setup documentation
- RLS tests passing in CI
- Remote caching enabled for faster builds

**Success Metrics**:
- AI assistant can create PRs and manage GitHub issues
- AI assistant can test Stripe subscriptions in development
- RLS test suite runs on every commit
- Build cache hit rate >80% across team

---

## 8. Environment Configuration

### Development Environment (`.env.local`)
```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://lkjzxsvytsmnvuorqfdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Test Mode)
STRIPE_PRICE_ID_SMALL=price_test_...
STRIPE_PRICE_ID_MEDIUM=price_test_...
STRIPE_PRICE_ID_ENTERPRISE=price_test_...

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MARKETING_URL=http://localhost:3001
```

### Production Environment (Vercel)
```bash
# Supabase (Production Project)
NEXT_PUBLIC_SUPABASE_URL=https://production.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (Live Mode)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Live Mode)
STRIPE_PRICE_ID_SMALL=price_...
STRIPE_PRICE_ID_MEDIUM=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...

# Application URLs
NEXT_PUBLIC_APP_URL=https://app.vaults.app
NEXT_PUBLIC_MARKETING_URL=https://vaults.app

# Email (Production)
RESEND_API_KEY=re_...
POSTMARK_API_TOKEN=...

# Timestamp Authority (Production)
TIMESTAMP_AUTHORITY_URL=https://timestamp.digicert.com
TIMESTAMP_AUTHORITY_API_KEY=...
```

---

## 9. Deployment Strategy

### Current Deployment (Dashboard Only)
- **Platform**: Vercel
- **Domain**: `app.vaults.app` (or subdomain)
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Environment**: Production Supabase project

### Future Deployment (Mono-Repo)
- **Marketing Site**:
  - **Platform**: Vercel
  - **Domain**: `vaults.app` (root domain)
  - **Project**: `apps/vaults-marketing`
  - **Build Command**: `cd ../.. && turbo run build --filter=vaults-marketing`
  - **Output**: Static site (Next.js SSG)

- **Dashboard App**:
  - **Platform**: Vercel
  - **Domain**: `app.vaults.app` (subdomain)
  - **Project**: `apps/vaults-app`
  - **Build Command**: `cd ../.. && turbo run build --filter=vaults-app`
  - **Output**: Node.js server (Next.js SSR)

### Vercel Mono-Repo Configuration
1. Create two separate Vercel projects
2. Link both to same GitHub repo (`level-mono-repo-v1`)
3. Set root directory for each:
   - Marketing: `apps/vaults-marketing`
   - Dashboard: `apps/vaults-app`
4. Enable Turborepo remote caching in Vercel settings
5. Configure different environment variables for each project

---

## 10. Risk Assessment

### Technical Risks

**Risk 1: Stripe Webhook Reliability**
- **Impact**: HIGH - Failed webhooks = subscription status out of sync
- **Mitigation**: Implement idempotent webhook handler, store webhook events in database, add retry logic with exponential backoff
- **Monitoring**: Alert on webhook failures, log all webhook events

**Risk 2: Mono-Repo Migration Complexity**
- **Impact**: MEDIUM - Breaking changes during migration could block development
- **Mitigation**: Migrate incrementally (extract one package at a time), maintain backwards compatibility with path aliases during transition
- **Rollback Plan**: Keep original `level_app_v1` folder until mono-repo fully tested

**Risk 3: RLS Policy Performance**
- **Impact**: MEDIUM - Complex RLS policies can slow queries at scale
- **Mitigation**: Already have indexes on `org_id`, monitor slow queries via Supabase dashboard, consider materialized views for analytics
- **Monitoring**: Set alert for queries >1 second

**Risk 4: Secrets Module TSA Integration**
- **Impact**: HIGH - FreeTSA not production-ready, need commercial TSA
- **Mitigation**: Budget for DigiCert/Sectigo TSA (~$500-1000/year), implement before production launch
- **Timeline**: Must complete before Secrets module GA

### Business Risks

**Risk 1: Pricing Model Validation**
- **Impact**: HIGH - Wrong pricing = poor conversion or unprofitable
- **Mitigation**: Start with simple tier structure, track unit economics (CAC, LTV), adjust pricing after 3 months based on data
- **Metrics**: Monitor conversion rate by tier, churn rate, average revenue per user

**Risk 2: Customer Support Load**
- **Impact**: MEDIUM - Complex product = high support volume
- **Mitigation**: Comprehensive end-user documentation (Week 4 of Phase H), video tutorials, in-app onboarding flow
- **Staffing**: Plan for 1 support person per 100 paying customers

**Risk 3: Compliance Requirements**
- **Impact**: HIGH - GDPR, CCPA, SOC 2 required for enterprise customers
- **Mitigation**: Data Processing Agreement template ready, document security controls in `SECURITY.md`, plan SOC 2 audit for Q2 2026
- **Budget**: SOC 2 audit costs ~$15-30k

---

## 11. Success Metrics

### Phase Success Criteria

**End of Week 1 (Stripe Integration)**:
- 3 successful test subscriptions (Free > Small > Medium > Cancel)
- Webhook delivery success rate >99%
- Zero subscription status mismatches between Stripe and database

**End of Week 2 (Homepage Launch)**:
- Homepage live at production domain
- Lighthouse score: Performance >90, Accessibility >95, SEO 100
- Conversion rate from homepage to signup >5%

**End of Week 3 (Mono-Repo)**:
- All apps and packages build successfully
- Zero import errors across packages
- Build time improvement >30% with Turborepo caching

**End of Week 4 (MCP Servers)**:
- Stripe and GitHub MCP servers functional
- RLS test suite passing in CI (30+ tests)
- Developer onboarding time reduced by 50% (documented setup)

### Business Metrics (3 Months Post-Launch)
- **Customer Acquisition**: 100 signups, 20 paid conversions
- **Revenue**: $1,500 MRR (Monthly Recurring Revenue)
- **Retention**: <10% monthly churn rate
- **Support**: <2 hour average response time
- **Uptime**: 99.9% availability (Supabase + Vercel SLA)

---

## 12. Next Steps (Immediate Actions)

### Action 1: Install Stripe MCP Server (5 minutes)
```bash
# Add to Cursor/Claude Desktop config
# Location: ~/Library/Application Support/Claude/claude_desktop_config.json
```

### Action 2: Install GitHub MCP Server (5 minutes)
```bash
# Add to Cursor/Claude Desktop config
# Create GitHub Personal Access Token
```

### Action 3: Create Stripe Account (10 minutes)
- Sign up at stripe.com
- Enable test mode
- Get API keys (publishable + secret)
- Create webhook endpoint (placeholder URL for now)

### Action 4: Begin Week 1 Tasks (Stripe Integration)
- Install Stripe SDK: `npm install stripe @stripe/stripe-js`
- Create `subscriptions` table migration
- Build first API route: `/api/stripe/checkout`

### Action 5: Mark Roadmap Approved (Awaiting User Confirmation)
- Once user reviews and approves this roadmap, proceed with implementation
- Estimated total time: 4 weeks (100-120 hours)
- Recommend starting with Week 1 (Stripe) as highest priority

---

## 13. Open Questions for Product Owner

1. **Pricing Confirmation**: Are these pricing tiers acceptable?
   - Free: $0/mo (10 seats, basic features)
   - Small: $49/mo (25 seats)
   - Medium: $149/mo (50 seats)
   - Enterprise: Custom pricing (contact sales)

2. **Domain Strategy**: Do you have domains purchased?
   - Marketing: `vaults.app` (root domain)
   - Dashboard: `app.vaults.app` (subdomain)

3. **Branding Assets**: Do you have logo, brand colors, marketing copy ready for homepage?

4. **Timeline Constraints**: Is 4-week timeline acceptable or need to accelerate/adjust priorities?

5. **Team Capacity**: Will this be solo development or team collaboration (impacts remote caching, code review flow)?

6. **Commercial TSA Budget**: Can budget ~$500-1000/year for production timestamp authority (DigiCert/Sectigo) for Secrets module?

---

## 14. Conclusion

VAULTS is technically ready for production. The next phase shifts focus from building the dashboard to building the **commercial infrastructure** that enables customer acquisition and revenue generation.

**Recommended Priority Order**:
1. **Week 1: Stripe Integration** (unlocks revenue)
2. **Week 2: Homepage** (unlocks customer acquisition)
3. **Week 3: Mono-Repo** (enables future scalability)
4. **Week 4: MCP Servers** (improves developer experience)

This roadmap balances immediate business needs (revenue + customer acquisition) with long-term technical health (code reusability + developer experience).

**Ready to proceed with Week 1 (Stripe Integration)?**
