CREATE TABLE IF NOT EXISTS attendance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(150) NOT NULL,
  starts_on date NOT NULL, ends_on date, notes text,
  opened_by uuid REFERENCES users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES users(id) ON DELETE SET NULL, closed_at timestamptz,
  CONSTRAINT attendance_period_dates CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_periods_one_open_idx ON attendance_periods((1)) WHERE closed_at IS NULL;
CREATE TABLE IF NOT EXISTS attendance_period_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), period_id uuid NOT NULL REFERENCES attendance_periods(id),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL, email varchar(255) NOT NULL, role role NOT NULL,
  belt_grade varchar(50), stats jsonb NOT NULL, history jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_period_snapshot_member_idx ON attendance_period_snapshots(period_id,user_id);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES attendance_periods(id);
-- Existing attendance is retained in one imported, open batch. A coach can
-- review and close it normally before starting the next semester.
DO $$
DECLARE imported uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM training_sessions WHERE period_id IS NULL) THEN
    SELECT id INTO imported FROM attendance_periods WHERE closed_at IS NULL;
    IF imported IS NULL THEN
      INSERT INTO attendance_periods(name,starts_on,notes)
      SELECT 'Imported attendance period', least(min(date), (now() at time zone 'Africa/Lagos')::date), 'Existing sessions preserved during attendance-period setup.' FROM training_sessions
      RETURNING id INTO imported;
    END IF;
    UPDATE training_sessions SET period_id=imported WHERE period_id IS NULL;
  END IF;
END $$;
ALTER TABLE training_sessions ALTER COLUMN period_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS training_sessions_period_idx ON training_sessions(period_id);
-- These new tables have no public grants. Keep direct access private.
ALTER TABLE attendance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_period_snapshots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance_periods' AND policyname='server_only') THEN
    CREATE POLICY server_only ON attendance_periods AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance_period_snapshots' AND policyname='server_only') THEN
    CREATE POLICY server_only ON attendance_period_snapshots AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
  END IF;
END $$;
