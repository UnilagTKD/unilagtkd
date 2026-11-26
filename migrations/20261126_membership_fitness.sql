CREATE TABLE IF NOT EXISTS membership_fitness (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  jumping_jacks integer NOT NULL,
  push_ups integer NOT NULL,
  sit_ups integer NOT NULL,
  burpees integer NOT NULL,
  shuttle_passed boolean NOT NULL,
  validated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  validated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE membership_fitness ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY server_only ON membership_fitness AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
