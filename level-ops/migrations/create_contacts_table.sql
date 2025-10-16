-- Create contacts table for project stakeholders and team members
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,

  -- Categorization
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('client', 'vendor', 'stakeholder', 'team_member', 'contractor', 'partner', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Additional info
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies using org_memberships pattern
CREATE POLICY "contacts_select_policy" ON contacts
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "contacts_insert_policy" ON contacts
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();
