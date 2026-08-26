-- Password reset support for the forgot-password flow.
--
-- Apply this INSTEAD OF `drizzle-kit push` for these columns. push wants to
-- truncate users to add the UNIQUE constraint on reset_token, which would
-- destroy every account. These statements are purely additive and safe to run
-- on a live database.
--
-- Safe to re-run: every statement is guarded.

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_requested_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires timestamptz;

-- Unique on reset_token, added separately so it does not force a table rewrite.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_reset_token_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_reset_token_unique UNIQUE (reset_token);
  END IF;
END $$;
