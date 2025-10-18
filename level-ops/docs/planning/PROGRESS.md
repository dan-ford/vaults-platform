# PROGRESS.md

## Phase A (Repo Baseline)
- [x] Next.js app scaffolded
- [x] Tailwind/ESLint/Prettier set
- [x] Husky pre-commit hook configured
- [x] npm install completed
- [x] CLAUDE.md/SECURITY.md/CONTRIBUTING.md/README.md added
- [x] .env.local configured with Supabase credentials

## Phase B (Tenancy & RLS) - UPGRADED TO MULTI-ORG
- [x] Tenancy tables & migrations (5 migrations applied)
- [x] **Multi-org architecture** (organizations, org_memberships, org_invitations tables)
- [x] **Migrated from tenant_id to org_id** (all tables, RLS policies, backend services)
- [x] RLS deny-by-default; policies configured with org_memberships pattern
- [x] Auth middleware (route protection, session management)
- [x] **Organization context provider** (loads user orgs, manages current selection)
- [x] **Organization switcher** in dashboard header
- [x] **All pages filter by org_id** (Tasks, Milestones, Risks, Documents)
- [x] Sample data: 3 organizations (VDA, Fathom, Level) for testing
- [x] **Profiles table** (REQUIRED for member management):
  - [x] Table created with user_id, email, first_name, last_name, phone, avatar_url
  - [x] RLS policies configured (users can view all, update own)
  - [x] Auto-create trigger on user signup (handle_new_user function)
  - [x] Backfill existing users (1 user migrated)
  - [x] Realtime enabled for live updates
  - [x] Foreign key to auth.users with cascade delete
  - [x] Foreign key from org_memberships to profiles for joins
- [x] **Supabase Storage** (Image uploads):
  - [x] avatars bucket (public, 5MB limit, image formats)
  - [x] org-logos bucket (public, 5MB limit, image + SVG)
  - [x] RLS policies (users can manage own avatars, admins can manage org logos)
  - [x] Upload/delete/replace functionality
  - [x] Public URL generation for display
- [x] **🚨 CRITICAL: Level Admin Page** - Platform operators can now:
  - [x] Create new organizations with name, slug, and owner assignment
  - [x] Assign initial OWNER to organization (validates user exists)
  - [x] View all organizations with member counts, logos, brand colors
  - [x] Delete organizations (with cascade deletion of related data)
  - [x] Platform admin authorization via `platform_admins` table and `is_platform_admin()` RPC
  - [x] "Level Admin" menu item in user menu (Shield icon, visible only to platform admins)
  - [x] Access restriction page for non-platform admins
- [x] **🚨 CRITICAL: Organization Settings Page** - Org admins can now:
  - [x] Upload/delete organization logo (Supabase Storage - org-logos bucket)
  - [x] Update brand color with visual preview
  - [x] Invite members (create org_invitations with secure tokens)
  - [x] View/manage members with names from profiles table
  - [x] Change member roles (OWNER/ADMIN/EDITOR/VIEWER)
  - [x] Remove members (delete org_memberships)
  - [x] Revoke pending invitations
  - [x] **Vault Plans & Seat Limits** (Admin-only plan management):
    - [x] Plan tiers: Small (10 seats), Medium (25 seats), Enterprise (75 seats)
    - [x] Real-time seat usage tracking (members_count cached in organizations table)
    - [x] Admin dropdown to change plans (immediate effect on seat capacity)
    - [x] Seat usage progress bar with color-coded warnings
    - [x] Block invites when vault is at capacity
    - [x] Block plan downgrades when current members exceed new limit
    - [x] Seat limit checks enforced at invite creation and acceptance
    - [x] Database triggers to keep members_count accurate
    - [x] API routes: GET/PATCH /api/vaults/[id]/plan, GET /api/vaults/[id]/members/can-invite
  - [x] Role-based access control (OWNER/ADMIN only)
  - [x] Four-tab interface (Organization, Members, Invitations, Branding)
  - [x] 5MB file size limit with validation for logos
  - [x] Supports JPG, PNG, GIF, WebP, SVG formats for logos
  - [x] ✅ **UNBLOCKED**: Profiles table created and integrated
- [x] **🚨 CRITICAL: Invitation Acceptance Flow**:
  - [x] `/invite` page to handle token parameter
  - [x] `accept_org_invite()` RPC function in database
  - [x] Comprehensive error handling (expired, invalid, email mismatch, already member)
  - [x] Success redirect to dashboard
  - [x] Auto-login redirect for unauthenticated users
  - [x] "Copy Link" button in Organization Settings for pending invitations
  - [x] Clipboard integration for easy sharing
- [x] **User Profile Page** - Users can now:
  - [x] View/edit profile (first_name, last_name, phone)
  - [x] Upload/delete profile photo (Supabase Storage - avatars bucket)
  - [x] Live preview of uploaded photo
  - [x] View all organizations they belong to with roles
  - [x] Email displayed (read-only, managed by auth)
  - [x] Accessible to ALL users (OWNER/ADMIN/EDITOR/VIEWER)
  - [x] 5MB file size limit with validation
  - [x] Supports JPG, PNG, GIF, WebP formats
- [x] **Role-Based Settings Access** - Improved UX:
  - [x] Profile tab visible to ALL users
  - [x] Organization/Members/Invitations/Branding tabs only for OWNER/ADMIN
  - [x] No more blocking "Admin Access Required" page
  - [x] Seamless, friction-free experience for all roles
- [x] **White-Label Branding** - Dynamic theming system:
  - [x] Organization logo replaces default logo in header (auto-updates on org switch)
  - [x] Dynamic brand color injection via CSS variables (--primary, --accent, --ring)
  - [x] Hex-to-RGB conversion for Tailwind CSS variable compatibility
  - [x] Real-time brand updates across entire app when org changes
  - [x] Fallback to default accent color (#26ace2) when no brand color set
  - [x] Brand colors applied to buttons, links, focus rings, active states
- [x] **Content Security Policy** - CSP configured for Supabase Storage:
  - [x] Supabase Storage URLs whitelisted in img-src directive (next.config.ts)
  - [x] Avatars and logos load without CSP blocking
- [x] **UI Component Fixes**:
  - [x] File input border clipping fixed (Input component uses h-auto for file inputs)
  - [x] Image aspect ratio warnings resolved (consistent h-[40px] w-auto)
- [x] **Host-Based Tenant Resolution** - Domain/subdomain multi-tenancy:
  - [x] Domain index on organizations table for fast lookups
  - [x] Middleware parses host and resolves organization from domain
  - [x] Organization context auto-selects org based on current domain
  - [x] Custom domain field in Organization Settings UI
  - [x] Priority: domain-matched org > localStorage > first org
  - [x] RLS ensures users can only access domains for orgs they're members of
  - [x] Works with subdomains (client1.level.app) and custom domains (portal.client.com)
  - [x] Localhost development falls back to organization switcher

## Phase C (Core CRUD & Views)
- [x] **Dashboard page (COMPLETE)** - Real-time metrics with stat cards, Recharts charts, activity timeline
- [x] Tasks page with full CRUD (create/edit/delete with dialog modals)
- [x] Milestones page with full CRUD (create/edit/delete with dialog modals)
- [x] Risks page with full CRUD (create/edit/delete with dialog modals)
- [x] Documents page with PDF upload/download/delete
- [x] PDF text extraction on upload (server-side API route with pdfjs-dist)
- [x] Document text content stored in database for AI access
- [x] AI action descriptions improved to prevent unintended downloads
- [x] **Decisions page with full CRUD** (ADR format with context, decision, rationale, alternatives)
- [x] **Decisions with AI actions** (createDecision, updateDecision, deleteDecision)
- [x] **Contacts page with full CRUD** (first/last name, email, phone, company, title, type, status, notes)
- [x] **Contacts with AI actions** (createContact, updateContact, deleteContact)
- [x] **Secrets page (COMPLETE)** - Trade secret management with versioning, evidence export, audit trail
- [x] **Vault Profile page (95% COMPLETE)** - Company info, addresses, contacts (address dialog pending)
- [x] Profile page (COMPLETE - user profiles with avatar upload)
- [x] Notifications page (COMPLETE - vault invites, realtime badge)
- [x] Settings page (COMPLETE - org settings, members, branding, modules)
- [x] **Auth pages (COMPLETE)**:
  - [x] Login page with email/password and social auth
  - [x] **Signup page with comprehensive validation**:
    - [x] Email, first name, last name, password, confirm password fields
    - [x] Real-time password requirements validation (8+ chars, upper, lower, number, special)
    - [x] Visual password strength indicators with check/x icons
    - [x] Confirm password matching validation
    - [x] Proper form validation and error handling
    - [x] Integration with Supabase Auth (auto-creates profile via trigger)
    - [x] Social auth buttons (Google, GitHub)
    - [x] Redirect to dashboard on successful signup
  - [x] Stacked logo variants for auth pages (PNG + SVG)
  - [x] Consistent auth page branding and layout
- [x] Bottom navigation component updated (Tasks, Milestones, Documents, Dashboard, Contacts, Risks, Decisions)
- [x] Bottom navigation responsive spacing (equal width items, proper breakpoints)
- [x] Dashboard layout with hamburger menu (Profile, Notifications, Settings, Logout)
- [x] User menu with dropdown and logout functionality
- [x] AI Assistant toggle button in header
- [x] Dialog component for modals
- [x] Task CRUD with inline edit/delete buttons
- [x] Realtime subscriptions (org-scoped, live updates)
- [x] Auto-refresh pattern implemented (mount + visibilitychange + realtime)
- [x] Responsive dialogs (max-h-[90vh], scrollable content, textareas for multi-line)
- [x] Milestones CRUD with AI actions (createMilestone, updateMilestoneStatus, deleteMilestone, listMilestonesByStatus)
- [x] Risks CRUD with AI actions (createRisk, updateRisk, deleteRisk)
- [x] Documents with AI actions (searchDocuments, listDocumentsByCategory, downloadDocument, deleteDocument)
- [x] Supabase Storage integration for PDF files
- [x] Document categorization (general, contract, proposal, report, specification, other)
- [x] **Search page uses organization context** (updated from tenant to org)
- [ ] Board/Timeline views
- [ ] Comments, Activity

## Phase D (Agent)
- [x] CopilotKit integrated across all pages via dashboard layout
- [x] CopilotChat replaced CopilotSidebar for single-click access
- [x] AI assistant sidebar with page push-left behavior
- [x] Chat persists across pages (always mounted, visibility toggled)
- [x] AI actions for Tasks: createTask, updateTaskStatus, deleteTask, listTasksByStatus
- [x] AI actions for Milestones: createMilestone, updateMilestoneStatus, deleteMilestone, listMilestonesByStatus
- [x] AI actions for Risks: createRisk, updateRisk, deleteRisk
- [x] AI actions for Documents: searchDocuments, listDocumentsByCategory, downloadDocument, deleteDocument
- [x] AI context includes full document text content via useCopilotReadable (agent can read PDF contents)
- [x] AI can download documents from chat
- [x] AI can delete documents from chat
- [x] AI actions now use real tenant_id from context
- [x] Realtime enabled on all tables (risks, tasks, milestones, decisions, comments, documents)
- [x] **FastAPI backend service** (Python/uvicorn) - Service running at port 8000
- [x] **Audit logging service** - writeAuditLog, writeAuditLogBatch, fetchAuditLogs, redactSensitiveFields
- [x] **Audit logging hook** - useAuditLog hook (logAgentAction, logUserAction, logSystemAction)
- [x] **Audit logging integrated in ALL AI actions** - All agent actions now log to activity_log table:
  - [x] Tasks: createTask, updateTaskStatus, deleteTask
  - [x] Milestones: createMilestone, updateMilestoneStatus, deleteMilestone
  - [x] Risks: createRisk, updateRisk, deleteRisk
  - [x] Decisions: createDecision, updateDecision, deleteDecision
  - [x] Contacts: createContact, updateContact, deleteContact
  - All logs include before/after state snapshots, metadata, and org_id for RLS
- [ ] Pydantic tool schemas for FastAPI backend
- [ ] E2E agent CRUD under RLS

## Phase D.1 (RAG - Document Knowledge Base)
**Status:** ✅ COMPLETE - Multi-Org Architecture Integrated

### Database Layer ✅
- [x] pgvector extension enabled
- [x] document_chunks table with org_id column (migrated from tenant_id)
- [x] HNSW index for vector similarity (partial on embedded rows)
- [x] GIN index for full-text search (tsvector)
- [x] Composite indexes for org scoping and neighbor fetch
- [x] Content hash index for deduplication
- [x] **RLS policies using org_memberships pattern** (org-isolated)
- [x] **Hybrid search function updated to use org_id** (search_chunks_hybrid)
- [x] BM25 normalization and empty query handling
- [x] Realtime publication enabled for document_chunks
- [x] **Existing chunks assigned to VDA organization** (84 chunks migrated)

### Backend Services ✅
- [x] **Pydantic models updated with org_id support** (backward compatible with tenant_id)
- [x] Configuration module with environment-based settings (agent/config.py)
- [x] EmbeddingService with OpenAI text-embedding-3-small, SHA256 dedup, token counting
- [x] DocumentProcessor service (chunking, embedding, storage with dedup)
- [x] **FastAPI endpoints updated to use org_id** (/ingest, /status, /delete-chunks)
- [x] Background task processing for async document ingestion
- [x] requirements.txt with FastAPI, Supabase, OpenAI, LangChain

### Frontend Integration ✅
- [x] **TypeScript wrappers updated to use org_id** (lib/supabase/rag.ts)
- [x] searchChunksHybrid, fetchNeighborChunks, getDocumentChunkStatus, deleteDocumentChunks
- [x] **Webhook updated to pass org_id** (/api/webhooks/document-uploaded)
- [x] **RAG search action uses organization context** (use-rag-search-action.ts)
- [x] Documents page calls webhook with org_id after upload
- [x] .env.example updated with FASTAPI_URL, OPENAI_API_KEY, RAG config

### Ready to Use 🚀
- To start: `cd level-ops/agent && uvicorn agent.main:app --reload --port 8000`
- RAG is fully org-isolated: each organization can only search their own documents
- AI assistant can search uploaded PDFs via `search_documents` action

### Future Enhancements (Phase 2)
- [ ] Implement MMR diversification algorithm
- [ ] Implement neighbor window expansion
- [ ] Add optional cross-encoder reranking
- [ ] Add "Why these sources?" UI component
- [ ] Implement golden-set evals and RAGAS metrics
- [ ] Add observability (OpenTelemetry/LangSmith traces)

## Phase E (White-Label UX)
- [x] **Branding editor with WCAG contrast checks** - Accessibility validation:
  - [x] Real-time WCAG 2.2 contrast ratio calculation (4.5:1 for AA, 7:1 for AAA)
  - [x] Visual contrast rating badges (AAA, AA, AA Large, Fail)
  - [x] Accessibility warnings for poor contrast combinations
  - [x] Suggested accessible alternatives (darker/lighter versions that meet AA)
  - [x] One-click alternative selection
  - [x] Contrast validation against white backgrounds
  - [x] Prevents organizations from choosing inaccessible brand colors
- [x] **Module toggles** - Per-organization feature control:
  - [x] Module definition system (Tasks, Milestones, Risks, Documents, Decisions, Contacts)
  - [x] Module settings stored in organizations.settings JSONB column
  - [x] Checkbox toggles in Organization Settings UI
  - [x] Navigation automatically hides disabled modules
  - [x] isModuleEnabled() utility for checking module state
  - [x] Default all modules enabled for backward compatibility
  - [x] Organizations can customize which features they need
- [ ] Domain wizard (DNS setup guide)

## Phase F (Reporting)
- [x] **Reports database table** with RLS policies (org-scoped)
- [x] **Report generation service** (lib/services/report-generator.ts):
  - [x] Weekly executive summary with markdown templates
  - [x] Monthly roll-up reports with analytics
  - [x] Statistics gathering (tasks, milestones, risks, decisions, contacts, documents)
  - [x] Health indicators and trend analysis
- [x] **Reports page UI** (/reports):
  - [x] Report generation dialog (weekly/monthly, current/previous period)
  - [x] Report cards with quick stats preview
  - [x] Download reports as Markdown (.md files)
  - [x] Delete reports functionality
  - [x] Realtime updates for new reports
- [x] **AI actions for reports**:
  - [x] generateWeeklySummary - AI can generate weekly summaries via chat
  - [x] generateMonthlySummary - AI can generate monthly summaries via chat
  - [x] listReports - AI can list all generated reports
- [x] **Reports module** added to module toggle system
- [x] Reports navigation item (bottom nav with TrendingUp icon)

## Phase H (Production Deployment) - ✅ COMPLETE
**Status:** ✅ DEPLOYED (October 16, 2025)
**Latest Deployment:** October 17, 2025 - Signup page with password validation

### GitHub Repository ✅
- [x] **Clean repository structure** created:
  - Deleted old repository with duplicate/conflicting structure
  - Created new repository: `dan-ford/vaults-platform`
  - Clean structure with only `level-ops/` subdirectory
  - Removed problematic root-level configuration files
  - Fixed security issue: Removed real OpenAI API key from example files
- [x] **Repository URL**: https://github.com/dan-ford/vaults-platform
- [x] **Latest commit**: 6130e57 (Signup page with password validation)
- [x] **Continuous deployment**: Vercel auto-deploys on push to main

### Railway Deployment (RAG Agent Backend) ✅
- [x] **Python FastAPI agent deployed**:
  - Project name: `vaults-agent`
  - Production URL: https://vaults-agent-production.up.railway.app
  - All environment variables configured (SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY)
  - Fixed Python import errors (changed from `agent.config` to `config`)
  - Deployment healthy and responding to requests
- [x] **RAG functionality working**:
  - Document ingestion endpoint active
  - Vector search operational
  - Integration with Supabase pgvector complete

### Vercel Deployment (Next.js Frontend) ✅
- [x] **Next.js application deployed**:
  - Deleted old misconfigured Vercel project
  - Created new project properly connected to GitHub
  - Set Root Directory to `level-ops`
  - Deployment successful and working
  - Production environment configured
- [x] **Environment variables configured**:
  - NEXT_PUBLIC_SUPABASE_URL: ✅ Set
  - NEXT_PUBLIC_SUPABASE_ANON_KEY: ✅ Set
  - SUPABASE_SERVICE_KEY: ✅ Set
  - NEXT_PUBLIC_COPILOT_CLOUD_API_KEY: ✅ Set
  - OPENAI_API_KEY: ✅ Set
  - FASTAPI_URL: ✅ Set (points to Railway)
  - NEXT_PUBLIC_APP_URL: ✅ Set (Vercel production URL)

### Deployment Issues Resolved ✅
- [x] Fixed: Vercel 404 errors due to duplicate repository structure
- [x] Fixed: Railway import errors in Python agent
- [x] Fixed: Root-level configuration files conflicting with subdirectory build
- [x] Fixed: GitHub push protection blocking real API key
- [x] Fixed: Vercel building from wrong directory

### Current Production Status
- ✅ RAG agent backend: Deployed and running on Railway
- ✅ Next.js frontend: Deployed and running on Vercel
- ✅ Environment variables: All configured
- ✅ GitHub repository: Clean and properly structured
- ⏳ End-to-end verification: User testing in progress

## Phase G (Hardening)
**Status:** 🔄 IN PROGRESS

### Documentation & Planning ✅
- [x] **Comprehensive audit report** (COMPREHENSIVE_AUDIT_REPORT.md - Complete systematic review)
- [x] **Comprehensive status report** (STATUS_REPORT.md - 441 lines)
- [x] **Unified color scheme** across all 15 UI files:
  - [x] Level Brand Blue (#26ace2) for primary actions and accents
  - [x] Grey/Slate tones (slate-100 to slate-400) for neutral UI elements
  - [x] Destructive semantic color for errors and delete actions
  - [x] Removed all unauthorized colors (purple, blue variants, green, red, yellow, orange, pink, rose, amber, emerald, cyan, teal, lime, indigo, violet)
- [x] **Project roadmap** (NEXT_STEPS.md - 481 lines):
  - [x] Current state analysis (85% complete, 6/7 phases)
  - [x] Critical issues identified (TypeScript types, 13 security warnings, <5% test coverage)
  - [x] Prioritized Phase G plan (2 weeks)
  - [x] Phase H production readiness plan (2-3 weeks)
  - [x] Success metrics and health dashboard
  - [x] Immediate action items

### Database Types ✅
- [x] **TypeScript types regenerated** with all 17 tables including reports (984 lines)
- [x] Simple helper types for maximum compatibility
- [x] User needs to restart TS server in Cursor to clear cache

### Color Scheme Unification ✅
- [x] app/(dashboard)/admin/page.tsx (Shield icon, warnings, delete buttons)
- [x] app/(dashboard)/milestones/page.tsx (Status badges, delete buttons)
- [x] app/(dashboard)/documents/page.tsx (Category badges, delete buttons)
- [x] app/(dashboard)/tasks/page.tsx (Delete buttons)
- [x] app/(dashboard)/risks/page.tsx (Impact levels, probability, status - 4-level graduated slate scheme)
- [x] app/(dashboard)/decisions/page.tsx (Status badges)
- [x] app/(dashboard)/contacts/page.tsx (Type and status badges)
- [x] app/(dashboard)/settings/page.tsx (Role badges, tab selections, delete buttons, WCAG contrast badges)
- [x] app/(dashboard)/reports/page.tsx (Info boxes)
- [x] app/(dashboard)/search/page.tsx (Error cards)
- [x] app/invite/page.tsx (Success icons)
- [x] components/navigation/user-menu.tsx (Danger variant for logout)
- [x] components/ui/badge.tsx (Neutral, success, warning, danger variants)

### Critical Issues Identified (October 11, 2025 Audit)
- [ ] **TypeScript Errors (29 errors)** - Next.js 15 async params pattern required
  - 6 API route files need updating to await params
  - Notifications table missing from generated types
  - **Blocker:** Cannot build until fixed
- [ ] **Security Warnings (10 issues)** - Supabase Advisor findings
  - 8 functions need `SET search_path = ''` to prevent SQL injection
  - Leaked password protection disabled (enable HaveIBeenPwned)
  - RLS disabled on platform_admins (acceptable by design)
- [ ] **Test Coverage (<5%)** - Critical gap
  - Only 4 test files, 2 outdated/broken
  - Missing test dependencies (@testing-library/react, etc.)
  - No RLS policy tests (CRITICAL security validation missing)

### Next Steps (Immediate - Week 1)
- [ ] **Fix TypeScript Errors** (2 hours)
  - Update 6 API route files to Next.js 15 pattern
  - Regenerate Supabase types with notifications table
- [ ] **Fix Security Warnings** (1 hour)
  - Create migration to add SET search_path to 8 functions
  - Enable leaked password protection in Supabase Auth
- [ ] **Install Test Dependencies** (5 minutes)
  - Run: npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
- [ ] **Write RLS Policy Tests** (4 hours)
  - Test org isolation, role-based access, platform admin privileges

## Phase G.5 (Notifications & Bugfixes) - ✅ COMPLETE
**Status:** ✅ COMPLETE (October 10, 2025)

### Notification System ✅
- [x] **Database infrastructure**:
  - [x] `notifications` table with RLS policies (user_id isolation)
  - [x] Notification types: vault_invite, vault_owner_assigned, mention, task_assigned, comment, system
  - [x] Realtime enabled on notifications table
  - [x] `create_notification()` helper function for easy notification creation
  - [x] `accept_org_invite_by_id()` RPC function for notification-based invite acceptance
- [x] **Notification center UI** (`/app/(dashboard)/notifications/page.tsx` - 545 lines):
  - [x] Accept/decline buttons for vault invites
  - [x] Accept & Join Vault button for owner assignments
  - [x] Mark as read/unread toggle (mail icons)
  - [x] Delete notification functionality
  - [x] Realtime subscription for live updates
  - [x] Responsive design (mobile: buttons below content, desktop: buttons on right)
  - [x] Empty state and loading states
  - [x] Unread count in page header
- [x] **User menu integration** (`/components/navigation/user-menu.tsx`):
  - [x] Unread notification badge (uses site primary color)
  - [x] Realtime updates to badge count
  - [x] Badge shows "99+" for counts over 99
  - [x] Badge disappears when no unread notifications
- [x] **Admin page integration** (`/app/(dashboard)/admin/page.tsx`):
  - [x] Sends notification when vault created (instead of auto-creating membership)
  - [x] User receives "vault_owner_assigned" notification
  - [x] User must accept from notification center to gain access
  - [x] Falls back to direct membership creation if notification fails
- [x] **Settings page invite system** (`/app/(dashboard)/settings/page.tsx`):
  - [x] Checks if invited user exists in system
  - [x] If user exists: Sends notification with invitation details
  - [x] If user doesn't exist: Falls back to URL-based invite
  - [x] Notification includes vault details and invitation ID

### Bugfixes ✅
- [x] **Organization logo persistence fix** (`/lib/context/organization-context.tsx`):
  - [x] Updated realtime subscription to update both `currentOrg` AND `organizations` array
  - [x] Preserved `role` field during realtime updates (lines 180-186)
  - [x] Logo now persists across page navigation without requiring full page refresh
  - [x] Fixed bug where logo would disappear when navigating between pages

### Phase G.6 (Permissions & RBAC System) - ✅ COMPLETE
**Status:** ✅ COMPLETE (October 11, 2025)

#### Permission Infrastructure ✅
- [x] **Permission hook** (`lib/hooks/use-permissions.ts`):
  - [x] usePermissions hook with role-based checks
  - [x] Helper functions: canEdit, canDelete, canManage
  - [x] hasPermission function for specific permission checks
  - [x] Role booleans: isOwner, isAdmin, isEditor, isViewer
- [x] **Permission Guard component** (`components/permissions/permission-guard.tsx`):
  - [x] Conditionally renders children based on permissions
  - [x] Permission levels: create, edit, delete, admin, view
  - [x] Optional fallback and error message display
- [x] **Role Badge component** (`components/permissions/role-badge.tsx`):
  - [x] Visual role indicator with icon and color coding
  - [x] Four role types: OWNER, ADMIN, EDITOR, VIEWER
  - [x] Optional description display
- [x] **Permission error utilities** (`lib/utils/permission-errors.ts`):
  - [x] Standardized error message generation
  - [x] getCreatePermissionError, getEditPermissionError, getDeletePermissionError
  - [x] Consistent, user-friendly messages across all actions

#### Error Handling Enhancements ✅
- [x] **Error Boundary component** (`components/error-boundary.tsx`):
  - [x] React error boundary for catching component errors
  - [x] User-friendly error display with retry option
  - [x] Development mode error details
- [x] **Error state components** (`components/error-states.tsx`):
  - [x] ErrorState component with retry functionality
  - [x] LoadingState component for consistent loading UI
  - [x] EmptyState component for no-data scenarios
- [x] **Supabase error handling** (`lib/utils/error-handling.ts`):
  - [x] getSupabaseErrorMessage for user-friendly error conversion
  - [x] logError utility for structured error logging
  - [x] Helper functions: isPermissionError, isNotFoundError, isDuplicateError
  - [x] Error code mappings for common database errors

#### Page Implementation ✅
**All 15 dashboard pages updated with full permission system:**
- [x] Contacts (`/contacts`) - Full CRUD with permissions
- [x] Tasks (`/tasks`) - Full CRUD with permissions
- [x] Milestones (`/milestones`) - Full CRUD with permissions
- [x] Risks (`/risks`) - Full CRUD with permissions
- [x] Decisions (`/decisions`) - Full CRUD with permissions
- [x] Documents (`/documents`) - Upload/delete with permissions
- [x] Settings (`/settings`) - Role-based tab access
- [x] Notifications (`/notifications`) - Role badge only
- [x] Search (`/search`) - Role badge only
- [x] Secrets (`/secrets`) - Full CRUD with permissions
- [x] Reports (`/reports`) - Generate button with permissions
- [x] Admin (`/admin`) - Platform admin only (unchanged)
- [x] Profile (`/profile`) - No permissions needed (own profile)
- [x] Dashboard (`/`) - No actions (view only)

**Each page includes:**
- [x] RoleBadge in header showing current user role
- [x] PermissionGuard wrapping all action buttons
- [x] Permission checks in all agent actions (create/update/delete)
- [x] Standardized error messages using permission error utilities
- [x] Enhanced error handling with loading/error states (contacts page example)

#### Agent Actions ✅
**All 15 agent actions updated with permission checks:**
- [x] Contacts: createContact, updateContact, deleteContact
- [x] Tasks: createTask, updateTaskStatus, deleteTask
- [x] Milestones: createMilestone, updateMilestoneStatus, deleteMilestone
- [x] Risks: createRisk, updateRisk, deleteRisk
- [x] Decisions: createDecision, updateDecision, deleteDecision
- All actions return standardized permission error messages
- All checks occur before any database operations

#### Navigation & Access Control ✅
- [x] Settings menu item visible to all users (VERIFIED)
- [x] Admin menu item only visible to platform admins (VERIFIED)
- [x] Settings page tabs properly gated:
  - Profile tab: ALL users
  - Organization/Team/Branding/Modules tabs: ADMIN/OWNER only
- [x] No changes needed to navigation (already correctly implemented)

#### Documentation ✅
- [x] **Permissions documentation** (`docs/PERMISSIONS.md` - 587 lines):
  - Role hierarchy and permission matrix
  - Implementation guide for hooks, guards, and components
  - Agent action protection patterns
  - Error handling utilities
  - Page-level implementation examples
  - Security considerations and RLS policy examples
  - Troubleshooting guide
- [x] **Testing guide** (`docs/PERMISSIONS_TESTING_GUIDE.md` - 441 lines):
  - Test account setup instructions
  - Comprehensive testing checklist for all 15 pages
  - Agent action testing procedures
  - Error handling tests
  - Cross-page consistency tests
  - Regression test checklist

#### Implementation Pattern
Every page follows this consistent pattern:
1. Import usePermissions hook and permission components
2. Add RoleBadge to page header
3. Wrap action buttons with PermissionGuard
4. Add permission checks at start of all agent actions
5. Use standardized error messages from utilities
6. Implement loading and error states

#### Role Capabilities Summary
- **VIEWER**: Read-only access, no action buttons visible
- **EDITOR**: Can create and edit, cannot delete
- **ADMIN**: Full CRUD access, organization settings access
- **OWNER**: Equivalent to ADMIN

### Phase I (Executive Layer Transformation) - ✅ PHASE 1B COMPLETE
**Status:** ✅ PHASE 1B COMPLETE (October 18, 2025)
**Strategic Goal:** Transform VAULTS into executive and investor communications platform

#### Phase 1A: Executive Core Foundation (COMPLETE - October 2025)
- [x] **Feature flag system** (`executive_layer_v2`)
  - Created `use-feature-flag.ts` hook for checking flags
  - Flags stored in `organizations.settings.modules` JSONB column
  - All new modules protected by feature flag
- [x] **Database migrations** (6 new tables):
  - `okrs` - Objectives and key results
  - `kpis` - Key performance indicators
  - `kpi_measurements` - Time-series KPI data
  - `financial_snapshots` - Monthly financial metrics
  - `board_packs` - Immutable board pack records
  - `decision_approvals` - Multi-signature approval workflow
- [x] **Metrics module** (`/metrics`):
  - KPI CRUD with display order
  - Measurement entry with period and variance notes
  - Trend indicators (up/down/flat) based on target
  - Cards showing latest value, target, and last 12 periods
  - Realtime subscriptions for live updates
  - Feature flag protected (executive_layer_v2)
- [x] **Finance module** (`/finance`):
  - Financial snapshot CRUD (ARR, revenue, gross margin, cash, burn, runway)
  - Month-over-month comparison with variance indicators
  - Historical snapshots grid (last 12 months)
  - Realtime subscriptions for live updates
  - Feature flag protected (executive_layer_v2)

#### Phase 1B: Navigation & Consolidation (COMPLETE - October 18, 2025)
- [x] **Governance module** (`/governance`):
  - Created new tabbed page combining Decisions and Risks
  - Tabs component (`components/ui/tabs.tsx`) using Radix UI
  - Decisions tab: Shows recent decisions with status badges, links to full /decisions page
  - Risks tab: Shows recent risks with impact/probability, links to full /risks page
  - Realtime subscriptions for both tables
  - Auto-refresh on visibility change
  - Module visibility checks (both decisions AND risks modules must be enabled)
- [x] **Dashboard moved to top navigation**:
  - Added LayoutDashboard icon to top nav in `app/(dashboard)/layout.tsx`
  - Dashboard now represents cross-vault portfolio overview
  - Removed from left sidebar (bottom-nav.tsx)
  - Icon positioned next to org switcher for clear hierarchy
- [x] **Navigation refinement**:
  - Contacts relabeled to "Members" in navigation (bottom-nav.tsx line 67-71)
  - Tasks archived from navigation (hidden when executive_layer_v2 enabled)
  - Milestones archived from navigation
  - Left sidebar now exactly 10 vault-specific modules
  - Top nav contains cross-vault/global functions
- [x] **Organization Profile removed from hamburger menu**:
  - Removed "Organization Profile" menu item
  - Will be replaced by vault-level Profile module (Phase 1C)
  - User profile remains accessible via Settings page

#### Phase 1C: Vault Profile Module (NEXT - Target: October 25, 2025)
- [ ] **Vault Profile page** (`/vault-profile` or rename /profile):
  - Org info section (mission, vision, values from vault_profiles table)
  - OKR section (objectives and key results with progress tracking)
  - Recent activity feed (last 10 actions across all modules)
  - Landing page when selecting a vault from org switcher
  - NOTE: Current /profile is user profile, need to decide on naming
  - Options: (1) /vault-profile for org home, keep /profile for user OR (2) /me for user, /profile for org

#### Phase 1D: Executive Enhancements (Target: November 1, 2025)
- [ ] **Reports enhancement** - Add approval workflow
  - Add approval_status, approved_by, approved_at columns
  - Implement approve/reject UI in Reports page
  - Add SHA256 hashing on approval for immutability
  - Store hash in database for verification
- [ ] **Packs module** (`/packs`) - Board pack generation
  - Create packs page with pack generation UI
  - Select reports, KPIs, and financial snapshots to include
  - Generate PDF bundle (explore jsPDF or similar)
  - Add SHA256 hashing of entire pack
  - Store metadata in board_packs table
- [ ] **Requests module** (`/requests`) - Investor Q&A flow
  - Create requests table (if not exists)
  - Build request/response interface
  - Status workflow (pending, responded, archived)
  - Assign requests to team members
  - Track response time metrics

#### Phase 2: Governance & Documents (Target: November 4-11, 2025)
- [ ] **Governance enhancement** - Decision approvals
  - Multi-signature approval workflow for decisions
  - Use decision_approvals table
  - Track who approved and when
  - Required approver count setting
- [ ] **Documents enhancement** - Sections and Q&A
  - Create document_sections table
  - Implement section CRUD (add/edit/delete sections within documents)
  - Add inline Q&A feature for each section
  - Track questions and answers per section

#### Current Navigation Structure (October 18, 2025)
**Top Navigation (Cross-Vault/Global):**
- Dashboard icon (cross-vault portfolio overview)
- Organization Switcher
- Search icon
- AI Assistant toggle
- User menu (Profile, Notifications, Settings, Admin for platform admins, Logout)

**Left Sidebar (10 Vault-Specific Modules):**
1. Profile (User icon) - Currently user profile, will become vault home
2. Metrics (BarChart3) - KPI tracking ✅
3. Finance (DollarSign) - Financial snapshots ✅
4. Reports (TrendingUp) - Executive summaries
5. Packs (Package) - Board packs (not yet built)
6. Requests (MessageSquare) - Investor Q&A (not yet built)
7. Documents (FileStack) - PDF library ✅
8. Governance (Scale) - Decisions + Risks combined ✅
9. Members (Users) - Team management ✅
10. Secrets (Shield) - Trade secrets ✅

**Archived from Navigation:**
- Tasks (hidden when executive_layer_v2 enabled)
- Milestones (hidden when executive_layer_v2 enabled)

### Pending Phase G Tasks
- [ ] Fix security issues (11 function search_path warnings)
- [ ] Install test dependencies (@testing-library/react, etc.)
- [ ] Write RLS policy tests (verify org isolation)
- [ ] Write unit tests (modules, contrast, report-generator utilities)
- [ ] Add error boundaries to layout components (ErrorBoundary component created)
- [ ] Add loading skeletons to data pages (LoadingState component created, example in contacts)
- [ ] Run full validation suite (typecheck + lint + build + test)
- [ ] Accessibility audit (WCAG 2.2 AA compliance)
- [ ] Performance optimization (Lighthouse >90)
- [ ] Complete user documentation (end-user guide, admin guide)