-- Apply before deploying the shared limiter. No member data is removed.
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  key_hash varchar(64) PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS security_rate_limits_expiry_idx ON public.security_rate_limits(reset_at);
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_rate_limits FROM PUBLIC;

-- Existing links keep working; only the stored representation changes.
UPDATE public.applications SET setup_token = 'sha256:' || encode(sha256(convert_to(setup_token, 'UTF8')), 'hex')
WHERE setup_token ~ '^[a-f0-9]{64}$';
UPDATE public.users SET reset_token = 'sha256:' || encode(sha256(convert_to(reset_token, 'UTF8')), 'hex')
WHERE reset_token ~ '^[a-f0-9]{64}$';

-- This app uses one private backend connection, never browser database access.
-- Deny direct non-bypass roles on every application table. The existing owner
-- backend still uses server-side role/ownership checks; these policies do NOT
-- claim to isolate end users within that shared BYPASSRLS connection.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users','member_profiles','medical_records','sub_committees','applications',
    'training_sessions','attendance','grading_windows','grading_events',
    'grading_examiner_invites','grading_candidates','grading_examiner_marks',
    'grading_requests','dues','achievements','gallery_items','announcements',
    'leadership','insights','contact_messages','leave_requests',
    'profile_change_requests','security_rate_limits'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=table_name AND policyname='server_only') THEN
      EXECUTE format('CREATE POLICY server_only ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)', table_name);
    END IF;
  END LOOP;
END $$;
