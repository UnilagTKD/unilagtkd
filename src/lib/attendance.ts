// How a member's attendance record is counted.
//
// Two rules decide whether a training session counts toward someone's
// attendance percentage. Both work the same way: a session that does not count
// is removed from *both* halves of the fraction. It is not an absence, and it
// is not a free pass either - it simply is not part of their record.
//
//   1. Sessions before they joined. A session held before someone had an
//      account is not one they could have attended. This is not hypothetical:
//      marking a back-dated session marks the whole current roster, including
//      members who joined last week, so without the cut-off a brand-new member
//      can be sitting at 40% before their first training.
//
//   2. Sessions during approved leave. Leave that the Welfare Officer approved
//      is the club agreeing the member should not be training. Counting those
//      nights as absences would mean the club penalising someone for a decision
//      it made itself - and would quietly push an injured member below the
//      grading threshold while they recover.
//
// Only *approved* leave excludes. A pending request protects nothing until it
// is reviewed, and a rejected or cancelled one never did.
//
// Pure module: no database, no React. `@/lib/attendance-data` runs the queries.

import { dayNumber, toDateInput } from "@/lib/dates";
import { ATTENDANCE_THRESHOLDS } from "@/lib/constants";

/**
 * The day a member's attendance starts counting: the day their account was
 * created, which is the day the portal became available to them.
 */
export function attendanceCountsFrom(joinedAt: Date | string): string {
  return typeof joinedAt === "string" ? joinedAt.slice(0, 10) : toDateInput(joinedAt);
}

export type LeavePeriod = { startDate: string; endDate: string };

/** True when `sessionDate` falls inside an approved leave period, inclusive. */
export function isOnLeave(sessionDate: string, leave: LeavePeriod[]): boolean {
  const day = dayNumber(sessionDate);
  return leave.some((l) => day >= dayNumber(l.startDate) && day <= dayNumber(l.endDate));
}

/** Whether a session counts toward this member's attendance. */
export function sessionCounts(
  sessionDate: string,
  joinedAt: Date | string,
  approvedLeave: LeavePeriod[] = []
): boolean {
  if (dayNumber(sessionDate) < dayNumber(attendanceCountsFrom(joinedAt))) return false;
  return !isOnLeave(sessionDate, approvedLeave);
}

export type AttendanceStats = {
  periodId?: string;
  periodName?: string;
  /** Sessions marked for the member that actually count. */
  total: number;
  present: number;
  /** Whole-percent attendance, or null when nothing counts yet. */
  pct: number | null;
  /** First day that counts, "YYYY-MM-DD". */
  countsFrom: string;
  /** Marks dropped for falling before the member joined. */
  excludedBeforeJoining: number;
  /** Marks dropped for falling inside approved leave. */
  excludedOnLeave: number;
};

export function buildStats(
  present: number,
  total: number,
  countsFrom: string,
  excludedBeforeJoining = 0,
  excludedOnLeave = 0
): AttendanceStats {
  return {
    total,
    present,
    pct: total > 0 ? Math.round((present / total) * 100) : null,
    countsFrom,
    excludedBeforeJoining,
    excludedOnLeave,
  };
}

/**
 * Below this many counting sessions, a percentage is not yet a fair reading of
 * someone's commitment - one session attended is 100%, one missed is 0%.
 *
 * This blocks nothing on its own; time-in-grade already stops a brand-new
 * member grading. It tells the dashboard when to show a percentage as
 * provisional rather than as a verdict.
 */
export const MIN_SESSIONS_FOR_MEANINGFUL_PCT = 4;

export function isProvisional(stats: AttendanceStats): boolean {
  return stats.total > 0 && stats.total < MIN_SESSIONS_FOR_MEANINGFUL_PCT;
}

/** Short human phrase for a member's attendance, safe when there is no data. */
export function describeAttendance(stats: AttendanceStats): string {
  if (stats.total === 0) {
    return stats.excludedOnLeave > 0
      ? "no countable sessions yet - all of them fall inside approved leave"
      : `no sessions counted since ${stats.countsFrom}${stats.periodName ? ` in ${stats.periodName}` : ""}`;
  }
  const base = `${stats.pct}% (${stats.present}/${stats.total})`;
  return isProvisional(stats) ? `${base}, provisional` : base;
}

/** Why a member's record is shorter than the club's session count, if it is. */
export function explainExclusions(stats: AttendanceStats): string | null {
  const parts: string[] = [];
  if (stats.excludedBeforeJoining > 0) {
    parts.push(
      `${stats.excludedBeforeJoining} before joining on ${stats.countsFrom}`
    );
  }
  if (stats.excludedOnLeave > 0) {
    parts.push(`${stats.excludedOnLeave} during approved leave`);
  }
  return parts.length > 0 ? `Not counted: ${parts.join(", ")}.` : null;
}

/** Whether the record clears the club's promotional-grading attendance bar. */
export function meetsGradingThreshold(stats: AttendanceStats): boolean {
  return stats.total > 0 && (stats.pct ?? 0) >= ATTENDANCE_THRESHOLDS.promotionalGrading;
}
