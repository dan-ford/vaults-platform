# Setup Instructions

## Prerequisites

- Node.js 18+ and npm
- Supabase account with project created
- Python 3.11+ (for FastAPI backend)

## Installation

Due to WSL/Dropbox permission issues, run this from a native location (not Dropbox):

```bash
cd level-ops
npm install
```

## What's Been Built

### ✅ Phase A: Repo Baseline (Complete)
- Next.js 15 app with TypeScript, Tailwind, ESLint, Prettier
- Husky pre-commit hooks
- Documentation (CLAUDE.md, SECURITY.md, CONTRIBUTING.md, README.md)

### ✅ Phase B: Multi-Org Architecture (Complete)
- **Organizations system**: Multi-tenant architecture with org_memberships
- **Profiles table**: User profiles with avatar support
- **Supabase Storage**: avatars and org-logos buckets with RLS
- **Organization context**: React context with realtime updates
- **Organization switcher**: Header component for org selection
- **Level Admin page**: Platform operators can create/manage organizations
- **Settings page**: Organization settings, member management, invitations, branding
- **Invitation flow**: Token-based invite acceptance with email validation
- **User profile page**: Profile editing with avatar upload
- **White-label branding**: Dynamic logo and brand color injection
- **CSP configuration**: Supabase Storage URLs whitelisted

### ✅ Phase C: Core CRUD & Views (Complete)
- **Dashboard**: Main landing page with org context
- **Tasks**: Full CRUD with dialogs, realtime updates, AI actions
- **Milestones**: Full CRUD with status management, AI actions
- **Risks**: Full CRUD with severity/probability, AI actions
- **Documents**: PDF upload/download with text extraction, RAG integration
- **Decisions**: Architecture Decision Records with AI actions
- **Contacts**: Contact management with AI actions
- **Bottom navigation**: Responsive nav with 7 sections
- **User menu**: Profile, Notifications, Settings, Admin, Logout

### ✅ Phase D: Agent (Complete)
- **CopilotKit integration**: Chat sidebar with page push-left behavior
- **AI actions**: Full CRUD operations for all entities
- **Audit logging**: All agent actions logged to activity_log table
- **FastAPI backend**: Python service for RAG processing

### ✅ Phase D.1: RAG - Document Knowledge Base (Complete)
- **pgvector integration**: Hybrid search with vector + full-text
- **Document chunking**: Automatic chunking and embedding on upload
- **Org-isolated search**: Each organization can only search their own documents
- **AI document search**: Agent can search and retrieve PDF content

## Running the App

### Frontend (Next.js)

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Backend (FastAPI - Optional for RAG)

```bash
cd agent
pip install -r requirements.txt
uvicorn agent.main:app --reload --port 8000
```

## First-Time Setup

### 1. Create Supabase Project
Visit [supabase.com](https://supabase.com) and create a new project.

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_KEY` — Service key (server-only)
- `FASTAPI_URL` — http://localhost:8000 (if using RAG)
- `OPENAI_API_KEY` — For document embeddings (if using RAG)

### 3. Run Database Migrations
All migrations are already applied. See `PROGRESS.md` for details.

### 4. Bootstrap Platform Admin
The first user to sign up is automatically made a platform admin. To add more:

1. Sign up a user via the app
2. Use Supabase SQL Editor to add them to `platform_admins` table

### 5. Create Your First Organization
As a platform admin:
1. Click the hamburger menu → Level Admin
2. Create a new organization
3. Assign yourself as the owner

### ✅ Phase E: White-Label UX (Complete)
- **Host-based tenant resolution**: Domain/subdomain parsing for automatic org selection
- **Branding editor with WCAG contrast checks**: Real-time accessibility validation
- **Module toggles**: Per-organization feature control (Tasks, Milestones, Risks, Documents, Decisions, Contacts, Reports)
- **Dynamic theming**: Organization logo and brand color injection

### ✅ Phase F: Reporting (Complete)
- **Reports database table**: Org-scoped with RLS policies
- **Report generation service**: Weekly and monthly executive summaries
- **Reports page**: Generate, download (Markdown), and manage reports
- **AI report generation**: Generate reports via chat (generateWeeklySummary, generateMonthlySummary)
- **Reports module**: Integrated into module toggle system

## Next Steps

See `PROGRESS.md` for completed features and remaining work:

### Phase G: Hardening (Planned)
- [ ] A11y checks (WCAG 2.2 AA)
- [ ] Performance smoke tests
- [ ] Security scan & dependency audit

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://lkjzxsvytsmnvuorqfdl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-key>
```

## Testing

```bash
npm run typecheck  # TypeScript checks
npm run lint       # ESLint
npm run test       # Jest
npm run build      # Production build
```

## Architecture Notes

- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind + Radix
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **AI**: CopilotKit (UI) + FastAPI (backend agent)
- **State**: TanStack Query for server state
- **Security**: RLS enforced at database level, deny-by-default
