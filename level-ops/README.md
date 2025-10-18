# VAULTS

Secure workspaces for founders and investors. Sign up free, then buy a Vault for each organization you work with.

## Business Model

- **Free user profile:** Anyone can sign up and create a personal profile at no cost
- **Paid Vaults:** Purchase a Vault workspace for each organization (startup, fund, board)
- **Seat-based pricing:** Each Vault includes founder seats and investor seats
- **Tiers:** Basic, Premium, Ultimate plans with different seat limits

## Quick Start

```bash
# Install dependencies
npm install

# Install Secrets module dependency (required for evidence export)
npm install jszip

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run typecheck` — TypeScript type checking
- `npm run lint` — ESLint validation
- `npm run format` — Prettier formatting
- `npm run test` — Run tests

## Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_APP_NAME` — App name (default: VAULTS)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_KEY` — Service key (server-only)

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **Agent:** CopilotKit + FastAPI (Python)
- **AI:** OpenAI (embeddings, LLM)
- **Search:** pgvector + BM25 hybrid search
- **Testing:** Jest, Testing Library
- **PWA:** Workbox

## Core Features

### Vault Management
- **Organizations (Vaults)**: Paid workspaces with seat-based pricing
- **Member Management**: OWNER/ADMIN/EDITOR/VIEWER roles with granular permissions
- **Invitations**: Token-based with email validation and notifications
- **White-Label Branding**: Custom logos, brand colors with WCAG 2.2 AA validation
- **Module Toggles**: Enable/disable features per vault (Tasks, Milestones, Risks, etc.)

### Executive Layer (New - October 2025)
- **Vault Profile**: Organization home with mission/vision/values, OKRs, and recent activity
- **Metrics**: KPI tracking with trend indicators and target monitoring
- **Finance**: Monthly financial snapshots (ARR, revenue, cash, burn, runway)
- **Reports**: Executive summaries with multi-stage approval workflow and SHA-256 hashing
- **Packs**: Immutable board pack generation with agenda builder and attendee management
- **Requests**: Investor Q&A workflow with response tracking and notifications
- **Governance**: Combined Decisions + Risks with multi-signature approval workflow
- **Documents**: PDF library with sections and inline Q&A
- **Members**: Team management (relabeled from Contacts)
- **Dashboard**: Cross-vault portfolio overview (top navigation)

### Collaboration Tools (Legacy)
- **Tasks**: Full CRUD with status workflow (todo, in_progress, blocked, done, archived)
- **Milestones**: Project milestones with progress tracking
- **Risks**: Risk identification with impact/probability matrix
- **Decisions**: Architecture Decision Records (ADRs) with rationale tracking

### Secrets Module (Premium)
- **Trade Secret Management**: Version-controlled secrets with immutable snapshots
- **Evidence Export**: ZIP export with all versions and supporting files
- **Audit Trail**: Complete history of all secret operations (view, download, share, seal)
- **NDA Tracking**: Record NDA acknowledgment before access
- **SHA256 Hashing**: Tamper-proof verification of secret content
- **TSA Token Support**: Timestamping Authority integration (future)

### Vault Profile
- **Company Information**: Legal name, brand name, mission, vision, values, goals
- **Contact Details**: Websites, phones, emails, social media links
- **Corporate Info**: Industry, size, incorporation date, registration number, tax ID
- **Addresses**: Multi-address support with geocoding (Google Places integration ready)
- **Key Contacts**: Structured contact management for executives and stakeholders

### AI Assistant
- **24 AI Actions**: Complete CRUD operations via natural language
- **RAG Document Search**: Hybrid vector + BM25 search across uploaded PDFs
- **Real-Time Context**: AI always has access to current vault data
- **Audit Logging**: All AI actions tracked with before/after snapshots

### Dashboard
- **Real-Time Metrics**: Live stats for tasks, risks, decisions, documents
- **Task Distribution Chart**: Pie chart showing task status breakdown (Recharts)
- **Risk Matrix**: Scatter plot of risks by impact and probability
- **Activity Timeline**: Recent actions across all modules
- **Milestone Progress**: Progress bars showing completion status

## Project Structure

```
app/           # Next.js app router
  (dashboard)/ # Dashboard pages (tasks, risks, documents, etc.)
  api/         # API routes (vaults, secrets, webhooks)
components/    # React components
  dashboard/   # Dashboard-specific components (charts, stats)
  navigation/  # Navigation components (bottom nav, user menu)
  profile/     # Profile-related components
  secrets/     # Secrets module components
  ui/          # Base UI components (Radix UI)
lib/           # Utilities and client libraries
  config/      # Branding and configuration
  billing/     # Billing abstraction layer
  vaults/      # Vault scoping utilities
  hooks/       # Custom React hooks
  services/    # Business logic services
  utils/       # Utility functions
server/        # Server-side utilities
agent/         # AI agent (Python FastAPI)
public/        # Static assets
```

## Security

- Row-Level Security (RLS) enforced on all tables
- Vault isolation at database level
- See `SECURITY.md` for details

## Data Model

**Core Concepts:**
- **organizations** table → Vaults (paid workspaces)
- **profiles** → Free user accounts
- **org_memberships** → Vault membership with roles
- **vault_subscriptions** → Billing and seat limits

**Terminology:**
- In code: use `org_id` (represents `vault_id`)
- In UI/docs: use "Vault" terminology
- Legacy `tenant_id` columns preserved for backward compatibility

## Documentation

### Product & Strategy
- [Product Strategy](docs/LEVEL_PRODUCT_STRATEGY.md) — Premium positioning, ICPs, success criteria
- **[Executive Layer Module Plan](REVISED_MODULE_PLAN.md)** — Implementation status of executive layer transformation (COMPLETE)
- [Architecture](docs/ARCHITECTURE.md) — System diagram, components, data flow
- [Data Model](docs/DATA_MODEL.md) — Complete schema, tables, indexes, RLS

### Implementation Guides
- [Deployment Guide](docs/DEPLOYMENT.md) — Complete deployment guide (GitHub, Railway, Vercel)
- [Permissions System](docs/PERMISSIONS_COMPLETE.md) — RBAC, roles, testing, security
- [RAG System](docs/RAG_COMPLETE.md) — Document search, hybrid retrieval, CopilotKit integration

### Security & Trust
- [SECURITY.md](SECURITY.md) — Security posture, RLS, audit, incident response
- [Security & Trust Pack](docs/security_and_trust.md) — Premium features, DPA, compliance, SLAs

### Runbooks
- [Pilot Onboarding](docs/runbooks/onboarding_pilot.md) — Exit criteria, weekly cadence, board pack generation
- [Dedicated Node Setup](docs/runbooks/dedicated_node.md) — Region options, provisioning, SLA notes

### Go-to-Market
- [Positioning & Pricing](docs/gtm/positioning_and_pricing.md) — Premium plans, guardrails, ROI calculator

### Development
- [CLAUDE.md](CLAUDE.md) — Engineering contract (rules for Claude Code)
- [Claude Operating Instructions](docs/prompts/claude_operating_instructions.md) — Safe implementation patterns
- [PROGRESS.md](docs/planning/PROGRESS.md) — Sprint progress tracker
- [CONTRIBUTING.md](CONTRIBUTING.md) — Workflow, code standards, PR guidelines
- [SETUP.md](docs/setup/SETUP.md) — Local development setup

## Contributing

See `CONTRIBUTING.md` for workflow and standards.
