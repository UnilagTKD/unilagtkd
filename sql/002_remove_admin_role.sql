-- Removes the "admin" role entirely: admin's former duties (user/role
-- management, application review, password resets, contact messages,
-- content management) now belong to the General Secretary exco office.
--
-- Apply this INSTEAD OF `drizzle-kit push` for the role enum change. Postgres
-- cannot drop a single enum value with ALTER TYPE, so this recreates the type.
--
-- Safe to re-run: every step is guarded / idempotent.

DO $$
DECLARE
  admin_id uuid;
  secretary_id uuid;
BEGIN
  SELECT id INTO admin_id FROM users WHERE email = 'admin@demo.unilagtkd.example';

  IF admin_id IS NOT NULL THEN
    SELECT id INTO secretary_id FROM users WHERE email = 'secretary@demo.unilagtkd.example';

    IF secretary_id IS NOT NULL THEN
      UPDATE achievements SET created_by = secretary_id WHERE created_by = admin_id;
      UPDATE gallery_items SET uploaded_by = secretary_id WHERE uploaded_by = admin_id;
      UPDATE insights SET created_by = secretary_id WHERE created_by = admin_id;
      UPDATE applications SET reviewed_by = secretary_id WHERE reviewed_by = admin_id;
    END IF;

    DELETE FROM member_profiles WHERE user_id = admin_id;
    DELETE FROM medical_records WHERE user_id = admin_id;
    DELETE FROM users WHERE id = admin_id;
  END IF;
END $$;

-- Recreate the role enum without "admin".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE role RENAME TO role_old;
    CREATE TYPE role AS ENUM ('student', 'coach', 'exco', 'alumni');
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN role TYPE role USING role::text::role;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student';
    DROP TYPE role_old;
  END IF;
END $$;
