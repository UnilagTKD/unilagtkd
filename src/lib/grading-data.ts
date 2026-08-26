import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, memberProfiles, dues, gradingWindows } from "@/db/schema";
import {
  gradingWindowState,
  resolveRank,
  type EligibilityInput,
  type GradingWindowState,
} from "@/lib/grading";
import { attendanceStatsFor } from "@/lib/attendance-data";
import type { AttendanceStats } from "@/lib/attendance";

// Read helpers shared by the grading pages and the grading server actions.
//
// These deliberately live outside the `"use server"` action file: every export
// of such a file becomes a POST-callable endpoint, and a reader that takes an
// arbitrary user id has no business being one. Callers here are already inside
// a page or an action that has checked the caller's role.

export type EligibilityContext = Omit<EligibilityInput, "target"> & {
  fullName: string;
  rankInferred: boolean;
  /** Full attendance breakdown, including what was excluded and why. */
  attendance?: AttendanceStats;
};

/** The most recent grading window and where it stands today. */
export async function getGradingWindow(): Promise<{
  state: GradingWindowState;
  note: string | null;
}> {
  const [window] = await db
    .select()
    .from(gradingWindows)
    .orderBy(desc(gradingWindows.openedAt))
    .limit(1);

  return {
    state: gradingWindowState(window ?? null),
    note: window?.note ?? null,
  };
}

/**
 * Gathers everything `checkEligibility` needs for one member: their rank as
 * recorded, their attendance, and unpaid dues.
 *
 * Attendance comes from `@/lib/attendance-data`, which excludes sessions held
 * before the member joined and sessions inside approved leave - see the rules
 * in `@/lib/attendance`.
 *
 * Always read fresh rather than trusted from a form, so a candidate cannot be
 * entered on stale numbers.
 */
export async function loadEligibilityContext(
  userId: string
): Promise<EligibilityContext | null> {
  const [member] = await db
    .select({
      status: users.status,
      joinedAt: users.createdAt,
      fullName: memberProfiles.fullName,
      email: users.email,
      beltGrade: memberProfiles.beltGrade,
      rankAttainedAt: memberProfiles.rankAttainedAt,
    })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!member) return null;

  const [stats, [duesRow]] = await Promise.all([
    attendanceStatsFor(userId),
    db
      .select({ outstanding: sql<number>`count(${dues.id})`.mapWith(Number) })
      .from(dues)
      .where(and(eq(dues.userId, userId), eq(dues.paid, false))),
  ]);

  const resolved = resolveRank(member.beltGrade);

  return {
    fullName: member.fullName ?? member.email,
    currentRank: resolved.rank,
    rankInferred: resolved.inferred,
    status: member.status,
    sessionsRecorded: stats?.total ?? 0,
    attendancePct: stats?.pct ?? null,
    attendanceCountsFrom: stats?.countsFrom,
    attendance: stats ?? undefined,
    outstandingDues: duesRow?.outstanding ?? 0,
    rankAttainedAt: member.rankAttainedAt,
    joinedAt: member.joinedAt,
  };
}
