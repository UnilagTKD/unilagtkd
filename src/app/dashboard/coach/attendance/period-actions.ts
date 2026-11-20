"use server";
import { auth } from "@/auth";
import { db } from "@/db";
import { revalidatePath } from "next/cache";
import { AttendancePeriodError, startAttendancePeriod, endAttendancePeriod } from "@/lib/attendance-period-lifecycle";
import { securityLog } from "@/lib/security-log";
import { rateLimit } from "@/lib/shared-rate-limit";

async function coach() {
  const session = await auth();
  if (session?.user.role !== "coach") throw new Error("Not authorized.");
  if (!(await rateLimit(`attendance-period:${session.user.id}`, 20, 60_000)).allowed) throw new Error("Too many requests. Please try again later.");
  return session.user;
}
export async function openAttendancePeriod(input: unknown) {
  const user = await coach();
  try {
    const period = await db.transaction(tx => startAttendancePeriod(tx, user.id, input), { isolationLevel: "read committed" });
    revalidatePath("/dashboard", "layout");
    securityLog("attendance_period_opened", { actorId: user.id, targetId: period.id });
    return { ok: true as const, id: period.id };
  } catch (error) { return { ok: false as const, error: error instanceof AttendancePeriodError ? error.message : "Could not start this attendance period. Check the name and start date." }; }
}
export async function closeAttendancePeriod(periodId: string, endsOn: string) {
  const user = await coach();
  try {
    await db.transaction(tx => endAttendancePeriod(tx, user.id, periodId, endsOn), { isolationLevel: "read committed" });
    revalidatePath("/dashboard", "layout");
    securityLog("attendance_period_closed", { actorId: user.id, targetId: periodId });
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: error instanceof AttendancePeriodError ? error.message : "Could not close this attendance period." }; }
}
