CREATE TABLE IF NOT EXISTS "profile_change_requests" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "before" jsonb NOT NULL,
 "proposed" jsonb NOT NULL,
 "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 "created_at" timestamptz NOT NULL DEFAULT now(),
 "reviewed_by" uuid REFERENCES "users"("id"),
 "reviewed_at" timestamptz,
 "review_note" text
);
CREATE INDEX IF NOT EXISTS "profile_change_requests_user_idx" ON "profile_change_requests"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "profile_change_requests_one_pending_idx" ON "profile_change_requests"("user_id") WHERE "status"='pending';
