-- Additive migration: preserves existing accounts and grading records.
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'admin';

CREATE TABLE IF NOT EXISTS "grading_examiner_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "grading_id" uuid NOT NULL REFERENCES "grading_events"("id") ON DELETE CASCADE,
  "examiner_name" varchar(255) NOT NULL,
  "examiner_email" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "grading_examiner_invites_grading_id_idx"
  ON "grading_examiner_invites" ("grading_id");

CREATE TABLE IF NOT EXISTS "grading_examiner_marks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invite_id" uuid NOT NULL REFERENCES "grading_examiner_invites"("id") ON DELETE CASCADE,
  "candidate_id" uuid NOT NULL REFERENCES "grading_candidates"("id") ON DELETE CASCADE,
  "score_basics" integer,
  "score_poomsae" integer,
  "score_kyorugi" integer,
  "score_kyukpa" integer,
  "score_hoshinsul" integer,
  "score_theory" integer,
  "notes" text,
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "grading_examiner_marks_invite_candidate_unique" UNIQUE ("invite_id", "candidate_id")
);
CREATE INDEX IF NOT EXISTS "grading_examiner_marks_candidate_id_idx"
  ON "grading_examiner_marks" ("candidate_id");
