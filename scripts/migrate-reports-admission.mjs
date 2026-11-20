import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false,ssl:'verify-full',connect_timeout:10});
try { const migration=await readFile('migrations/20261120_reports_admission_dues.sql','utf8'); await sql.begin(async tx=>{await tx.unsafe(migration);}); console.log('Monthly report and admission payment schema ready; existing account approvals and payments unchanged.'); }
finally { await sql.end({timeout:1}); }
