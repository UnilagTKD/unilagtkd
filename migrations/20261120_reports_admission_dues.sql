ALTER TABLE applications ADD COLUMN IF NOT EXISTS semester_label varchar(150);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS semester_dues numeric(10,2);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_receipt_data text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admission_payment_reference varchar(200);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admission_payment_status varchar(20) NOT NULL DEFAULT 'pending';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admission_payment_reviewed_by uuid REFERENCES users(id);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admission_payment_reviewed_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admission_payment_review_note text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tracking_token_hash varchar(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tracking_token_expires timestamptz;
CREATE TABLE IF NOT EXISTS club_settings (key text PRIMARY KEY,value jsonb NOT NULL);
INSERT INTO club_settings(key,value) VALUES ('semester-dues','{"label":"Current semester"}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS monthly_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),month varchar(7) NOT NULL UNIQUE,summary jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS monthly_report_deliveries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_id uuid NOT NULL REFERENCES monthly_reports(id) ON DELETE CASCADE,email varchar(255) NOT NULL,status varchar(20) NOT NULL DEFAULT 'pending',claimed_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS monthly_delivery_report_email_idx ON monthly_report_deliveries(report_id,email);
ALTER TABLE club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_report_deliveries ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['club_settings','monthly_reports','monthly_report_deliveries'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=current_schema() AND tablename=t AND policyname='server_only') THEN
   EXECUTE format('CREATE POLICY server_only ON %I AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false)',t);
  END IF;
  EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
 END LOOP;
END $$;
