ALTER TABLE profile_change_requests
  ADD COLUMN IF NOT EXISTS approvals jsonb NOT NULL DEFAULT '{}'::jsonb;
