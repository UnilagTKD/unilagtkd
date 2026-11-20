ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "payment_declined_at" timestamptz;
ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "payment_declined_by" uuid REFERENCES "users"("id");
ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "payment_decline_reason" text;
