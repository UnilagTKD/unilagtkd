// Uses only session-local temporary tables and rolls back; never edits real accounts.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sql, eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { db } from "../src/db";
import { users, memberProfiles, attendance, leaveRequests, attendancePeriodSnapshots } from "../src/db/schema";
import { startAttendancePeriod, endAttendancePeriod } from "../src/lib/attendance-period-lifecycle";
import { createPeriodSession, recordPeriodAttendance, updatePeriodSession, deletePeriodSession, checkInToPeriodSession } from "../src/lib/attendance-session-operations";
import { attendanceStatsFor, attendanceHistoryFor } from "../src/lib/attendance-data";
import { queuePasswordReset } from "../src/lib/password-reset";
import { initialSurnamePassword } from "../src/lib/validation/surname";
import { recordSlug, recordIdFromSlug } from "../src/lib/record-slug";
import { storedToken } from "../src/lib/tokens";
const rollback = new Error("ROLLBACK_TEMPORARY_FEATURE_TESTS");

async function main() {
  let passed = false;
  try {
    await db.transaction(async tx => {
      await tx.execute(sql`set local search_path = pg_temp, public`);
      for (const table of ["users", "member_profiles", "training_sessions", "attendance", "leave_requests"]) {
        await tx.execute(sql.raw(`create temporary table ${table} (like public.${table} including all) on commit drop`));
      }
      // The feature migration is exercised against temporary tables only.
      const migration = (await readFile("migrations/20261117_attendance_periods.sql", "utf8")).replaceAll("CREATE TABLE IF NOT EXISTS", "CREATE TEMPORARY TABLE IF NOT EXISTS");
      await tx.execute(sql.raw(migration));
      await tx.execute(sql`alter table member_profiles add column if not exists surname varchar(100)`);
      for (const table of ["users", "member_profiles", "training_sessions", "attendance", "leave_requests", "attendance_periods", "attendance_period_snapshots"]) {
        const [row] = await tx.execute<{ persistence: string }>(sql`select relpersistence as persistence from pg_class where oid=to_regclass(${table})`);
        assert.equal(row.persistence, "t", `All writes must target temporary ${table}`);
      }
      const passwordHash = await hash(initialSurnamePassword("  SALAU  "), 12);
      assert.equal(await compare("salau", passwordHash), true);
      assert.equal(await compare("SALAU", passwordHash), false);
      const [coach] = await tx.insert(users).values({ email: "coach@feature-check.invalid", role: "coach", passwordHash }).returning();
      const [member] = await tx.insert(users).values({ email: "member@feature-check.invalid", role: "student", passwordHash, createdAt: new Date("2026-01-01T10:00:00Z") }).returning();
      await tx.insert(memberProfiles).values({ userId: member.id, fullName: "Example Member", surname: "Example", membershipCategory: "undergraduate" });
      const first = await startAttendancePeriod(tx, coach.id, { name: "First semester", startsOn: "2026-02-01" });
      await assert.rejects(() => startAttendancePeriod(tx, coach.id, { name: "Overlapping period", startsOn: "2026-02-02" }), /End the current/);
      const [one] = await createPeriodSession(tx, coach.id, { title: "First training", date: "2026-02-01" });
      const [two] = await createPeriodSession(tx, coach.id, { title: "Second training", date: "2026-02-02" });
      const [excused] = await createPeriodSession(tx, coach.id, { title: "Medical leave training", date: "2026-02-03" });
      await recordPeriodAttendance(tx, coach.id, one.id, [{ userId: member.id, present: true }]);
      await recordPeriodAttendance(tx, coach.id, two.id, [{ userId: member.id, present: false }]);
      await tx.insert(leaveRequests).values({ userId: member.id, reasonCategory: "illness", startDate: "2026-02-03", endDate: "2026-02-03", details: "Temporary test leave", status: "approved" });
      await tx.insert(attendance).values({ userId: member.id, sessionId: excused.id, present: false });
      const before = await attendanceStatsFor(member.id, undefined, tx);
      assert.equal(before?.pct, 50); assert.equal(before?.total, 2); assert.equal(before?.excludedOnLeave, 1);
      await assert.rejects(() => endAttendancePeriod(tx, coach.id, first.id, "2026-02-01"), /sessions after/);
      await endAttendancePeriod(tx, coach.id, first.id, "2026-02-03");
      const empty = await attendanceStatsFor(member.id, undefined, tx);
      assert.equal(empty?.total, 0); assert.equal(empty?.pct, null);
      assert.equal((await attendanceStatsFor(member.id, first.id, tx))?.pct, 50);
      await assert.rejects(() => updatePeriodSession(tx, one.id, { title: "Changed archive", date: "2026-02-01" }), /closed/);
      await assert.rejects(() => deletePeriodSession(tx, one.id), /closed/);
      await assert.rejects(() => recordPeriodAttendance(tx, coach.id, one.id, [{ userId: member.id, present: false }]), /closed/);
      await assert.rejects(() => checkInToPeriodSession(tx, member.id, one.id), /closed/);
      await tx.insert(leaveRequests).values({ userId: member.id, reasonCategory: "personal", startDate: "2026-02-02", endDate: "2026-02-02", details: "Approved after archival", status: "approved" });
      assert.equal((await attendanceStatsFor(member.id, first.id, tx))?.pct, 50, "Later leave must not rewrite archived percentages");
      assert.equal((await attendanceHistoryFor(member.id, first.id, tx)).find(row => row.sessionId === two.id)?.onLeave, false);
      const second = await startAttendancePeriod(tx, coach.id, { name: "Second semester", startsOn: "2026-02-04" });
      assert.equal((await attendanceStatsFor(member.id, undefined, tx))?.total, 0);
      const [fresh] = await createPeriodSession(tx, coach.id, { title: "New semester training", date: "2026-02-04" });
      await recordPeriodAttendance(tx, coach.id, fresh.id, [{ userId: member.id, present: false }]);
      const current = await attendanceStatsFor(member.id, undefined, tx);
      assert.equal(current?.periodId, second.id); assert.equal(current?.pct, 0); assert.equal(current?.total, 1);
      assert.equal((await attendanceStatsFor(member.id, first.id, tx))?.pct, 50);
      assert.equal((await tx.select().from(attendancePeriodSnapshots)).length, 1);
      let deliveries = 0, deliveredToken = "";
      await queuePasswordReset(member.email, tx, async (_to, url) => { deliveries++; deliveredToken = new URL(url).searchParams.get("token") ?? ""; return { ok: true }; });
      assert.equal(deliveries, 1);
      const [reset] = await tx.select().from(users).where(eq(users.id, member.id));
      assert.equal(reset.resetToken, storedToken(deliveredToken)); assert.equal(reset.resetRequestedAt, null);
      assert.ok(reset.resetTokenExpires && reset.resetTokenExpires.getTime() - Date.now() > 3_500_000);
      await queuePasswordReset("unknown@feature-check.invalid", tx, async () => { deliveries++; return { ok: true }; });
      assert.equal(deliveries, 1, "Unknown addresses must not trigger email");
      await queuePasswordReset(member.email, tx, async () => ({ ok: false, error: "Simulated provider failure" }));
      const [fallback] = await tx.select().from(users).where(eq(users.id, member.id));
      assert.ok(fallback.resetRequestedAt, "Failed email remains available for manual admin recovery");
      const slug = recordSlug("Training: first semester!", one.id);
      assert.equal(recordIdFromSlug(slug), one.id); assert.equal(recordIdFromSlug(one.id), one.id);
      assert.equal(recordIdFromSlug("invalid-record"), null);
      assert.notEqual(recordSlug("Training", one.id), recordSlug("Training", two.id));
      passed = true;
      throw rollback;
    }, { isolationLevel: "read committed" });
  } catch (error) { if (error !== rollback) throw error; }
  assert.equal(passed, true);
  console.log("Portal feature checks passed: period lifecycle, archived snapshots and immutability, active-only thresholds, surname password hashes, reset-email/fallback behavior, and old/readable URLs. Temporary tables rolled back; no real accounts or email deliveries.");
}
main().catch(error => { console.error(error instanceof Error && !error.message.includes("query:") ? error.message : "Portal feature checks failed; database details withheld."); process.exitCode=1; }).finally(() => db.$client.end());
