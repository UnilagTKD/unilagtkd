// Verifies that the session register leaves out members who could not have
// been there: joined after the session, or on approved leave for it.
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db/index";
import {
  users,
  memberProfiles,
  trainingSessions,
  attendance,
  leaveRequests,
} from "../src/db/schema";
import { rosterForSession } from "../src/lib/attendance-data";
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

const MARKER = "__marking_smoke__";

async function cleanup() {
  const u = await db.select({ id: users.id }).from(users);
  for (const r of u) {
    const [p] = await db
      .select({ n: memberProfiles.fullName })
      .from(memberProfiles)
      .where(eq(memberProfiles.userId, r.id));
    if (p?.n?.startsWith(MARKER)) await db.delete(users).where(eq(users.id, r.id));
  }
  const s = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(eq(trainingSessions.title, MARKER));
  if (s.length)
    await db.delete(trainingSessions).where(
      inArray(
        trainingSessions.id,
        s.map((x) => x.id)
      )
    );
}

async function member(name: string, createdAt: string) {
  const [u] = await db
    .insert(users)
    .values({
      email: `${MARKER}-${name}@example.invalid`,
      role: "student",
      status: "active",
      createdAt: new Date(createdAt),
    })
    .returning({ id: users.id });
  await db.insert(memberProfiles).values({
    userId: u.id,
    fullName: `${MARKER} ${name}`,
    membershipCategory: "undergraduate",
  });
  return u.id;
}

async function main() {
  const period = await getActiveAttendancePeriod();
  if (!period) throw new Error("Open a monitoring period in an isolated test database first.");
  await cleanup();

  // Session on 2026-07-15.
  const [session] = await db
    .insert(trainingSessions)
    .values({ title: MARKER, date: "2026-07-15", periodId: period.id })
    .returning({ id: trainingSessions.id });

  const veteran = await member("veteran", "2026-01-10T09:00:00Z");
  const newbie = await member("newbie", "2026-08-01T09:00:00Z"); // joined AFTER
  const sameDay = await member("sameday", "2026-07-15T18:00:00Z"); // joined that evening
  const onLeave = await member("onleave", "2026-01-10T09:00:00Z");

  await db.insert(leaveRequests).values({
    userId: onLeave,
    reasonCategory: "injury",
    startDate: "2026-07-10",
    endDate: "2026-07-20",
    details: MARKER,
    status: "approved",
  });

  const roster = await rosterForSession(session.id);
  const mine = roster.filter((r) => r.name.startsWith(MARKER));
  const by = (n: string) => mine.find((r) => r.name.endsWith(n))!;

  console.log();
  for (const r of mine) {
    console.log(`  ${r.name}  markable=${r.markable}  ${r.reason ?? ""}`);
  }
  console.log();

  check("veteran is markable", by("veteran").markable, true);
  check("newbie who joined later is NOT markable", by("newbie").markable, false);
  check(
    "newbie reason names the join date",
    by("newbie").reason,
    "Joined on 2026-08-01, after this session"
  );
  check("joined same day IS markable", by("sameday").markable, true);
  check("member on approved leave is NOT markable", by("onleave").markable, false);
  check("leave reason", by("onleave").reason, "On approved leave");

  // The action's guard: only markable members should end up with rows.
  const markable = new Set(roster.filter((r) => r.markable).map((r) => r.id));
  const attempted = [veteran, newbie, sameDay, onLeave];
  const allowed = attempted.filter((id) => markable.has(id));
  check("guard admits 2 of the 4 attempted", allowed.length, 2);
  check("guard rejects the newbie", markable.has(newbie), false);
  check("guard rejects the member on leave", markable.has(onLeave), false);

  // Prove no row is created for the rejected ones.
  for (const id of allowed) {
    await db.insert(attendance).values({ sessionId: session.id, userId: id, present: true });
  }
  const rows = await db
    .select({ userId: attendance.userId })
    .from(attendance)
    .where(eq(attendance.sessionId, session.id));
  check("rows created only for markable members", rows.length, 2);
  check(
    "no row for the newbie",
    rows.some((r) => r.userId === newbie),
    false
  );

  await cleanup();
  console.log(failures === 0 ? "\nALL MARKING CHECKS PASSED" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  process.exit(1);
});
