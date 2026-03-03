-- ============================================================================
-- Migration 013: Tenant-level configuration
-- Adds per-organization configuration columns for multi-tenant customization
-- ============================================================================

ALTER TABLE organizations ADD COLUMN vocabulary_labels jsonb DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN default_writing_style_preset text;
ALTER TABLE organizations ADD COLUMN default_destination_types text[] DEFAULT ARRAY['ghost']::text[];
ALTER TABLE organizations ADD COLUMN ui_theme jsonb DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN enabled_modules text[] DEFAULT ARRAY['research','writing','publish']::text[];
ALTER TABLE organizations ADD COLUMN tenant_type text DEFAULT 'content' CHECK (tenant_type IN ('content', 'research', 'enterprise'));

-- ============================================================================
-- RLS: Allow org owners and admins to update their organizations
-- ============================================================================

CREATE POLICY "Org admins can update their organizations"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT org_id FROM organization_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));
