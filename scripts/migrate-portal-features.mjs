import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: 'verify-full' });
try {
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(20261117, 3)`;
    await tx`lock table training_sessions in share row exclusive mode`;
    for (const file of ['20261117_attendance_periods.sql', '20261117_surnames.sql', '20261117_rate_limit_store.sql']) {
      const migration = await readFile(`migrations/${file}`, 'utf8');
      await tx.unsafe(migration);
    }
  });
  console.log('Portal feature migration applied atomically: existing sessions retained in an imported period, surname fields added, and rate-limit storage ready. Existing passwords unchanged.');
} catch {
  console.error('Portal feature migration failed; transaction rolled back. Database details withheld.');
  process.exitCode = 1;
} finally { await sql.end(); }
