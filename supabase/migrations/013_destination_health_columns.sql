ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS last_health_status text,
  ADD COLUMN IF NOT EXISTS last_health_check timestamptz,
  ADD COLUMN IF NOT EXISTS health_message text;
