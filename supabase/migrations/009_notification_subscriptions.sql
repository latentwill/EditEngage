-- Migration 009: Notification Subscriptions
-- Allows users to control which notification modules they receive per project.

CREATE TABLE notification_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subscribed_modules text[] NOT NULL DEFAULT ARRAY['research', 'writing', 'publish', 'system'],
  subscribed_event_types text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- RLS
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON notification_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Update trigger function to check subscriptions before creating notifications
CREATE OR REPLACE FUNCTION create_notifications_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
BEGIN
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
  WHERE p.id = NEW.project_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_subscriptions ns
      WHERE ns.user_id = om.user_id
        AND ns.project_id = NEW.project_id
        AND ns.is_active = true
        AND NEW.module IS NOT NULL
        AND NOT (NEW.module = ANY(ns.subscribed_modules))
    );

  RETURN NEW;
END;
$$;
