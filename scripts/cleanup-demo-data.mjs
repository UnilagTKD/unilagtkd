// Explicit cleanup requested by the club owner. Refuses unexpected accounts.
// Runs atomically; never changes the two retained account/profile records.
import assert from 'node:assert/strict';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'verify-full', connect_timeout: 10 });
const keptEmails = ['abdulazeemsalau@gmail.com', 'coach@demo.unilagtkd.example'];
const demoEmails = ['student','exco','secretary','treasurer','vp','welfare','alumni'].map(name => name + '@demo.unilagtkd.example');
const sessionIds = ['a74625ad-04f0-43c7-9256-39baa4855d77','1bb0b399-4163-4b97-8077-e17df47d7cae','63842ee0-92ba-4a97-a24e-c601e77694b9'];
const gradingId = '13642b7d-3b22-4923-bc6e-ea3236370698';
const postIds = ['5755dd24-02ff-4ec9-b300-7f6ce338281f','3b1bf283-b3e0-4b8e-9d11-fad47ab97768','d989474b-c36a-4c0d-b695-a196b20074a7'];
try {
  const result = await sql.begin(async tx => {
    await tx.unsafe('lock table users,member_profiles,medical_records,applications,attendance,attendance_period_snapshots,attendance_periods,training_sessions,grading_examiner_marks,grading_examiner_invites,grading_requests,grading_candidates,grading_events,grading_windows,dues,leave_requests,profile_change_requests,achievements,insights,gallery_items,announcements,leadership in share row exclusive mode');
    const accounts = await tx`select id,email from users order by email`;
    assert.deepEqual(accounts.map(row => row.email).sort(), [...keptEmails,...demoEmails].sort(), 'Accounts changed since inventory; review before deleting');
    const keepIds = accounts.filter(row => keptEmails.includes(row.email)).map(row => row.id);
    const deleteIds = accounts.filter(row => demoEmails.includes(row.email)).map(row => row.id);
    assert.equal(keepIds.length, 2); assert.equal(deleteIds.length, 7);
    async function preserved() {
      return JSON.stringify({
        users: await tx`select * from users where id in ${tx(keepIds)} order by id`,
        profiles: await tx`select * from member_profiles where user_id in ${tx(keepIds)} order by id`,
        medical: await tx`select * from medical_records where user_id in ${tx(keepIds)} order by id`,
        applications: await tx`select to_jsonb(a)-'reviewed_by' as retained from applications a where user_id in ${tx(keepIds)} order by id`,
      });
    }
    const before = await preserved();
    const counts = {};
    async function remove(table, query) { const rows = await query; counts[table] = (counts[table] || 0) + rows.length; }
    // Only the inventoried test grading and its dependent rows.
    await remove('grading_examiner_marks', tx`delete from grading_examiner_marks where candidate_id in (select id from grading_candidates where grading_id=${gradingId}) returning id`);
    await remove('grading_examiner_invites', tx`delete from grading_examiner_invites where grading_id=${gradingId} returning id`);
    await remove('grading_requests', tx`delete from grading_requests where user_id in ${tx(deleteIds)} returning id`);
    await remove('grading_candidates', tx`delete from grading_candidates where grading_id=${gradingId} returning id`);
    await remove('dues', tx`delete from dues where user_id in ${tx(deleteIds)} returning id`);
    await remove('grading_events', tx`delete from grading_events where id=${gradingId} returning id`);
    await remove('grading_windows', tx`delete from grading_windows where id='a3fe1b16-e461-4645-93cd-a0b4e9731d71' returning id`);
    await remove('attendance', tx`delete from attendance where session_id in ${tx(sessionIds)} or user_id in ${tx(deleteIds)} returning id`);
    await remove('training_sessions', tx`delete from training_sessions where id in ${tx(sessionIds)} returning id`);
    const [period] = await tx`select id from attendance_periods where name='Imported attendance period'`;
    if (period) {
      const [references] = await tx`select (select count(*) from training_sessions where period_id=${period.id})+(select count(*) from attendance_period_snapshots where period_id=${period.id}) as count`;
      assert.equal(Number(references.count), 0, 'Imported period still contains records');
      await remove('attendance_periods', tx`delete from attendance_periods where id=${period.id} returning id`);
    }
    await remove('leave_requests', tx`delete from leave_requests where user_id in ${tx(deleteIds)} returning id`);
    await remove('profile_change_requests', tx`delete from profile_change_requests where user_id in ${tx(deleteIds)} returning id`);
    await remove('applications', tx`delete from applications where id in ('6b178bed-b0ba-40fd-a997-c3f38a13c734','8fd4e2ca-ab5d-4fd4-b30d-13220dc01880') and user_id is null returning id`);
    // Retain real approvals, without attributing them to a deleted demo user.
    await tx`update applications set reviewed_by=null where reviewed_by in ${tx(deleteIds)}`;
    await remove('announcements', tx`delete from announcements where id in ('20d70626-6de7-4e90-8af9-bbce9155a9ff','b20d3289-22ca-4a09-8ac3-9ea551f11638') returning id`);
    await remove('gallery_items', tx`delete from gallery_items where uploaded_by in ${tx(deleteIds)} and caption like '%(placeholder)%' returning id`);
    await remove('insights', tx`delete from insights where id in ${tx(postIds)} and created_by in ${tx(deleteIds)} returning id`);
    await remove('leadership', tx`delete from leadership where name like 'Demo %' or name in ('Coach B. Sample','Coach C. Example') returning id`);
    // Real medal results remain; only remove references to deleted demo authors.
    await tx`update achievements set created_by=null where created_by in ${tx(deleteIds)}`;
    await remove('medical_records', tx`delete from medical_records where user_id in ${tx(deleteIds)} returning id`);
    await remove('member_profiles', tx`delete from member_profiles where user_id in ${tx(deleteIds)} returning id`);
    await remove('users', tx`delete from users where id in ${tx(deleteIds)} returning id`);
    assert.equal(await preserved(), before, 'Retained account records must be unchanged');
    const remaining = await tx`select email,role from users order by email`;
    assert.deepEqual(remaining.map(row => row.email).sort(), keptEmails.slice().sort());
    const [medals] = await tx`select count(*)::int as count from achievements`;
    assert.equal(medals.count, 22, 'Real medal records must be retained');
    return { deleted: counts, remainingAccounts: remaining, retainedMedals: medals.count };
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Cleanup rolled back: ' + (error.code || error.name));
  process.exitCode = 1;
} finally { await sql.end({ timeout: 1 }); }
