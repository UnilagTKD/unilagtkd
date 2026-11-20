CREATE TABLE IF NOT EXISTS notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_key text NOT NULL,
 title varchar(200) NOT NULL,
 message text NOT NULL,
 href text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 email_status varchar(20) NOT NULL DEFAULT 'pending',
 email_attempts integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_user_idx ON notifications(event_key,user_id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_user_date_idx ON notifications(user_id,created_at);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=current_schema() AND tablename='notifications' AND policyname='server_only') THEN
  CREATE POLICY server_only ON notifications AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
 END IF;
END $$;
REVOKE ALL ON notifications FROM PUBLIC;
