-- Migration: Create Board Packs table for Packs module
-- Part of Executive Layer V2 implementation
-- Created: 2025-10-18

-- ============================================================================
-- Board Packs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.board_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  title TEXT NOT NULL,
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of agenda items
  pdf_url TEXT, -- Storage path to generated PDF
  hash TEXT, -- SHA256 hash of PDF for immutability verification
  attendees JSONB DEFAULT '[]'::jsonb, -- Array of attendee objects
  approved_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_board_packs_org ON public.board_packs(org_id, meeting_date DESC);
CREATE INDEX idx_board_packs_published ON public.board_packs(org_id, published_at DESC) WHERE published_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.board_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_packs
CREATE POLICY "Users can view board packs in their orgs"
  ON public.board_packs FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create board packs"
  ON public.board_packs FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Editors can update board packs"
  ON public.board_packs FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

CREATE POLICY "Owners and admins can delete board packs"
  ON public.board_packs FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN')
    )
  );

-- Add trigger
CREATE TRIGGER update_board_packs_updated_at
  BEFORE UPDATE ON public.board_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_packs;

-- ============================================================================
-- Decision Approvals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.decision_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(decision_id, approver_id)
);

-- Create indexes
CREATE INDEX idx_decision_approvals_decision ON public.decision_approvals(decision_id);
CREATE INDEX idx_decision_approvals_approver ON public.decision_approvals(approver_id);
CREATE INDEX idx_decision_approvals_status ON public.decision_approvals(decision_id, status);

-- Enable RLS
ALTER TABLE public.decision_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decision_approvals
CREATE POLICY "Users can view decision approvals in their orgs"
  ON public.decision_approvals FOR SELECT
  USING (
    decision_id IN (
      SELECT d.id FROM public.decisions d
      WHERE d.org_id IN (
        SELECT om.org_id FROM public.org_memberships om
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can create decision approvals"
  ON public.decision_approvals FOR INSERT
  WITH CHECK (
    decision_id IN (
      SELECT d.id FROM public.decisions d
      WHERE d.org_id IN (
        SELECT om.org_id FROM public.org_memberships om
        WHERE om.user_id = auth.uid()
          AND om.role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

CREATE POLICY "Approvers can update their own approvals"
  ON public.decision_approvals FOR UPDATE
  USING (approver_id = auth.uid());

CREATE POLICY "Owners and admins can delete decision approvals"
  ON public.decision_approvals FOR DELETE
  USING (
    decision_id IN (
      SELECT d.id FROM public.decisions d
      WHERE d.org_id IN (
        SELECT om.org_id FROM public.org_memberships om
        WHERE om.user_id = auth.uid()
          AND om.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_approvals;

-- Add comments
COMMENT ON TABLE public.board_packs IS 'Immutable board packs with watermarking for Packs module (Executive Layer V2)';
COMMENT ON TABLE public.decision_approvals IS 'Multi-signature approval workflow for decisions (Executive Layer V2)';
