-- ============================================================================
-- EditEngage v2 — Notification Tiers
-- Adds tier column (alert / update / digest) to notifications and updates
-- the trigger function to assign tiers based on event_type patterns.
-- ============================================================================

-- ============================================================================
-- 1. Add tier column with CHECK constraint
-- ============================================================================

ALTER TABLE notifications ADD COLUMN tier text NOT NULL DEFAULT 'update';
ALTER TABLE notifications ADD CONSTRAINT notifications_tier_check CHECK (tier IN ('alert', 'update', 'digest'));
CREATE INDEX idx_notifications_tier ON notifications(tier);

-- ============================================================================
-- 2. Replace trigger function to assign tiers based on event_type
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notifications_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
BEGIN
  -- Determine notification tier from event type
  v_tier := CASE
    WHEN NEW.event_type LIKE '%.failed' THEN 'alert'
    WHEN NEW.event_type LIKE '%.completed' OR NEW.event_type LIKE '%.published' THEN 'update'
    ELSE 'digest'
  END;

  INSERT INTO public.notifications (user_id, project_id, event_id, title, message, tier)
  SELECT
    om.user_id,
    NEW.project_id,
    NEW.id,
    NEW.event_type,
    COALESCE(NEW.payload_summary, NEW.description, NEW.event_type),
    v_tier
  FROM public.organization_members om
  JOIN public.projects p ON p.org_id = om.org_id
  WHERE p.id = NEW.project_id;

  RETURN NEW;
END;
$$;
