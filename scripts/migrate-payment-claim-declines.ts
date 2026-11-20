import { readFile } from "node:fs/promises";
import postgres from "postgres";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    const migration = await readFile("migrations/20261117_payment_claim_declines.sql", "utf8");
    await sql.begin(async tx => { await tx.unsafe(migration.replace(/^\uFEFF/, "")); });
    console.log("Payment claim decline fields are ready.");
  } finally { await sql.end(); }
}
main().catch((error) => { console.error("Payment claim migration failed; transaction rolled back:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; });
