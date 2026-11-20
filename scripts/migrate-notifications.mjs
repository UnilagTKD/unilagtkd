import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'verify-full', connect_timeout: 10 });
try {
  const migration = await readFile('migrations/20261120_notifications.sql', 'utf8');
  await sql.begin(async tx => { await tx.unsafe(migration); });
  console.log('Notification table, indexes, and restrictive access policy ready. Existing account/activity records unchanged.');
} finally { await sql.end({ timeout: 1 }); }
