// Removes attendance rows for sessions that predate the member's account.
//
// These were created before the register was date-filtered. They are already
// excluded from every count, so this changes no percentage - it just clears
// rows that should never have existed, and stops them showing on a member's
// history as "Not counted, before joining".
//
// Rows inside approved leave are deliberately LEFT ALONE: the member was in the
// club, the mark is a real record of that night, and leave can be revoked.
import postgres from "postgres";

const apply = process.argv.includes("--apply");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const stale = await sql`
    SELECT a.id, u.email, ts.date AS session_date, u.created_at::date AS joined
    FROM attendance a
    JOIN users u ON u.id = a.user_id
    JOIN training_sessions ts ON ts.id = a.session_id
    WHERE ts.date < u.created_at::date
    ORDER BY u.email, ts.date
  `;

  if (stale.length === 0) {
    console.log("No stale pre-join attendance rows.");
    await sql.end();
    return;
  }

  console.log(`${stale.length} attendance row(s) dated before the member joined:`);
  for (const r of stale) {
    console.log(`  ${r.email}  session ${r.session_date}  joined ${r.joined}`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete these.");
    await sql.end();
    return;
  }

  const ids = stale.map((r) => r.id);
  await sql`DELETE FROM attendance WHERE id = ANY(${ids})`;
  console.log(`\nDeleted ${ids.length} row(s).`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
