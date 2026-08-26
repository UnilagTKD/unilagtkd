// Reports where the live database differs from src/db/schema.ts, without
// changing anything. Read-only.
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const dbCols = await sql<
    { table_name: string; column_name: string }[]
  >`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`;

  const dbTables = new Set(dbCols.map((c) => c.table_name));
  const byTable = new Map<string, Set<string>>();
  for (const c of dbCols) {
    if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Set());
    byTable.get(c.table_name)!.add(c.column_name);
  }

  const dbEnums = await sql<{ typname: string }[]>`
    SELECT typname FROM pg_type WHERE typtype = 'e'
  `;
  const enumNames = new Set(dbEnums.map((e) => e.typname));

  let problems = 0;

  for (const value of Object.values(schema)) {
    if (!(value instanceof PgTable)) continue;
    const cfg = getTableConfig(value);
    const have = byTable.get(cfg.name);

    if (!dbTables.has(cfg.name)) {
      console.log(`TABLE MISSING: ${cfg.name}`);
      problems++;
      continue;
    }

    for (const col of cfg.columns) {
      if (!have!.has(col.name)) {
        const enumType = (col as { enumValues?: string[] }).enumValues
          ? " (enum)"
          : "";
        console.log(
          `COLUMN MISSING: ${cfg.name}.${col.name}${enumType} — notNull=${col.notNull}, hasDefault=${col.hasDefault}`
        );
        problems++;
      }
    }
  }

  console.log("\nEnum types in DB:", [...enumNames].sort().join(", "));

  if (problems === 0) console.log("\nNo drift: database matches schema.ts");
  else console.log(`\n${problems} difference(s) found.`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
