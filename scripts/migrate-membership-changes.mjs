import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false,ssl:'verify-full',connect_timeout:10});
try{const migration=await readFile('migrations/20261120_membership_changes.sql','utf8');await sql.begin(async tx=>{await tx.unsafe(migration);});console.log('Staff category and verified academic-change fields ready. Existing memberships and roles unchanged.');}
finally{await sql.end({timeout:1});}
