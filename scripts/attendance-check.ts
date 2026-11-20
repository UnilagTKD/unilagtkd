// Verifies the attendance counting rules against the real database, using a
// throwaway member and sessions that are removed again at the end.
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db/index";
import {
  users,
  memberProfiles,
  trainingSessions,
  attendance,
  leaveRequests,
} from "../src/db/schema";
import { attendanceStatsFor, attendanceHistoryFor } from "../src/lib/attendance-data";
import { getActiveAttendancePeriod } from "../src/lib/attendance-periods";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.log(`FAIL ${name}\n  got      ${a}\n  expected ${e}`);
  } else {
    console.log(`ok   ${name} = ${a}`);
  }
}

const MARKER = "__attendance_smoke__";

async function cleanup() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, `${MARKER}@example.invalid`));
  for (const r of rows) await db.delete(users).where(eq(users.id, r.id)); // cascades
  const sessions = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(eq(trainingSessions.title, MARKER));
  if (sessions.length > 0) {
    await db.delete(trainingSessions).where(
      inArray(
        trainingSessions.id,
        sessions.map((s) => s.id)
      )
    );
  }
}

async function main() {
  const period = await getActiveAttendancePeriod();
  if (!period) throw new Error("Open a monitoring period in an isolated test database first.");
  await cleanup();

  // Member joined 2026-06-01.
  const [member] = await db
    .insert(users)
    .values({
      email: `${MARKER}@example.invalid`,
      role: "student",
      status: "active",
      createdAt: new Date("2026-06-01T09:00:00Z"),
    })
    .returning({ id: users.id });

  await db.insert(memberProfiles).values({
    userId: member.id,
    fullName: MARKER,
    membershipCategory: "undergraduate",
    beltGrade: "White Belt 10th Geup",
  });

  // Approved leave 2026-07-10 .. 2026-07-20.
  await db.insert(leaveRequests).values({
    userId: member.id,
    reasonCategory: "injury",
    startDate: "2026-07-10",
    endDate: "2026-07-20",
    details: MARKER,
    status: "approved",
  });

  // A pending leave that must NOT protect anything: 2026-08-01 .. 2026-08-05.
  await db.insert(leaveRequests).values({
    userId: member.id,
    reasonCategory: "personal",
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    details: MARKER,
    status: "pending",
  });

  const sessionDates = [
    ["2026-05-20", false], // before joining -> excluded
    ["2026-05-25", false], // before joining -> excluded
    ["2026-06-05", true], // counts, present
    ["2026-06-12", true], // counts, present
    ["2026-07-15", false], // inside approved leave -> excluded
    ["2026-07-17", false], // inside approved leave -> excluded
    ["2026-08-03", false], // pending leave only -> still counts, absent
    ["2026-08-10", false], // counts, absent
  ] as const;

  const created: string[] = [];
  for (const [date] of sessionDates) {
    const [s] = await db
      .insert(trainingSessions)
      .values({ title: MARKER, date, periodId: period.id })
      .returning({ id: trainingSessions.id });
    created.push(s.id);
  }

  // Mark absent everywhere except the two June sessions.
  for (let i = 0; i < created.length; i++) {
    const date = sessionDates[i][0];
    await db.insert(attendance).values({
      sessionId: created[i],
      userId: member.id,
      present: date === "2026-06-05" || date === "2026-06-12",
    });
  }

  const stats = await attendanceStatsFor(member.id);
  console.log("\nstats:", stats, "\n");

  check("counts from join date", stats?.countsFrom, "2026-06-01");
  // Counting sessions: 06-05, 06-12, 08-03 (pending leave does not protect), 08-10
  check("counting total", stats?.total, 4);
  check("present", stats?.present, 2);
  check("pct", stats?.pct, 50);
  check("excluded before joining", stats?.excludedBeforeJoining, 2);
  check("excluded on approved leave", stats?.excludedOnLeave, 2);

  const history = await attendanceHistoryFor(member.id);
  check("history rows (all 8 shown)", history.length, 8);
  check(
    "before-joining flagged",
    history.filter((h) => h.beforeJoining).map((h) => h.sessionDate).sort(),
    ["2026-05-20", "2026-05-25"]
  );
  check(
    "on-leave flagged",
    history.filter((h) => h.onLeave).map((h) => h.sessionDate).sort(),
    ["2026-07-15", "2026-07-17"]
  );

  // Approving the pending leave must now protect 08-03, lifting 2/4 to 2/3.
  await db
    .update(leaveRequests)
    .set({ status: "approved" })
    .where(eq(leaveRequests.details, MARKER));

  const after = await attendanceStatsFor(member.id);
  check("total after approving second leave", after?.total, 3);
  check("pct after approving second leave", after?.pct, 67);
  check("excluded on leave now", after?.excludedOnLeave, 3);

  // Overlapping approved leave must not double-count (DISTINCT guard).
  await db.insert(leaveRequests).values({
    userId: member.id,
    reasonCategory: "illness",
    startDate: "2026-07-12",
    endDate: "2026-07-18",
    details: MARKER,
    status: "approved",
  });
  const overlapped = await attendanceStatsFor(member.id);
  check("overlapping leave does not inflate counts", overlapped?.total, 3);
  check("overlapping leave excluded count stable", overlapped?.excludedOnLeave, 3);

  await cleanup();
  console.log(failures === 0 ? "\nALL ATTENDANCE CHECKS PASSED" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  process.exit(1);
});
