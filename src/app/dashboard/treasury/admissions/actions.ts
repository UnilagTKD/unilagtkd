"use server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, clubSettings } from "@/db/schema";
import { requireAdmissionPaymentReviewer } from "@/lib/session";
import { validate, recordId } from "@/lib/validation/actions";
import { revalidatePath } from "next/cache";
import { sendNotificationEmail } from "@/lib/email";
import { notifyReviewers } from "@/lib/notifications";
import { getBaseUrl } from "@/lib/site-url";

export async function saveSemesterLabel(form: FormData) {
  await requireAdmissionPaymentReviewer();
  const label = String(form.get("label") || "").trim();
  if (!label || label.length > 150) throw new Error("Enter the semester name (up to 150 characters).");
  await db.insert(clubSettings).values({ key: "semester-dues", value: { label } }).onConflictDoUpdate({ target: clubSettings.key, set: { value: { label } } });
  revalidatePath("/register"); revalidatePath("/dashboard/treasury/admissions");
}

export async function reviewAdmissionPayment(applicationId: string, decision: "confirmed" | "declined", note = "") {
  const reviewer = await requireAdmissionPaymentReviewer();
  validate(recordId, applicationId);
  if (!["confirmed", "declined"].includes(decision) || typeof note !== "string" || note.length > 1000 || (decision === "declined" && note.trim().length < 3)) throw new Error("Choose a valid decision and give a reason when declining.");
  const application = await db.transaction(async tx => {
    const [row] = await tx.select().from(applications).where(eq(applications.id, applicationId)).for("update");
    if (!row || row.status !== "pending" || row.paymentStatus !== "pending" || !row.paymentReceiptData || !row.semesterDues) throw new Error("This receipt is not awaiting review. Refresh the list.");
    const reviewedAt = new Date();
    await tx.update(applications).set({ paymentStatus: decision, paymentReviewedBy: reviewer.id, paymentReviewedAt: reviewedAt, paymentReviewNote: note.trim() || null }).where(and(eq(applications.id, applicationId), eq(applications.status, "pending"), isNull(applications.userId)));
    return { ...row, paymentReviewedAt: reviewedAt };
  });
  revalidatePath("/dashboard", "layout");
  if (decision === "confirmed") await notifyReviewers(["admin"], `admission-payment:${applicationId}:confirmed`, "Semester dues confirmed", "An authorized reviewer confirmed an applicant's semester payment. The application is ready for admin review.", "/dashboard/admin/verifications", reviewer.id);
  await sendNotificationEmail(application.email, decision === "confirmed" ? "Semester dues confirmed" : "Semester payment needs attention", decision === "confirmed" ? "Your semester dues have been confirmed. Your account application is now awaiting admin approval." : "Your payment could not be confirmed. Open your application tracking link from the submission email to view the reason and upload a corrected receipt.", `${await getBaseUrl()}/login`, `notification/admission-review/${applicationId}/${decision}/${application.paymentReviewedAt.getTime()}`);
  return { ok: true as const };
}
