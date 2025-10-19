# MOBILE OPTIMIZATION PLAN - VAULTS Platform

## Executive Summary

This document outlines a comprehensive strategy to transform VAULTS into an exceptional mobile experience while maintaining desktop functionality. The approach creates a **distilled mobile experience** focused on core executive functions, recognizing that most heavy usage occurs on tablet/desktop.

**Current State**: Desktop-first PWA with partial responsive support (avg 2/5 mobile rating)
**Target State**: Mobile-optimized progressive experience (target 4.5/5 mobile rating)
**Timeline**: 3-4 weeks phased implementation
**Philosophy**: Progressive enhancement - simple on mobile, powerful on desktop

---

## Strategic Principles

### 1. Mobile-First Hierarchy
- **Core Functions**: Quick views, approvals, status updates, notifications
- **Secondary Functions**: Detailed data entry, complex workflows, bulk operations
- **Desktop-Only**: Advanced analytics, multi-step wizards, data exports

### 2. Touch-Optimized Design
- Minimum 44x44px touch targets (industry standard)
- Maximum screen estate utilization
- Thumb-friendly placement (bottom sheet > top modal)
- No "boxes in boxes" - clean, flat hierarchy

### 3. Progressive Disclosure
- Show essentials first, expand for details
- Collapse complex forms into multi-step flows
- Hide secondary actions behind overflow menus
- Use bottom sheets for contextual actions

### 4. Performance & Accessibility
- 16px minimum font for inputs (prevents auto-zoom)
- WCAG 2.2 AA compliance maintained
- Fast touch response (<100ms feedback)
- Minimal layout shifts

---

## Codebase Audit Summary

### Module Ratings (Current Mobile Suitability)

| Module | Rating | Primary Issues | Priority |
|--------|--------|----------------|----------|
| **Profile** | 3/5 (GOOD) | Minor dialog tweaks | P3 |
| **Metrics** | 2.5/5 (FAIR) | Dense cards, form grids | P2 |
| **Finance** | 2.5/5 (FAIR) | High numeric density | P2 |
| **Reports** | 1.5/5 (POOR) | Dense cards, approval workflow | P1 |
| **Board Packs** | 1/5 (POOR) | Nested list management | P1 |
| **Requests** | 2.5/5 (FAIR) | Form grids, dropdowns | P2 |
| **Documents** | 2/5 (FAIR) | Large modals, nested Q&A | P1 |
| **Decisions** | 1/5 (POOR) | Very high density, 5 textareas | P1 |
| **Members** | TBD | Unknown | P2 |
| **Secrets** | 2/5 (FAIR) | max-w-5xl modal, viewer | P1 |
| **Dashboard** | TBD | Charts/visualizations | P1 |

### Critical Blockers (Affect All Modules)

1. **Large Modal Widths** - `max-w-3xl`, `max-w-4xl`, `max-w-5xl` not constrained on mobile
2. **Small Touch Targets** - Icon buttons 32x32px (need 44x44px)
3. **Fixed Form Grids** - 2-column grids don't collapse to single column
4. **Nested Dialogs** - Multiple dialog levels disorienting on small screens
5. **Right AI Panel** - 384px overlay takes 90%+ of mobile viewport

---

## Mobile Experience Strategy

### Core Mobile Use Cases

Based on executive/investor workflow analysis:

1. **Status Check** (5 min mobile session)
   - View latest metrics/finance snapshots
   - Check pending approvals/requests
   - Scan recent updates across vaults

2. **Quick Approval** (2 min mobile session)
   - Review decision/report awaiting approval
   - Approve/reject with brief notes
   - Sign off on requests

3. **Context Review** (10 min mobile session)
   - Read documents/sections
   - View sealed secrets (with NDA)
   - Check decision rationale

4. **Light Updates** (5 min mobile session)
   - Add quick metric/KPI update
   - Respond to request
   - Upload document

### Mobile-Optimized Patterns

#### Pattern 1: Summary + Detail View
**Use**: Metrics, Finance, Reports, Board Packs

Mobile shows summary cards → Tap expands to full-screen detail view

```
MOBILE LIST VIEW (Summary Card):
┌─────────────────────────┐
│ Q4 2024 Report         │
│ Status: Pending        │
│ Due: Dec 31            │
│                         │
│ [Tap to review]        │
└─────────────────────────┘

MOBILE DETAIL VIEW (Full Screen):
┌─────────────────────────┐
│ ← Q4 2024 Report       │
├─────────────────────────┤
│ Status: Pending        │
│ Period: Q4 2024        │
│                         │
│ 12 Tasks Complete      │
│ 3 Risks Identified     │
│                         │
│ [Full content...]      │
│                         │
│ ───────────────────────│
│ [Approve] [Reject]     │
└─────────────────────────┘
```

#### Pattern 2: Bottom Sheet Actions
**Use**: All contextual actions, AI assistant

Replace top/center modals with bottom sheets for thumb accessibility

```
DESKTOP (Center Modal):
     ┌───────────────┐
     │   Dialog      │
     │   Content     │
     │   [Actions]   │
     └───────────────┘

MOBILE (Bottom Sheet):
┌─────────────────────────┐
│                         │
│    Main Content         │
│                         │
│    ╭───────────────╮   │
│    │ ⌄ Dialog      │   │
│    │   Content     │   │
│    │   [Actions]   │   │
└────┴───────────────┴───┘
```

#### Pattern 3: Stepped Forms
**Use**: Board Packs, Decisions, Complex Creates

Desktop: All fields in modal
Mobile: Multi-step wizard

```
MOBILE STEPPED FORM (Board Pack Create):

Step 1/3: Basic Info
┌─────────────────────────┐
│ Title                   │
│ [________________]      │
│                         │
│ Meeting Date            │
│ [________________]      │
│                         │
│           [Next →]      │
└─────────────────────────┘

Step 2/3: Agenda Items
┌─────────────────────────┐
│ Agenda Items (2)        │
│                         │
│ • Opening remarks       │
│ • Financial review      │
│                         │
│ [+ Add item]            │
│                         │
│ [← Back]    [Next →]   │
└─────────────────────────┘

Step 3/3: Attendees
┌─────────────────────────┐
│ Attendees (3)           │
│                         │
│ • John Smith            │
│ • Jane Doe              │
│ • Bob Johnson           │
│                         │
│ [+ Add attendee]        │
│                         │
│ [← Back]    [Create]   │
└─────────────────────────┘
```

#### Pattern 4: Progressive Content
**Use**: Decisions, Documents with dense content

Desktop: Show all fields
Mobile: Expandable sections

```
MOBILE DECISION CARD (Collapsed):
┌─────────────────────────┐
│ Hire VP Engineering    │
│ Status: Pending        │
│ 2/5 approvals          │
│                         │
│ Context ▸              │
│ Decision ▸             │
│ Rationale ▸            │
│                         │
│ [Tap to expand]        │
└─────────────────────────┘

MOBILE DECISION CARD (Expanded):
┌─────────────────────────┐
│ ← Hire VP Engineering  │
├─────────────────────────┤
│ Context ▾              │
│ We need technical      │
│ leadership for...      │
│                         │
│ Decision ▾             │
│ Hire Jane Doe as VP... │
│                         │
│ Rationale ▾            │
│ Strong background in...│
│                         │
│ [Manage Approvals]     │
└─────────────────────────┘
```

#### Pattern 5: Data Table Transformation
**Use**: Member lists, version history, logs

Desktop: Full table
Mobile: Card stack with key info

```
DESKTOP TABLE:
Name          | Role   | Status  | Actions
-------------------------------------------
John Smith    | Admin  | Active  | [•••]
Jane Doe      | Editor | Active  | [•••]

MOBILE CARD STACK:
┌─────────────────────────┐
│ John Smith             │
│ Admin • Active         │
│                  [•••] │
└─────────────────────────┘
┌─────────────────────────┐
│ Jane Doe               │
│ Editor • Active        │
│                  [•••] │
└─────────────────────────┘
```

---

## Technical Implementation

### Breakpoint Strategy

```css
/* Mobile-first breakpoints */
sm:   640px   /* Large phones (landscape) */
md:   768px   /* Tablets (portrait) */
lg:   1024px  /* Tablets (landscape) / Small laptops */
xl:   1280px  /* Desktops */
2xl:  1536px  /* Large desktops */

/* Usage pattern */
.element {
  /* Mobile default (< 640px) */
  padding: 1rem;

  /* Tablet up */
  @screen md {
    padding: 2rem;
  }

  /* Desktop up */
  @screen lg {
    padding: 3rem;
  }
}
```

### Component Patterns

#### Responsive Dialog/Modal

```tsx
// Before (Desktop-only):
<DialogContent className="max-w-3xl">
  <DialogHeader>...</DialogHeader>
  <div className="space-y-4">...</div>
  <DialogFooter>...</DialogFooter>
</DialogContent>

// After (Mobile-optimized):
<DialogContent className="sm:max-w-full md:max-w-3xl sm:rounded-none md:rounded-lg max-h-[95vh] sm:max-h-[100vh] flex flex-col">
  <DialogHeader className="px-4 sm:px-6">...</DialogHeader>
  <div className="space-y-4 overflow-y-auto flex-1 px-4 sm:px-6">...</div>
  <DialogFooter className="px-4 sm:px-6 mt-4">...</DialogFooter>
</DialogContent>
```

#### Responsive Form Grid

```tsx
// Before:
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label>Priority</Label>
    <Select>...</Select>
  </div>
  <div>
    <Label>Due Date</Label>
    <Input type="date" />
  </div>
</div>

// After:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <Label>Priority</Label>
    <Select>...</Select>
  </div>
  <div>
    <Label>Due Date</Label>
    <Input type="date" className="text-base" /> {/* 16px min */}
  </div>
</div>
```

#### Touch Target Sizing

```tsx
// Before (too small):
<Button size="icon" variant="ghost">
  <Pencil className="h-4 w-4" />
</Button>

// After (44x44px minimum):
<Button
  size="icon"
  variant="ghost"
  className="h-11 w-11 md:h-9 md:w-9" // 44px mobile, 36px desktop
>
  <Pencil className="h-5 w-5 md:h-4 md:w-4" />
</Button>
```

#### Responsive Textarea

```tsx
// Before:
<Textarea rows={6} />

// After:
<Textarea
  rows={3}
  className="md:min-h-[150px] text-base" // 3 rows mobile, taller desktop
/>
```

### Mobile Navigation Patterns

#### Bottom Navigation (New Component)

```tsx
// components/mobile-bottom-nav.tsx
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="grid grid-cols-4 h-16">
        <NavItem
          href="/dashboard"
          icon={Home}
          label="Home"
          active={pathname === '/dashboard'}
        />
        <NavItem
          href="/metrics"
          icon={TrendingUp}
          label="Metrics"
          active={pathname.startsWith('/metrics')}
        />
        <NavItem
          href="/finance"
          icon={DollarSign}
          label="Finance"
          active={pathname.startsWith('/finance')}
        />
        <NavItem
          icon={Menu}
          label="More"
          onClick={() => setShowMenuSheet(true)}
        />
      </div>
    </nav>
  );
}
```

#### Hamburger Menu Sheet (For "More" Navigation)

```tsx
// components/mobile-menu-sheet.tsx
export function MobileMenuSheet({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>All Modules</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 mt-4">
          <MenuLink href="/reports" icon={FileText}>Reports</MenuLink>
          <MenuLink href="/packs" icon={Package}>Board Packs</MenuLink>
          <MenuLink href="/requests" icon={MessageSquare}>Requests</MenuLink>
          <MenuLink href="/documents" icon={FileText}>Documents</MenuLink>
          <MenuLink href="/decisions" icon={Scale}>Decisions</MenuLink>
          <MenuLink href="/members" icon={Users}>Members</MenuLink>
          <MenuLink href="/secrets" icon={Lock}>Secrets</MenuLink>
          <MenuLink href="/profile" icon={Building}>Vault Profile</MenuLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### AI Assistant Mobile Pattern

```tsx
// Before: 384px right panel overlay
<aside className="fixed right-0 top-0 h-full w-96 bg-background border-l">
  {/* AI content */}
</aside>

// After: Bottom sheet on mobile, side panel on desktop
<Sheet open={showAI} onOpenChange={setShowAI}>
  <SheetContent
    side="bottom"
    className="h-[85vh] md:hidden"
  >
    <SheetHeader>
      <SheetTitle>AI Assistant</SheetTitle>
    </SheetHeader>
    {/* AI content */}
  </SheetContent>
</Sheet>

{/* Desktop side panel */}
<aside className="hidden md:block fixed right-0 top-0 h-full w-96">
  {/* AI content */}
</aside>
```

---

## Module-Specific Implementation Plans

### Priority 1 Modules (Week 1-2)

#### 1. Reports Module (1.5/5 → 4/5)

**Changes**:
1. **Mobile Card (Summary View)**
   - Show: Title, status badge, period, due date only
   - Hide: Task count, risk count, approval details
   - Tap → Full-screen detail view

2. **Mobile Detail View**
   - Full-screen overlay with back button
   - Expandable sections: Tasks, Risks, Approvals
   - Bottom action bar: [Approve] [Reject] buttons

3. **Filter Tabs**
   - Horizontal scroll on mobile (instead of wrap)
   - Sticky scroll indicator

4. **Approval Workflow**
   - Desktop: Dropdown menu
   - Mobile: Bottom sheet with [Approve] [Reject] [View Details]

**Code Changes**:
```tsx
// reports/page.tsx - Mobile card
<Card className="cursor-pointer md:cursor-default" onClick={handleMobileView}>
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <CardTitle className="line-clamp-2">{report.title}</CardTitle>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge>{report.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {report.period}
          </span>
        </div>
      </div>
      {/* Desktop: Show stats inline */}
      <div className="hidden md:flex flex-col gap-1 ml-4">
        <span className="text-sm">12 Tasks</span>
        <span className="text-sm">3 Risks</span>
      </div>
    </div>
  </CardHeader>
  {/* Desktop: Show actions */}
  <CardFooter className="hidden md:flex">
    <DropdownMenu>...</DropdownMenu>
  </CardFooter>
</Card>

{/* Mobile: Full-screen detail sheet */}
<Sheet open={mobileDetailId === report.id} onOpenChange={...}>
  <SheetContent side="bottom" className="h-[95vh]">
    <SheetHeader>
      <SheetTitle>{report.title}</SheetTitle>
      <div className="flex items-center gap-2">
        <Badge>{report.status}</Badge>
        <span className="text-sm">{report.period}</span>
      </div>
    </SheetHeader>

    <div className="overflow-y-auto flex-1 mt-4 space-y-4">
      <Collapsible>
        <CollapsibleTrigger>Tasks (12)</CollapsibleTrigger>
        <CollapsibleContent>{/* Task details */}</CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger>Risks (3)</CollapsibleTrigger>
        <CollapsibleContent>{/* Risk details */}</CollapsibleContent>
      </Collapsible>
    </div>

    {report.status === 'pending_approval' && (
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button className="flex-1" onClick={handleApprove}>Approve</Button>
        <Button variant="outline" className="flex-1" onClick={handleReject}>
          Reject
        </Button>
      </div>
    )}
  </SheetContent>
</Sheet>
```

#### 2. Board Packs Module (1/5 → 4/5)

**Changes**:
1. **Mobile: Multi-step wizard** (instead of nested form-in-modal)
   - Step 1: Title + Meeting Date
   - Step 2: Add Agenda Items (one at a time)
   - Step 3: Add Attendees (one at a time)
   - Step 4: Review + Create

2. **Mobile Card**: Summary only (title, date, item count)

3. **Desktop**: Keep existing form-in-modal

**Code Changes**:
```tsx
// packs/page.tsx - Mobile wizard component
function MobilePackWizard({ open, onOpenChange, mode, pack }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: pack?.title || '',
    meetingDate: pack?.meeting_date || '',
    agendaItems: pack?.agenda_items || [],
    attendees: pack?.attendees || [],
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Create Board Pack' : 'Edit Board Pack'}
          </SheetTitle>
          <div className="text-sm text-muted-foreground">
            Step {step} of 4
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && <StepBasicInfo data={formData} onChange={setFormData} />}
          {step === 2 && <StepAgendaItems data={formData} onChange={setFormData} />}
          {step === 3 && <StepAttendees data={formData} onChange={setFormData} />}
          {step === 4 && <StepReview data={formData} />}
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} className="flex-1">
              {mode === 'create' ? 'Create Pack' : 'Save Changes'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Use responsive rendering
const isMobile = useMediaQuery('(max-width: 768px)');

return (
  <>
    {isMobile ? (
      <MobilePackWizard {...props} />
    ) : (
      <Dialog>
        {/* Existing desktop form-in-modal */}
      </Dialog>
    )}
  </>
);
```

#### 3. Decisions Module (1/5 → 4/5)

**Changes**:
1. **Mobile Card**: Collapsed by default
   - Show: Title, status, approval count
   - Tap → Expand to full-screen detail

2. **Mobile Detail View**: Progressive disclosure
   - Collapsible sections: Context, Decision, Rationale, Alternatives
   - Inline approval status (not separate dialog)

3. **Create/Edit Form**: Multi-step wizard on mobile
   - Step 1: Title
   - Step 2: Context
   - Step 3: Decision
   - Step 4: Rationale
   - Step 5: Alternatives (optional)
   - Step 6: Review

**Code Changes**:
```tsx
// decisions/page.tsx - Mobile card
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
      <CardTitle className="line-clamp-2">{decision.title}</CardTitle>
      <div className="flex gap-1 ml-2">
        <Badge>{decision.status}</Badge>
        <Badge variant="outline">{approvalCount}/5</Badge>
      </div>
    </div>
  </CardHeader>

  {/* Desktop: Show all content */}
  <CardContent className="hidden md:block">
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold mb-1">Context</h4>
        <p className="text-sm">{decision.context}</p>
      </div>
      {/* ... more fields ... */}
    </div>
  </CardContent>

  {/* Mobile: Expand button */}
  <CardFooter className="md:hidden">
    <Button
      variant="ghost"
      className="w-full"
      onClick={() => setExpandedId(decision.id)}
    >
      View Details
    </Button>
  </CardFooter>
</Card>

{/* Mobile: Full detail sheet */}
<Sheet open={expandedId === decision.id} onOpenChange={...}>
  <SheetContent side="bottom" className="h-[95vh]">
    <SheetHeader>
      <SheetTitle>{decision.title}</SheetTitle>
    </SheetHeader>

    <div className="space-y-4 overflow-y-auto flex-1 mt-4">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <h4 className="font-semibold">Context</h4>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="text-sm mt-2">{decision.context}</p>
        </CollapsibleContent>
      </Collapsible>

      {/* Repeat for Decision, Rationale, Alternatives */}

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-2">Approvals ({approvalCount}/5)</h4>
        <div className="space-y-2">
          {approvals.map(approval => (
            <div key={approval.id} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{approval.approver_name}</span>
              <Badge>{approval.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>

    {canApprove && (
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button className="flex-1">Manage Approvals</Button>
      </div>
    )}
  </SheetContent>
</Sheet>
```

#### 4. Documents Module (2/5 → 4/5)

**Changes**:
1. **Upload Dialog**: Keep as-is (already mobile-friendly)

2. **Sections Management**: Mobile redesign
   - Desktop: Large modal with all sections listed
   - Mobile: Full-screen view with one section at a time

3. **Q&A Flow**: Flatten nested dialogs
   - Desktop: Nested dialogs (Sections → Manage Q&A → Answer)
   - Mobile: Inline Q&A within section detail view

**Code Changes**:
```tsx
// documents/page.tsx - Mobile sections view
<Sheet open={managingSections} onOpenChange={...}>
  <SheetContent side="bottom" className="h-[95vh] md:hidden">
    <SheetHeader>
      <SheetTitle>Sections: {document.name}</SheetTitle>
    </SheetHeader>

    {/* Mobile: Show one section at a time */}
    {!editingSectionId && !viewingQA && (
      <div className="space-y-2 overflow-y-auto flex-1 mt-4">
        {sections.map(section => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardFooter className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewingQA(section.id)}
              >
                Q&A ({section.questions_answers?.length || 0})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingSectionId(section.id)}
              >
                Edit
              </Button>
            </CardFooter>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setEditingSectionId('new')}
        >
          Add Section
        </Button>
      </div>
    )}

    {/* Editing section */}
    {editingSectionId && (
      <div className="space-y-4 overflow-y-auto flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingSectionId(null)}
        >
          ← Back to Sections
        </Button>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={sectionTitle} onChange={...} className="text-base" />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              value={sectionContent}
              onChange={...}
              rows={8}
              className="text-base"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSaveSection} className="flex-1">
            Save Section
          </Button>
        </div>
      </div>
    )}

    {/* Viewing Q&A */}
    {viewingQA && (
      <div className="space-y-4 overflow-y-auto flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewingQA(null)}
        >
          ← Back to Sections
        </Button>

        <h3 className="font-semibold">
          Q&A for {sections.find(s => s.id === viewingQA)?.title}
        </h3>

        <div className="space-y-3">
          {questions.map(q => (
            <Card key={q.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Q: {q.question}
                </CardTitle>
              </CardHeader>
              {q.answer ? (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    A: {q.answer}
                  </p>
                </CardContent>
              ) : (
                <CardFooter className="pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAnsweringQuestion(q.id)}
                  >
                    Answer
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Add Question</Label>
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={...}
              placeholder="Enter question..."
              className="text-base"
            />
            <Button onClick={handleAddQuestion}>Add</Button>
          </div>
        </div>
      </div>
    )}
  </SheetContent>
</Sheet>
```

#### 5. Secrets Module (2/5 → 4/5)

**Changes**:
1. **View Modal**: Full-screen on mobile
   - Responsive watermark rendering
   - Tab navigation optimized for touch

2. **NDA Dialog**: Mobile-optimized text sizing

3. **Seal Flow**: Combine dialogs
   - Desktop: Confirm → Certificate (2 dialogs)
   - Mobile: Single combined flow with steps

**Code Changes**:
```tsx
// secrets/page.tsx - Mobile view dialog
<Dialog open={viewingSecret} onOpenChange={...}>
  <DialogContent className="sm:max-w-full md:max-w-5xl sm:h-screen md:h-auto max-h-[95vh] flex flex-col p-0">
    <DialogHeader className="px-4 sm:px-6 pt-4">
      <DialogTitle>{secret.title}</DialogTitle>
    </DialogHeader>

    <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
      <TabsList className="mx-4 sm:mx-6 grid w-auto grid-cols-2">
        <TabsTrigger value="content" className="text-sm">Content</TabsTrigger>
        <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="flex-1 overflow-y-auto px-4 sm:px-6 mt-4">
        {secret.status === 'sealed' ? (
          <div className="relative">
            {/* Responsive watermark - scale based on viewport */}
            <div
              className="watermark text-xs sm:text-sm md:text-base"
              style={{
                fontSize: 'clamp(10px, 2vw, 14px)',
              }}
            >
              {secret.content}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">{secret.description}</p>
            <Button onClick={handleSeal} className="w-full sm:w-auto">
              Seal Secret
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="history" className="flex-1 overflow-y-auto px-4 sm:px-6 mt-4">
        <div className="space-y-2">
          {versions.map(version => (
            <Card key={version.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {format(new Date(version.created_at), 'MMM d, yyyy')}
                  </span>
                  <Badge variant="outline">{version.action}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">
                {version.actor_email}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>

    <DialogFooter className="px-4 sm:px-6 pb-4 flex-row gap-2">
      <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-initial">
        Close
      </Button>
      <Button onClick={handleDownload} className="flex-1 sm:flex-initial">
        Download Evidence
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 6. Dashboard (Portfolio View)

**Changes**:
1. **Charts**: Responsive sizing
   - Desktop: Full-width charts
   - Mobile: Simplified charts with key metrics only

2. **Cross-Vault Selector**: Bottom sheet on mobile

3. **Metric Cards**: Summary → Detail pattern

**Code Changes**:
```tsx
// page.tsx - Mobile dashboard
<div className="space-y-4 sm:space-y-6">
  {/* Vault selector */}
  <div className="hidden md:block">
    <MultiSelect options={vaults} value={selectedVaults} onChange={...} />
  </div>

  <div className="md:hidden">
    <Button
      variant="outline"
      className="w-full justify-between"
      onClick={() => setShowVaultSelector(true)}
    >
      <span>{selectedVaults.length} vaults selected</span>
      <ChevronDown className="h-4 w-4" />
    </Button>
  </div>

  {/* Metric cards - responsive grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {metrics.map(metric => (
      <Card key={metric.id}>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{metric.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl sm:text-3xl font-bold">{metric.value}</div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
            {metric.change > 0 ? '+' : ''}{metric.change}%
          </div>
        </CardContent>
      </Card>
    ))}
  </div>

  {/* Charts - responsive */}
  <Card>
    <CardHeader>
      <CardTitle className="text-base sm:text-lg">Trends</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={250}>
        {/* Chart component */}
      </ResponsiveContainer>
    </CardContent>
  </Card>
</div>

{/* Mobile vault selector sheet */}
<Sheet open={showVaultSelector} onOpenChange={setShowVaultSelector}>
  <SheetContent side="bottom" className="h-[70vh]">
    <SheetHeader>
      <SheetTitle>Select Vaults</SheetTitle>
    </SheetHeader>
    <div className="space-y-2 mt-4 overflow-y-auto flex-1">
      {vaults.map(vault => (
        <label key={vault.id} className="flex items-center gap-2 p-3 rounded hover:bg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={selectedVaults.includes(vault.id)}
            onChange={...}
            className="h-5 w-5"
          />
          <span>{vault.name}</span>
        </label>
      ))}
    </div>
    <div className="pt-4 border-t mt-4">
      <Button
        onClick={() => setShowVaultSelector(false)}
        className="w-full"
      >
        Apply Selection
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

### Priority 2 Modules (Week 2-3)

#### Metrics, Finance, Requests (2.5/5 → 4/5)

**Common Pattern**: All use card grids that collapse well, just need:
1. Touch target sizing (44x44px buttons)
2. Form grid responsiveness (1 column on mobile)
3. Textarea responsive rows
4. Input font size (16px minimum)

**Shared Code Pattern**:
```tsx
// Common responsive form pattern for all P2 modules
<div className="space-y-4">
  <div>
    <Label>Title</Label>
    <Input className="text-base" /> {/* 16px prevents zoom */}
  </div>

  {/* 2-column grid that collapses */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Field 1</Label>
      <Input className="text-base" />
    </div>
    <div>
      <Label>Field 2</Label>
      <Input className="text-base" />
    </div>
  </div>

  <div>
    <Label>Description</Label>
    <Textarea
      rows={3}
      className="md:min-h-[150px] text-base resize-none"
    />
  </div>
</div>
```

#### Members Module (TBD → 4/5)

**Anticipated Changes**:
1. Member list → Card stack on mobile (not table)
2. Invite dialog → Mobile-optimized form
3. Role/permission assignment → Bottom sheet selector

**Pattern**:
```tsx
// Desktop: Table
<Table>
  <TableRow>
    <TableCell>{member.name}</TableCell>
    <TableCell>{member.role}</TableCell>
    <TableCell><DropdownMenu>...</DropdownMenu></TableCell>
  </TableRow>
</Table>

// Mobile: Card stack
<div className="space-y-2 md:hidden">
  {members.map(member => (
    <Card key={member.id}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{member.name}</CardTitle>
        <CardDescription className="text-sm">{member.email}</CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between pt-2">
        <Badge>{member.role}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-11 w-11">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Change Role</DropdownMenuItem>
            <DropdownMenuItem>Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  ))}
</div>
```

### Priority 3 Modules (Week 3-4)

#### Profile (3/5 → 4.5/5)

**Minimal Changes Needed**:
1. Ensure dialog fits mobile viewport
2. Touch target sizing for edit button

```tsx
// profile/page.tsx
<Button
  onClick={() => setIsEditDialogOpen(true)}
  className="h-11 md:h-10" // Slightly larger on mobile
>
  Edit Profile
</Button>

<DialogContent className="sm:max-w-full md:max-w-2xl max-h-[90vh]">
  {/* Already mostly mobile-friendly */}
</DialogContent>
```

---

## Layout & Navigation Changes

### Main Layout (app/(dashboard)/layout.tsx)

```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Desktop: Left sidebar */}
      <aside className="hidden md:flex md:w-16 md:flex-col border-r">
        {/* Icon navigation */}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 md:px-6">
          {/* Mobile: Hamburger + Logo + AI */}
          <div className="flex md:hidden items-center justify-between w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="text-lg font-semibold">VAULTS</div>

            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setShowAI(true)}
            >
              <Bot className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop: Logo + Controls */}
          <div className="hidden md:flex items-center justify-between w-full">
            <div className="text-xl font-bold">VAULTS</div>
            <div className="flex items-center gap-2">
              <OrganizationSwitcher />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAI(!showAI)}
              >
                <Bot className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Desktop: Right AI panel */}
      <aside className="hidden md:block w-96 border-l">
        <AIAssistant />
      </aside>

      {/* Mobile: Bottom navigation */}
      <MobileBottomNav />

      {/* Mobile: AI bottom sheet */}
      <Sheet open={showAI} onOpenChange={setShowAI}>
        <SheetContent side="bottom" className="h-[85vh] md:hidden">
          <AIAssistant />
        </SheetContent>
      </Sheet>

      {/* Mobile: Menu bottom sheet */}
      <MobileMenuSheet open={showMobileMenu} onOpenChange={setShowMobileMenu} />
    </div>
  );
}
```

### Bottom Navigation Component

```tsx
// components/mobile-bottom-nav.tsx
const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/metrics', icon: TrendingUp, label: 'Metrics' },
  { href: '/finance', icon: DollarSign, label: 'Finance' },
  { key: 'more', icon: Menu, label: 'More' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden safe-area-inset-bottom">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(item => (
            item.href ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center h-16 gap-1 text-xs",
                  pathname.startsWith(item.href)
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.key}
                onClick={() => setShowMore(true)}
                className="flex flex-col items-center justify-center h-16 gap-1 text-xs text-muted-foreground"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          ))}
        </div>
      </nav>

      <MobileMenuSheet open={showMore} onOpenChange={setShowMore} />
    </>
  );
}
```

---

## Utility Components & Hooks

### useMediaQuery Hook

```tsx
// hooks/use-media-query.ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Usage:
const isMobile = useMediaQuery('(max-width: 768px)');
```

### ResponsiveDialog Component

```tsx
// components/ui/responsive-dialog.tsx
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function ResponsiveDialog({
  children,
  open,
  onOpenChange,
  className,
  ...props
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn("h-[90vh]", className)}
          {...props}
        >
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} {...props}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// Usage:
<ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogHeader>
    <DialogTitle>Title</DialogTitle>
  </DialogHeader>
  <div className="space-y-4">
    {/* Content */}
  </div>
  <DialogFooter>
    {/* Actions */}
  </DialogFooter>
</ResponsiveDialog>
```

### TouchTarget Component

```tsx
// components/ui/touch-target.tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TouchTarget({
  children,
  className,
  ...props
}) {
  return (
    <Button
      className={cn(
        "h-11 w-11 md:h-9 md:w-9", // 44px mobile, 36px desktop
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
```

---

## Testing Strategy

### Mobile Testing Checklist

#### Device Testing Matrix

| Device | Viewport | OS | Priority |
|--------|----------|-----|----------|
| iPhone SE | 375x667 | iOS 17 | P1 (smallest) |
| iPhone 14 Pro | 393x852 | iOS 17 | P1 (common) |
| Samsung Galaxy S21 | 360x800 | Android 13 | P2 |
| iPad Mini | 768x1024 | iOS 17 | P2 (tablet) |
| iPad Pro 11" | 834x1194 | iOS 17 | P3 |

#### Test Scenarios by Module

**Reports Module**:
- [ ] Card summary displays correctly at 375px width
- [ ] Filter tabs scroll horizontally without wrapping
- [ ] Full-screen detail view opens and scrolls
- [ ] Approve/Reject buttons are 44x44px and thumb-accessible
- [ ] Collapsible sections expand/collapse smoothly

**Board Packs Module**:
- [ ] Multi-step wizard advances through all 4 steps
- [ ] Agenda item add/remove works on touch
- [ ] Attendee selection is touch-friendly
- [ ] Back button navigation works correctly
- [ ] Review step shows all entered data

**Decisions Module**:
- [ ] Collapsed card shows title + badges only
- [ ] Expand to full-screen detail works
- [ ] Collapsible sections (Context, Decision, etc.) work
- [ ] Approval status displays inline
- [ ] Create wizard progresses through all steps

**Documents Module**:
- [ ] Upload dialog fits viewport
- [ ] Sections list displays as cards
- [ ] Section edit view works in full-screen
- [ ] Q&A inline interface functional
- [ ] Back navigation breadcrumb clear

**Secrets Module**:
- [ ] View dialog full-screen on mobile
- [ ] Watermark rendering legible at small size
- [ ] Tab navigation (Content/History) touch-friendly
- [ ] NDA text readable
- [ ] Download button accessible

**Dashboard**:
- [ ] Vault selector bottom sheet opens
- [ ] Metric cards display in 1 column
- [ ] Charts resize responsively
- [ ] Cross-vault selection works

**Navigation**:
- [ ] Bottom nav visible and accessible
- [ ] More menu sheet opens with all modules
- [ ] Mobile menu sheet opens from hamburger
- [ ] AI assistant bottom sheet opens
- [ ] All touch targets minimum 44x44px

#### Performance Testing

- [ ] First Contentful Paint < 1.5s on 4G
- [ ] Time to Interactive < 3s on 4G
- [ ] Lighthouse Mobile Score > 90
- [ ] No layout shift (CLS < 0.1)
- [ ] Touch response < 100ms

#### Accessibility Testing

- [ ] Keyboard navigation works on all interactive elements
- [ ] Screen reader announces all changes
- [ ] Focus indicators visible on all elements
- [ ] Color contrast meets WCAG 2.2 AA
- [ ] Form labels properly associated
- [ ] Error messages accessible

---

## Phased Rollout Plan

### Phase 1: Foundation (Week 1)
**Goal**: Fix critical blockers affecting all modules

**Tasks**:
1. Create utility components (ResponsiveDialog, TouchTarget, useMediaQuery)
2. Update layout.tsx with mobile navigation structure
3. Implement MobileBottomNav component
4. Implement MobileMenuSheet component
5. Fix AI assistant (bottom sheet on mobile)
6. Update all icon buttons to 44x44px minimum
7. Update all form grids to responsive (grid-cols-1 md:grid-cols-2)
8. Update all textareas to responsive rows
9. Update all inputs to 16px font size

**Success Criteria**:
- [ ] All touch targets minimum 44x44px
- [ ] Bottom navigation visible on mobile
- [ ] AI assistant accessible via bottom sheet
- [ ] All forms collapse to single column on mobile
- [ ] No horizontal scrolling

**Testing**: Manual smoke test on iPhone SE (375px)

### Phase 2: Priority 1 Modules (Week 2)
**Goal**: Refactor complex workflows for mobile

**Tasks**:
1. Reports: Summary + Detail view pattern
2. Board Packs: Multi-step wizard
3. Decisions: Progressive disclosure + wizard
4. Documents: Flatten Q&A, mobile sections view
5. Secrets: Full-screen viewer, responsive watermark
6. Dashboard: Responsive charts, vault selector sheet

**Success Criteria**:
- [ ] All P1 modules rated 4/5 or higher for mobile
- [ ] No nested dialogs > 2 levels deep
- [ ] All workflows completable on 375px viewport
- [ ] Touch-friendly interactions throughout

**Testing**: Full functional test on iPhone 14 Pro + iPad Mini

### Phase 3: Priority 2 Modules (Week 3)
**Goal**: Polish remaining modules

**Tasks**:
1. Metrics: Responsive forms, touch targets
2. Finance: Responsive forms, touch targets
3. Requests: Responsive forms, dropdowns
4. Members: Card stack view, mobile-friendly actions

**Success Criteria**:
- [ ] All P2 modules rated 4/5 or higher
- [ ] Consistent patterns across all modules
- [ ] Performance metrics met (Lighthouse > 90)

**Testing**: Cross-browser testing (Safari iOS, Chrome Android)

### Phase 4: Polish & Optimization (Week 4)
**Goal**: Final refinements and production readiness

**Tasks**:
1. Profile: Minor touch-ups
2. End-to-end testing on real devices
3. Performance optimization (code splitting, lazy loading)
4. Accessibility audit (WCAG 2.2 AA compliance)
5. User acceptance testing
6. Documentation updates

**Success Criteria**:
- [ ] All modules rated 4+/5 for mobile
- [ ] Zero critical accessibility issues
- [ ] Lighthouse Mobile Score > 90
- [ ] UAT feedback incorporated
- [ ] Documentation complete

**Testing**: Production smoke test on all target devices

---

## Success Metrics

### Quantitative Goals

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Mobile Suitability (avg) | 2/5 | 4.5/5 | Manual rating |
| Lighthouse Mobile Score | Unknown | >90 | Lighthouse CI |
| Touch Target Compliance | ~40% | 100% | Automated audit |
| Mobile Task Completion | Unknown | >95% | User testing |
| Mobile Session Length | Unknown | Baseline | Analytics |
| Mobile Bounce Rate | Unknown | <30% | Analytics |

### Qualitative Goals

- Users report "easy to use on mobile"
- No user complaints about touch targets being too small
- Workflows feel natural on touch devices
- Visual hierarchy clear on small screens
- Professional appearance maintained

---

## Technical Debt & Future Enhancements

### Technical Debt Created
- Duplicate code: Mobile wizard vs desktop forms (Board Packs, Decisions)
- Conditional rendering: `isMobile ? <Mobile> : <Desktop>` patterns
- Component complexity: Some components have both mobile/desktop logic

### Mitigation Strategy
- Extract shared logic into hooks
- Use composition over duplication where possible
- Document mobile-specific patterns clearly
- Consider refactoring to single adaptive component in future

### Future Enhancements (Post-Launch)

**Phase 5: Advanced Mobile Features** (Future)
- [ ] Touch gestures (swipe to delete, pull to refresh)
- [ ] Offline mode (service worker caching)
- [ ] Push notifications
- [ ] Biometric authentication (Face ID, Touch ID)
- [ ] Camera integration (document scanning)
- [ ] Native-like transitions (page animations)

**Phase 6: Performance** (Future)
- [ ] Code splitting by route
- [ ] Lazy loading images
- [ ] Virtual scrolling for long lists
- [ ] Optimistic UI updates
- [ ] Request batching

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review plan with stakeholders
- [ ] Confirm target devices/viewports
- [ ] Set up mobile testing infrastructure
- [ ] Create feature branch: `feature/mobile-optimization`

### During Implementation
- [ ] Follow phased approach (don't mix phases)
- [ ] Test on real devices weekly
- [ ] Update PROGRESS.md after each module
- [ ] Run accessibility checks continuously
- [ ] Monitor bundle size

### Pre-Deployment
- [ ] Complete all 4 phases
- [ ] Pass all device tests
- [ ] Lighthouse Mobile Score >90
- [ ] Zero critical accessibility issues
- [ ] User acceptance testing complete
- [ ] Update documentation (README, DEPLOYMENT.md)

### Post-Deployment
- [ ] Monitor analytics (mobile bounce rate, session length)
- [ ] Collect user feedback
- [ ] Hotfix critical issues within 24h
- [ ] Plan Phase 5 enhancements

---

## Appendix

### A. Tailwind Responsive Utilities Reference

```css
/* Breakpoints */
sm:   min-width: 640px   /* Large phones (landscape) */
md:   min-width: 768px   /* Tablets */
lg:   min-width: 1024px  /* Laptops */
xl:   min-width: 1280px  /* Desktops */
2xl:  min-width: 1536px  /* Large desktops */

/* Common patterns */
.hidden md:block          /* Hide on mobile, show on tablet+ */
.block md:hidden          /* Show on mobile, hide on tablet+ */
.grid-cols-1 md:grid-cols-2  /* 1 col mobile, 2 col tablet+ */
.text-sm md:text-base     /* Smaller text on mobile */
.p-4 md:p-6               /* Less padding on mobile */
.h-11 md:h-9              /* Larger touch targets on mobile */
```

### B. Touch Target Sizes Reference

| Element | Desktop | Mobile | Rationale |
|---------|---------|--------|-----------|
| Primary Button | 36x36px | 44x44px | Apple/Google guidelines |
| Icon Button | 32x32px | 44x44px | Minimum touch target |
| Checkbox/Radio | 16x16px | 20x20px (24x24 target) | Input + padding |
| Link | N/A | 44px height | Vertical target |
| Tab | 40x32px | 44x44px | Touch-friendly tabs |

### C. Font Size Guidelines

| Element | Desktop | Mobile | Purpose |
|---------|---------|--------|---------|
| Body Text | 14-16px | 16px | Readability |
| Input Fields | 14-16px | 16px | Prevent zoom |
| Headings H1 | 32-36px | 24-28px | Hierarchy |
| Headings H2 | 24-28px | 20-24px | Hierarchy |
| Small Text | 12-13px | 14px | Avoid <14px |

### D. Modal/Dialog Sizing

| Size Class | Desktop | Mobile |
|------------|---------|--------|
| max-w-sm | 384px | 100% - 32px |
| max-w-md | 448px | 100% - 32px |
| max-w-lg | 512px | 100% - 32px |
| max-w-xl | 576px | 100% - 32px |
| max-w-2xl | 672px | 100% - 32px |
| max-w-3xl+ | 768px+ | 100% (full screen) |

### E. Resources

**Design Systems**:
- [Material Design 3](https://m3.material.io/) - Mobile patterns
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) - iOS best practices
- [Radix UI](https://www.radix-ui.com/) - Accessible components

**Testing Tools**:
- [BrowserStack](https://www.browserstack.com/) - Real device testing
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/) - Emulation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance audit
- [axe DevTools](https://www.deque.com/axe/devtools/) - Accessibility testing

**Documentation**:
- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [WebAIM: Mobile Accessibility](https://webaim.org/articles/mobile/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-19 | Claude Code | Initial mobile optimization plan |

---

**End of Mobile Optimization Plan**
