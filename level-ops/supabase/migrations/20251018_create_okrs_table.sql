-- Migration: Create OKRs table for Plan module
-- Part of Executive Layer V2 implementation
-- Created: 2025-10-18

-- Create okrs table
CREATE TABLE IF NOT EXISTS public.okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  key_result TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not-started'
    CHECK (status IN ('not-started', 'in-progress', 'completed', 'at-risk', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_okrs_org ON public.okrs(org_id);
CREATE INDEX idx_okrs_status ON public.okrs(org_id, status);
CREATE INDEX idx_okrs_owner ON public.okrs(owner_id);
CREATE INDEX idx_okrs_due_date ON public.okrs(org_id, due_date) WHERE due_date IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT okrs from orgs they belong to
CREATE POLICY "Users can view okrs in their orgs"
  ON public.okrs
  FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS Policy: Editors and above can INSERT okrs
CREATE POLICY "Editors can create okrs"
  ON public.okrs
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- RLS Policy: Editors and above can UPDATE okrs
CREATE POLICY "Editors can update okrs"
  ON public.okrs
  FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- RLS Policy: Only owners and admins can DELETE okrs
CREATE POLICY "Owners and admins can delete okrs"
  ON public.okrs
  FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN')
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_okrs_updated_at
  BEFORE UPDATE ON public.okrs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.okrs;

-- Add comment
COMMENT ON TABLE public.okrs IS 'Objectives and Key Results for the Plan module (Executive Layer V2)';
