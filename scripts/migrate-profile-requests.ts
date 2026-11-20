import { readFile } from "node:fs/promises";
import postgres from "postgres";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    const migration = await readFile("migrations/20261117_profile_change_requests.sql", "utf8");
    await sql.begin(async tx => { await tx.unsafe(migration.replace(/^\uFEFF/, "")); });
    console.log("Profile change review table is ready.");
  } finally { await sql.end(); }
}
main().catch(() => { console.error("Profile request migration failed; transaction rolled back."); process.exitCode = 1; });
