import { readFile } from "node:fs/promises";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    const migration = await readFile("migrations/20261117_admin_examiner.sql", "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(migration.replace(/^\uFEFF/, ""));
    });
    console.log("Admin role and examiner tables are ready.");
  } finally {
    await sql.end();
  }
}

main().catch(() => {
  console.error("Migration failed; the transaction was rolled back.");
  process.exitCode = 1;
});
