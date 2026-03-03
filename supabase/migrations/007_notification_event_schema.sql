-- ============================================================================
-- EditEngage v2 — Notification Event Schema
-- Extends the events table with richer context columns for the notification
-- feed: agent attribution, module origin, human summary, and artifact links.
-- ============================================================================

-- New columns
ALTER TABLE events ADD COLUMN agent_id uuid NULL;
ALTER TABLE events ADD COLUMN module text NULL;
ALTER TABLE events ADD COLUMN payload_summary text NULL;
ALTER TABLE events ADD COLUMN artifact_link text NULL;

-- Module must be one of the platform modules (NULL allowed for backward compat)
ALTER TABLE events ADD CONSTRAINT chk_events_module
  CHECK (module IN ('research', 'writing', 'publish', 'system'));

-- Partial indexes for filtered queries
CREATE INDEX idx_events_module ON events(module) WHERE module IS NOT NULL;
CREATE INDEX idx_events_agent_id ON events(agent_id) WHERE agent_id IS NOT NULL;

-- Column documentation
COMMENT ON COLUMN events.agent_id IS 'The writing_agent that produced this event, if applicable.';
COMMENT ON COLUMN events.module IS 'Which platform module generated this event: research, writing, publish, or system.';
COMMENT ON COLUMN events.payload_summary IS 'One-line human-readable summary of the event payload for feed display.';
COMMENT ON COLUMN events.artifact_link IS 'Optional deep-link to the artifact produced (e.g., /dashboard/write/content/abc123).';
