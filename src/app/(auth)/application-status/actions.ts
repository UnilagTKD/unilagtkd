"use server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { isValidToken, storedToken } from "@/lib/tokens";
import { receiptImageSchema } from "@/lib/validation/admission";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { notifyReviewers } from "@/lib/notifications";
import { randomUUID } from "node:crypto";
export async function replaceAdmissionReceipt(token: string, receipt: string, reference: string) {
  if (!isValidToken(token) || !(await requestRateLimit("admission-receipt-replace", 5, 3600000)).allowed) return { ok: false, error: "This tracking link is invalid, expired, or temporarily unavailable." };
  const image = receiptImageSchema.safeParse(receipt);
  if (!image.success || typeof reference !== "string" || reference.trim().length < 3 || reference.length > 200) return { ok: false, error: "Upload a supported receipt under 1MB and enter its reference." };
  const result = await db.transaction(async tx => {
    const [application] = await tx.select({ id: applications.id, status: applications.status, paymentStatus: applications.paymentStatus }).from(applications).where(and(eq(applications.trackingTokenHash, storedToken(token)), gt(applications.trackingTokenExpires, new Date()))).for("update");
    if (!application || application.status !== "pending" || application.paymentStatus === "confirmed") return null;
    await tx.update(applications).set({ paymentReceiptData: receipt, paymentReference: reference.trim(), paymentStatus: "pending", paymentReviewNote: null, paymentReviewedAt: null, paymentReviewedBy: null }).where(eq(applications.id, application.id));
    return application;
  });
  if (!result) return { ok: false, error: "This application can no longer accept a replacement receipt." };
  await notifyReviewers(["admin"], `receipt-replaced-admin:${result.id}:${randomUUID()}`, "Registration receipt updated", "An applicant uploaded a replacement payment receipt for verification.", "/dashboard/treasury/admissions");
  await notifyReviewers(["exco"], `receipt-replaced:${result.id}:${randomUUID()}`, "Registration receipt updated", "An applicant uploaded a replacement payment receipt for verification.", "/dashboard/treasury/admissions", undefined, true);
  return { ok: true };
}
