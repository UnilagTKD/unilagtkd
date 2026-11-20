import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { isValidToken, storedToken } from "@/lib/tokens";
export async function getTrackedApplication(token: string) {
  if (!isValidToken(token)) return null;
  const [row] = await db.select({ id: applications.id, fullName: applications.fullName, status: applications.status, paymentStatus: applications.paymentStatus, semester: applications.semesterLabel, amount: applications.semesterDues, reviewNote: applications.paymentReviewNote }).from(applications).where(and(eq(applications.trackingTokenHash, storedToken(token)), gt(applications.trackingTokenExpires, new Date()))).limit(1);
  return row || null;
}
