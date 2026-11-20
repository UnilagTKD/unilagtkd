ALTER TABLE applications ADD COLUMN IF NOT EXISTS surname varchar(100);
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS surname varchar(100);
-- Existing passwords are deliberately unchanged. Legacy applications require
-- an explicit surname from the admin at approval instead of guessing a name.
