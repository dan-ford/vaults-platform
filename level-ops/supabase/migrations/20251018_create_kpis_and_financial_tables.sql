-- Migration: Create KPIs and Financial Snapshots tables for Metrics and Finance modules
-- Part of Executive Layer V2 implementation
-- Created: 2025-10-18

-- ============================================================================
-- KPIs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT, -- e.g., "USD", "%", "users", "days"
  target NUMERIC,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly'
    CHECK (cadence IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_kpis_org ON public.kpis(org_id);
CREATE INDEX idx_kpis_active ON public.kpis(org_id, is_active);
CREATE INDEX idx_kpis_owner ON public.kpis(owner_id);

-- Enable RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpis
CREATE POLICY "Users can view kpis in their orgs"
  ON public.kpis FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create kpis"
  ON public.kpis FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Editors can update kpis"
  ON public.kpis FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Owners and admins can delete kpis"
  ON public.kpis FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN')
    )
  );

-- Add trigger
CREATE TRIGGER update_kpis_updated_at
  BEFORE UPDATE ON public.kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpis;

-- ============================================================================
-- KPI Measurements Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period DATE NOT NULL, -- Start of measurement period
  value NUMERIC NOT NULL,
  variance_note TEXT, -- Explanation of variance from target
  source_ref UUID REFERENCES public.documents(id), -- Link to supporting document
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kpi_id, period)
);

-- Create indexes
CREATE INDEX idx_kpi_measurements_kpi ON public.kpi_measurements(kpi_id, period DESC);
CREATE INDEX idx_kpi_measurements_org ON public.kpi_measurements(org_id, period DESC);

-- Enable RLS
ALTER TABLE public.kpi_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_measurements
CREATE POLICY "Users can view kpi measurements in their orgs"
  ON public.kpi_measurements FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create kpi measurements"
  ON public.kpi_measurements FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Editors can update kpi measurements"
  ON public.kpi_measurements FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Owners and admins can delete kpi measurements"
  ON public.kpi_measurements FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN')
    )
  );

-- Add trigger
CREATE TRIGGER update_kpi_measurements_updated_at
  BEFORE UPDATE ON public.kpi_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_measurements;

-- ============================================================================
-- Financial Snapshots Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period DATE NOT NULL, -- Month-end date (e.g., 2025-01-31)
  arr NUMERIC, -- Annual Recurring Revenue
  revenue NUMERIC, -- Monthly revenue
  gross_margin NUMERIC, -- Percentage (0-100)
  cash NUMERIC, -- Cash balance
  burn NUMERIC, -- Monthly burn rate
  runway_days INTEGER, -- Calculated runway in days
  notes TEXT, -- Commentary on financial performance
  source_ref UUID REFERENCES public.documents(id), -- Link to financial document
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, period)
);

-- Create indexes
CREATE INDEX idx_financial_snapshots_org ON public.financial_snapshots(org_id, period DESC);

-- Enable RLS
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_snapshots
CREATE POLICY "Users can view financial snapshots in their orgs"
  ON public.financial_snapshots FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create financial snapshots"
  ON public.financial_snapshots FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Editors can update financial snapshots"
  ON public.financial_snapshots FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Owners and admins can delete financial snapshots"
  ON public.financial_snapshots FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN')
    )
  );

-- Add trigger
CREATE TRIGGER update_financial_snapshots_updated_at
  BEFORE UPDATE ON public.financial_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_snapshots;

-- Add comments
COMMENT ON TABLE public.kpis IS 'Key Performance Indicators definitions for Metrics module (Executive Layer V2)';
COMMENT ON TABLE public.kpi_measurements IS 'Time-series measurements for KPIs with variance tracking';
COMMENT ON TABLE public.financial_snapshots IS 'Monthly financial snapshots for Finance module (Executive Layer V2)';
