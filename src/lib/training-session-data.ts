import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { trainingSessions } from "@/db/schema";
import { activePeriodSession } from "@/lib/attendance-periods";
// Time-based closure is enforced on every check-in. Persist the effective end
// when sessions are read so no scheduler or open browser is required.
export async function expireTrainingSessions(sessionId?: string) {
  const deadline = sql`((${trainingSessions.date} + coalesce(nullif(${trainingSessions.startTime}, '')::time, time '00:00')) at time zone 'Africa/Lagos') + interval '24 hours'`;
  await db.update(trainingSessions).set({ endedAt: deadline }).where(and(
    isNull(trainingSessions.endedAt), lte(deadline, sql`now()`),
    activePeriodSession(),
    sessionId ? eq(trainingSessions.id, sessionId) : undefined,
  ));
}
