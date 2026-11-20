// Read-only check: no rows, accounts, schema, or grants are changed.
import assert from 'node:assert/strict';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2, ssl: 'verify-full' });
try {
  await sql.begin('read only', async first => {
    await first`select pg_advisory_xact_lock(20261117, 2)`;
    const locked = await sql.begin('read only', async second => {
      const [row] = await second`select pg_try_advisory_xact_lock(20261117, 2) as acquired`;
      return row.acquired;
    });
    assert.equal(locked, false, 'A second transaction cannot enter appointment changes simultaneously');
  });
  const available = await sql.begin('read only', async transaction => {
    const [row] = await transaction`select pg_try_advisory_xact_lock(20261117, 2) as acquired`;
    return row.acquired;
  });
  assert.equal(available, true, 'The appointment lock is released at transaction end');
  const rows = await sql`select exco_position as position, count(*)::integer as assigned from users where exco_position is not null group by exco_position order by exco_position`;
  console.log(JSON.stringify({ locking: 'passed', currentAssignments: rows, accountChanges: 0 }));
} catch {
  console.error('Exco locking check failed; database details withheld.');
  process.exitCode = 1;
} finally { await sql.end(); }
