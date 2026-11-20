ALTER TYPE membership_category ADD VALUE IF NOT EXISTS 'staff';
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS graduation_year varchar(4);
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS institution varchar(200);
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS occupation varchar(150);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS graduation_year varchar(4);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS institution varchar(200);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS occupation varchar(150);
ALTER TABLE profile_change_requests ADD COLUMN IF NOT EXISTS member_note text;
