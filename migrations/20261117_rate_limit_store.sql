-- Additive prerequisite for the already-installed shared abuse controls.
-- This does not change existing account data, tokens, or grants on other tables.
CREATE TABLE IF NOT EXISTS security_rate_limits (
  key_hash varchar(64) PRIMARY KEY, count integer NOT NULL, reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS security_rate_limits_expiry_idx ON security_rate_limits(reset_at);
