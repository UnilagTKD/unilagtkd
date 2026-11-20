import { readFileSync } from 'node:fs';
import postgres from 'postgres';
async function main() {
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: 'verify-full' });
  try {
    const [role] = await db`select rolbypassrls, rolsuper from pg_roles where rolname=current_user`;
    if (!role?.rolbypassrls && !role?.rolsuper) throw new Error('Use the trusted owner connection for this migration.');
    const migration = readFileSync('migrations/20261117_security.sql', 'utf8');
    await db.begin(async tx => { await tx.unsafe(migration); });
    console.log('Security migration applied atomically. Existing setup/reset links preserved; no accounts deleted.');
  } finally { await db.end(); }
}
main().catch(() => { console.error('Security migration failed; transaction rolled back. Driver details withheld.'); process.exitCode=1; });
