# Finance Module Enhancement - AI Document Analysis & Dashboard

**Last Updated:** 2025-10-19  
**Status:** Planning Complete - Ready for Implementation  
**Owner:** Engineering  

---

## Table of Contents

1. [Strategic Recommendations](#strategic-recommendations)
2. [Workflow Design](#workflow-design)
3. [Tech Stack](#tech-stack-recommendations)
4. [Database Schema](#database-schema)
5. [Implementation Plan](#implementation-plan)
6. [AI Prompt Strategy](#ai-prompt-strategy)
7. [File Structure](#file-structure)
8. [Railway Deployment](#railway-deployment-notes)
9. [Costs & Metrics](#estimated-costs)
10. [Security](#security-considerations)

---

## Strategic Recommendations

### Architecture Approach: Hybrid Model (Auto-populate + Manual Override)

**Recommended:** Option 1c - Support BOTH upload-based analysis AND manual entry

**Rationale:**

- Maintains flexibility for users who prefer manual control
- Enables quick data entry via document upload
- Manual entry serves as fallback when AI misinterprets data
- Users can review/approve AI-extracted data before committing

### Data Flow Levels

**Level 1: Basic Extraction (Phase 1) ← START HERE**

Extract the 6 existing metrics:

- ARR (Annual Recurring Revenue)
- Revenue (Monthly)
- Gross Margin (%)
- Cash Balance
- Monthly Burn Rate
- Runway (auto-calculated)

**Level 2: Advanced Analytics (Phase 2)**

- Month-over-month variance analysis
- Trend detection (improving/declining metrics)
- Cash flow projections (3-6 months)
- Burn rate optimization suggestions
- Key financial ratios (quick ratio, current ratio)

**Level 3: Comprehensive Insights (Phase 3)**

- Anomaly detection (unusual patterns)
- Scenario modeling (best/worst case)
- Industry benchmarking suggestions
- Executive summary generation
- Investor-ready metrics dashboard

**Recommendation:** Start with Level 1, design schema to support Level 2+3

---

## Workflow Design

```
┌─────────────────┐
│  User Uploads   │
│  XLS/CSV/PDF    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Supabase Storage       │
│  finance/{org_id}/...   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Next.js API Route:             │
│  /api/finance/analyze-document  │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  FastAPI Backend (Railway):      │
│  /analyze-financial-document     │
│  - Parse file (pandas/openpyxl)  │
│  - Call OpenAI GPT-4-turbo       │
│  - Extract structured metrics    │
│  - Generate insights             │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Store in financial_analyses     │
│  (raw JSON + metadata)           │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Frontend: Review & Approve UI   │
│  - Show extracted metrics        │
│  - Display AI insights           │
│  - Allow manual corrections      │
└────────┬─────────────────────────┘
         │
    [User Approves]
         │
         ▼
┌──────────────────────────────────┐
│  Create financial_snapshot       │
│  with source_ref → document_id   │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Enhanced Dashboard              │
│  - Historical trends (Recharts)  │
│  - Variance analysis             │
│  - Cash flow projections         │
│  - AI recommendations            │
└──────────────────────────────────┘
```

---

## Tech Stack Recommendations

### Backend (FastAPI on Railway - Python)

- `pandas==2.1.0` - Universal data parsing (XLS, CSV, Excel)
- `openpyxl==3.1.2` - Advanced Excel format support (.xlsx)
- `xlrd==2.0.1` - Legacy Excel support (.xls)
- `PyMuPDF` (already installed) - PDF text extraction
- `pytesseract` + `pdf2image` - OCR for scanned PDFs (Phase 2, nice-to-have)
- OpenAI Python SDK - Already have for embeddings
- **Deployment:** Railway auto-deploys on push to main branch

### AI Analysis

- **Model:** OpenAI GPT-4-turbo with Structured Outputs (JSON mode)
- **Why:** More reliable than GPT-3.5 for financial data, structured outputs ensure consistent JSON parsing
- **Cost:** ~$0.01-0.03 per document analysis (minimal)
- **Alternative:** GPT-4o-mini for cost savings after validation

### Frontend (Next.js/React - Vercel)

- `recharts` (already installed) - Charts and visualizations
- Existing Radix UI components - Forms and dialogs
- `react-hook-form` (already installed) - Review/approval forms

### Database (Supabase)

- New table: `financial_analyses` - Store raw AI analysis
- Link to existing: `financial_snapshots` - Normalized metrics
- Use existing: `documents` table - File metadata

### Production Architecture

```
Next.js (Vercel) → FastAPI (Railway) → Supabase (Postgres)
                       ↓
                  OpenAI API
```

---

## Database Schema

### New Table: `financial_analyses`

```sql
CREATE TABLE financial_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Analysis metadata
  file_type TEXT NOT NULL, -- 'xlsx', 'xls', 'csv', 'pdf'
  analysis_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'review'
  
  -- Raw AI response
  raw_analysis JSONB NOT NULL, -- Complete GPT response
  confidence_score NUMERIC(3,2), -- 0.00-1.00, AI's confidence in extraction
  
  -- Extracted metrics (denormalized for quick access)
  extracted_data JSONB, -- Structured financial data
  /*
  Example structure:
  {
    "metrics": {
      "arr": { "value": 1200000, "confidence": 0.95, "source_cell": "B12" },
      "revenue": { "value": 100000, "confidence": 0.98, "source_cell": "C4" },
      "gross_margin": { "value": 75.5, "confidence": 0.92, "source_cell": "D15" },
      "cash": { "value": 450000, "confidence": 0.99, "source_cell": "E8" },
      "burn": { "value": 80000, "confidence": 0.87, "source_cell": "F20" }
    },
    "insights": {
      "trends": ["Revenue up 15% MoM", "Burn rate decreasing"],
      "warnings": ["Runway below 6 months"],
      "recommendations": ["Consider cost optimization in marketing"]
    },
    "detected_period": "2025-01"
  }
  */
  
  -- Insights and recommendations
  ai_insights TEXT[], -- Array of insight strings
  ai_recommendations TEXT[], -- Array of recommendation strings
  detected_issues TEXT[], -- Detected problems/warnings
  
  -- Approval workflow
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved BOOLEAN DEFAULT FALSE,
  snapshot_id UUID REFERENCES financial_snapshots(id), -- Created snapshot (if approved)
  
  -- Error handling
  error_message TEXT,
  processing_time_ms INTEGER,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES organizations(id),
  CONSTRAINT valid_status CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'review')),
  CONSTRAINT valid_file_type CHECK (file_type IN ('xlsx', 'xls', 'csv', 'pdf', 'other'))
);

-- Indexes
CREATE INDEX idx_financial_analyses_org_id ON financial_analyses(org_id);
CREATE INDEX idx_financial_analyses_document_id ON financial_analyses(document_id);
CREATE INDEX idx_financial_analyses_status ON financial_analyses(org_id, analysis_status);
CREATE INDEX idx_financial_analyses_created_at ON financial_analyses(org_id, created_at DESC);

-- RLS Policies
ALTER TABLE financial_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analyses in their orgs"
  ON financial_analyses FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Editors can create analyses"
  ON financial_analyses FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Editors can update analyses"
  ON financial_analyses FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE financial_analyses;
```

### Update `documents` table

Add a `subcategory` field to categorize financial documents:

```sql
ALTER TABLE documents 
ADD COLUMN subcategory TEXT DEFAULT 'general';

-- Add check constraint
ALTER TABLE documents
ADD CONSTRAINT valid_financial_subcategory 
CHECK (
  category != 'financial' OR 
  subcategory IN ('budget', 'accounts', 'bank_statement', 'financial_model', 'forecast', 'other')
);
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Backend Services (Railway):**

1. **FastAPI Endpoint: `/analyze-financial-document`**

   - File: `level-ops/agent/services/financial_analyzer.py`
   - Parse XLS/XLSX/CSV using pandas
   - Extract sheet structure and identify financial data
   - Call OpenAI GPT-4-turbo with structured prompt
   - Return JSON with metrics + confidence scores

2. **OpenAI Integration**

   - File: `level-ops/agent/services/openai_financial.py`
   - Create specialized prompts for financial extraction
   - Use JSON mode for structured outputs
   - Handle multi-sheet workbooks (iterate and analyze)

3. **File Parser Service**

   - File: `level-ops/agent/services/file_parser.py`
   - Unified interface for XLS/CSV/PDF parsing
   - Convert all formats to pandas DataFrame
   - Handle common financial formats (P&L, Balance Sheet, Cash Flow)

**Database (Supabase):**

4. **Migration: Create `financial_analyses` table**

   - File: `level-ops/supabase/migrations/[timestamp]_create_financial_analyses.sql`
   - Include all indexes and RLS policies

5. **Update TypeScript Types**

   - Regenerate: `lib/supabase/database.types.ts`

**API Routes (Next.js):**

6. **Next.js API Route: `/api/finance/analyze-document`**

   - File: `level-ops/app/api/finance/analyze-document/route.ts`
   - Accept document_id, trigger Railway FastAPI analysis
   - Return analysis_id for status polling

7. **Status Polling Endpoint: `/api/finance/analysis-status/[id]`**

   - File: `level-ops/app/api/finance/analysis-status/[id]/route.ts`
   - Check analysis progress
   - Return results when complete

### Phase 2: Frontend - Upload & Review (Week 2)

**Components:**

8. **Financial Document Upload Dialog**

   - File: `level-ops/components/finance/document-upload-dialog.tsx`
   - File picker with validation (XLS/CSV priority, PDF nice-to-have)
   - Upload to Supabase Storage with subcategory
   - Trigger analysis API call
   - Show processing status with realtime updates

9. **Analysis Review Card**

   - File: `level-ops/components/finance/analysis-review-card.tsx`
   - Display extracted metrics with confidence scores
   - Show AI insights/recommendations
   - Editable fields for corrections
   - Approve/Reject buttons

   **Low-Confidence Fallback Behavior:**
   - If any critical metric (ARR, revenue, cash, burn) has confidence < 0.5:
     - Automatically set `analysis_status='review'`
     - Highlight low-confidence fields in yellow/amber in UI
     - Display warning banner: "Some metrics need verification"
     - Require user to manually verify/edit before approval
     - Show AI's best guess with confidence score
   - If all metrics have confidence >= 0.5: allow immediate approval
   - File size limits: XLS/XLSX 25MB max, CSV 50MB max

10. **Document Analysis List**

    - File: `level-ops/components/finance/analysis-list.tsx`
    - Table of all analyses (pending, completed, approved)
    - Status indicators, confidence scores
    - Quick actions (review, delete, re-analyze)

**Page Updates:**

11. **Enhanced Finance Page**

    - File: `level-ops/app/(dashboard)/finance/page.tsx`
    - Add "Upload Document" button
    - Show pending analyses section
    - Link approved analyses to snapshots

### Phase 3: Advanced Dashboard (Week 3)

**Charts & Visualizations (Recharts):**

12. **Financial Trends Chart**

    - File: `level-ops/components/finance/trends-chart.tsx`
    - Line chart: ARR, Revenue, Cash over time
    - Use Recharts with historical snapshots
    - Highlight significant changes

13. **Burn Rate & Runway Chart**

    - File: `level-ops/components/finance/burn-runway-chart.tsx`
    - Area chart: Cash declining over time
    - Projected runway line
    - Warning zones (< 6 months)

14. **Variance Analysis Table**

    - File: `level-ops/components/finance/variance-table.tsx`
    - Month-over-month changes
    - Percentage deltas
    - Color-coded indicators

15. **AI Insights Panel**

    - File: `level-ops/components/finance/insights-panel.tsx`
    - Display recommendations from analyses
    - Aggregate trends across periods
    - Actionable suggestions

**Dashboard Layout:**

16. **Finance Dashboard Page**

    - File: `level-ops/app/(dashboard)/finance/dashboard/page.tsx` (NEW)
    - Executive summary cards (current metrics)
    - 6-month trend charts
    - Variance analysis
    - AI recommendations panel
    - Quick actions (upload, manual entry)

### Phase 4: PDF Support (Week 4 - Nice to Have)

17. **PDF Text Extraction Enhancement**

    - Update: `level-ops/agent/services/file_parser.py`
    - Leverage existing PyMuPDF
    - Extract tables using layout analysis
    - Convert to structured data

18. **OCR Integration (Optional)**

    - Add: `pytesseract` + `pdf2image` to requirements
    - Detect if PDF is scanned (no text layer)
    - Fallback to OCR extraction
    - Handle bank statement formats

### Phase 5: Advanced Analytics (Future Enhancement)

19. **Cash Flow Projections**

    - Predictive modeling using historical data
    - Best/worst case scenarios
    - Burndown visualization

20. **Benchmarking & Ratios**

    - Calculate key financial ratios
    - Compare to industry standards
    - Investment readiness score

---

## AI Prompt Strategy

### OpenAI Prompt Template for Financial Extraction

```python
FINANCIAL_EXTRACTION_PROMPT = """You are a financial analyst AI. Analyze the provided spreadsheet data and extract financial metrics.

SPREADSHEET DATA:
{parsed_dataframe_json}

TASK:
Extract the following financial metrics if present:
1. ARR (Annual Recurring Revenue) - in USD
2. Monthly Revenue - in USD
3. Gross Margin - as percentage
4. Cash Balance - in USD
5. Monthly Burn Rate - in USD
6. Date/Period - when these metrics apply

INSTRUCTIONS:
- Search all sheets and rows for these metrics
- Look for keywords: "ARR", "revenue", "gross margin", "cash", "burn", "runway"
- Extract numeric values only
- Indicate confidence (0.0-1.0) for each extraction
- Note the cell/location where each value was found
- Identify the reporting period (month/year)

RETURN JSON:
{
  "metrics": {
    "arr": {"value": number, "confidence": number, "source": "cell/location"},
    "revenue": {"value": number, "confidence": number, "source": "cell/location"},
    "gross_margin": {"value": number, "confidence": number, "source": "cell/location"},
    "cash": {"value": number, "confidence": number, "source": "cell/location"},
    "burn": {"value": number, "confidence": number, "source": "cell/location"}
  },
  "detected_period": "YYYY-MM",
  "insights": ["trend 1", "trend 2"],
  "warnings": ["issue 1", "issue 2"],
  "recommendations": ["suggestion 1", "suggestion 2"]
}

If a metric is not found, set value to null and confidence to 0.0.
"""
```

---

## File Structure

```
level-ops/
├── agent/
│   ├── services/
│   │   ├── financial_analyzer.py      # NEW - Main analysis orchestrator
│   │   ├── file_parser.py             # NEW - XLS/CSV/PDF parser
│   │   └── openai_financial.py        # NEW - OpenAI integration
│   ├── requirements.txt               # UPDATE - Add pandas, openpyxl, xlrd
│   └── main.py                        # UPDATE - Add /analyze-financial-document endpoint
│
├── app/
│   ├── api/
│   │   └── finance/
│   │       ├── analyze-document/
│   │       │   └── route.ts           # NEW - Trigger analysis
│   │       └── analysis-status/
│   │           └── [id]/
│   │               └── route.ts       # NEW - Poll status
│   └── (dashboard)/
│       └── finance/
│           ├── page.tsx               # UPDATE - Add upload button
│           └── dashboard/
│               └── page.tsx           # NEW - Enhanced dashboard
│
├── components/
│   └── finance/
│       ├── financial-card.tsx         # EXISTS
│       ├── snapshot-form.tsx          # EXISTS
│       ├── document-upload-dialog.tsx # NEW - Upload UI
│       ├── analysis-review-card.tsx   # NEW - Review extracted data
│       ├── analysis-list.tsx          # NEW - List analyses
│       ├── trends-chart.tsx           # NEW - Line chart
│       ├── burn-runway-chart.tsx      # NEW - Area chart
│       ├── variance-table.tsx         # NEW - MoM comparison
│       └── insights-panel.tsx         # NEW - AI recommendations
│
├── lib/
│   └── services/
│       └── financial-analysis.ts      # NEW - TypeScript client
│
└── supabase/
    └── migrations/
        └── [timestamp]_create_financial_analyses.sql  # NEW
```

---

## Railway Deployment Notes

### Current Setup

- FastAPI backend is already deployed on Railway
- Auto-deploys from main branch on git push
- Environment variables configured in Railway dashboard
- Base URL: `https://your-app.railway.app`

### Changes Required for This Feature

**1. Update `requirements.txt` in Railway:**

```txt
# Existing dependencies...
# Add these for financial document parsing:
pandas==2.1.0
openpyxl==3.1.2
xlrd==2.0.1
```

**2. Railway Environment Variables:**

- ✅ Existing: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- ✅ No new variables needed for Phase 1

**3. Deployment Process:**

1. Commit updated `agent/` code to main branch
2. Push to GitHub
3. Railway automatically detects changes and deploys
4. Monitor Railway logs for any dependency errors
5. Test new endpoint: `https://your-railway-app.railway.app/analyze-financial-document`

**4. Frontend Configuration (Vercel):**

- Ensure `FASTAPI_URL` environment variable points to Railway URL
- Existing RAG endpoints use same base URL (no changes needed)

**5. Testing Checklist:**

- [ ] Railway build completes successfully
- [ ] New Python dependencies installed correctly
- [ ] New endpoint is accessible
- [ ] OpenAI API calls work from Railway
- [ ] Supabase connections work properly
- [ ] Error handling and logging working

---

## Estimated Costs

### Development Time

- **Phase 1 (Core):** ~1 week
- **Phase 2 (Frontend):** ~1 week
- **Phase 3 (Dashboard):** ~1 week
- **Phase 4 (PDF - Optional):** ~1 week
- **Total:** ~3-4 weeks

### Operating Costs (Monthly)

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| OpenAI API (GPT-4-turbo) | 100-300 document analyses | $10-30 |
| Railway (FastAPI) | Existing deployment | $0 (covered) |
| Supabase Storage | Financial documents | $0 (within free tier) |
| Vercel (Next.js) | Existing deployment | $0 (covered) |
| **Total** | | **$10-30/month** |

**Cost Optimization:**

- Use GPT-4o-mini instead of GPT-4-turbo: ~50% cost reduction
- Cache common patterns to reduce API calls
- Batch process multiple documents

---

## Success Metrics

### Accuracy Targets

- 80%+ accurate extraction of financial metrics (vs manual entry)
- 90%+ user approval rate (minimal corrections needed)
- < 5% error rate on structured documents

### Performance Targets

- < 30 seconds processing time per document
- < 3 seconds for status polling response
- Real-time UI updates via Supabase Realtime

### User Experience Targets

- 50%+ reduction in manual data entry time
- 80%+ user satisfaction with insights quality
- < 2 clicks from upload to approval

### Business Impact

- 10+ documents analyzed per organization per month
- 30%+ improvement in financial tracking consistency
- Reduced data entry errors

---

## Security Considerations

### Data Protection

- All financial documents stored with org-level RLS
- Analysis results only visible to org members (EDITOR+ role required)
- Documents stored in org-specific folders: `finance/{org_id}/`
- Audit log for all approved analyses

### API Security

- OpenAI API calls don't store/train on data (per OpenAI policy)
- Railway backend requires authentication
- Next.js API routes verify user session
- Rate limiting on analysis endpoints

### Compliance

- GDPR-compliant data handling
- Option to delete analyses and source documents permanently
- User consent for AI processing
- Transparent confidence scores for AI decisions

### Privacy

- Financial data never leaves secure infrastructure
- No third-party analytics on sensitive data
- Encrypted at rest (Supabase) and in transit (HTTPS)

---

## Next Steps After Approval

### Immediate Actions (Week 1)

1. ✅ **Database Migration**
   - Create `financial_analyses` table in Supabase
   - Add `subcategory` column to `documents` table
   - Test RLS policies

2. ✅ **Backend Services (Railway)**
   - Update `agent/requirements.txt` with new dependencies
   - Implement `file_parser.py` service
   - Implement `openai_financial.py` service
   - Implement `financial_analyzer.py` orchestrator
   - Update `agent/main.py` with new endpoint
   - Push to GitHub → triggers Railway deployment

3. ✅ **API Routes (Next.js)**
   - Create `/api/finance/analyze-document` route
   - Create `/api/finance/analysis-status/[id]` route
   - Test end-to-end flow

### Short-term Actions (Week 2-3)

4. ✅ **Frontend Components**
   - Build document upload dialog
   - Build analysis review card
   - Build analysis list component
   - Update finance page

5. ✅ **Dashboard**
   - Implement Recharts visualizations
   - Build trends chart
   - Build burn rate chart
   - Build variance table
   - Build insights panel

### Testing & Launch (Week 4)

6. ✅ **Testing**
   - Unit tests for Python services
   - Integration tests for API routes
   - End-to-end user flow testing
   - Performance testing with real documents

7. ✅ **Documentation**
   - User guide for document upload
   - Troubleshooting guide
   - API documentation
   - Update ARCHITECTURE.md

8. ✅ **Launch**
   - Deploy to production
   - Monitor Railway logs
   - Gather user feedback
   - Iterate based on usage patterns

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Data Model](./DATA_MODEL.md)
- [RAG System](./RAG_COMPLETE.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)

---

## Acceptance Criteria

### Phase 1 Complete When:

- [x] Database migration deployed and tested
- [x] FastAPI endpoint deployed on Railway
- [x] Documents can be uploaded via UI
- [x] Analysis extracts at least 3/6 metrics correctly
- [x] Results stored in `financial_analyses` table
- [x] Status polling works

### Phase 2 Complete When:

- [x] Users can upload XLS/CSV files
- [x] Review UI shows extracted metrics
- [x] Users can approve/reject analyses
- [x] Approved analyses create financial snapshots
- [x] Confidence scores displayed

### Phase 3 Complete When:

- [x] Dashboard shows historical trends
- [x] Charts render correctly (Recharts)
- [x] Variance analysis calculates properly
- [x] AI insights displayed in UI
- [x] Mobile-responsive layout

### Production Ready When:

- [x] All phases complete
- [x] 80%+ accuracy on test documents
- [x] Security audit passed
- [x] Documentation complete
- [x] User training provided

