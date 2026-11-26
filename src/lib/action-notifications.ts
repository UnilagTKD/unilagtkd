import "server-only";
import { randomUUID } from "node:crypto";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { applications, users, dues, leaveRequests, profileChangeRequests, gradingRequests, gradingCandidates, gradingEvents } from "@/db/schema";
import { notifyUser, notifyReviewers } from "@/lib/notifications";
import { securityLog } from "@/lib/security-log";
import { sendNotificationEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/site-url";
import { profileReviewStages } from "@/lib/verification-permissions";

/** Called only after the authorized business action resolves successfully. */
export async function afterAccountAction(name: string, args: unknown[], result: unknown) {
  if (result && typeof result === "object" && ((result as { ok?: boolean }).ok === false || (result as { changed?: boolean }).changed === false)) return;
  try {
    const session = await auth();
    const actorId = session?.user.id;
    const id = args[0] as string;
    const owner = async (userId: string, key: string, title: string, message: string, href: string, email = true) => {
      if (userId !== actorId) await notifyUser({ userId, eventKey: key, title, message, href, email });
    };
    if (["updateUserRole", "appointAdmin", "updateExcoPosition", "setUserStatus"].includes(name)) {
      const [account] = await db.select().from(users).where(eq(users.id, id));
      if (!account) return;
      const message = name === "setUserStatus" ? `Your account is now ${account.status}.` : name === "updateExcoPosition" ? `Your executive appointment is now ${account.excoPosition?.replaceAll("_", " ") || "unassigned"}. Your account role is ${account.role}.` : `Your account role is now ${account.role}.`;
      await owner(id, `${name}:${id}:${randomUUID()}`, "Account access updated", message, "/dashboard");
    } else if (name === "reviewApplication") {
      const [application] = await db.select().from(applications).where(eq(applications.id, id));
      if (application?.status === "approved" && application.userId) await notifyUser({ userId: application.userId, eventKey: `application:${id}:approved`, title: "Membership approved", message: "Your membership is approved. Welcome to the member portal.", href: "/dashboard", email: false, emailState: (result as { emailSent?: boolean }).emailSent ? "sent" : "failed" }); // The existing approval email contains login instructions.
      else if (application?.status === "rejected") await sendNotificationEmail(application.email, "Membership application update", "Your membership application was not approved. Please contact the club if you need assistance.", `${await getBaseUrl()}/login`, `notification/application-rejected/${id}`);
    } else if (["reviewLeaveRequest", "reviewProfileChange"].includes(name)) {
      const [request] = name === "reviewLeaveRequest" ? await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)) : await db.select().from(profileChangeRequests).where(eq(profileChangeRequests.id, id));
      if (!request || request.status === "pending") return;
      const leave = name === "reviewLeaveRequest";
      await owner(request.userId, `${name}:${id}:${request.status}`, leave ? "Leave request reviewed" : "Profile changes reviewed", `Your ${leave ? "leave request" : "profile change request"} has been ${request.status}. Open the portal for details.`, leave ? "/dashboard/leave" : "/dashboard/settings");
    } else if (name === "createDuesCharge") {
      const ids = (result as { notificationChargeIds: string[] }).notificationChargeIds;
      if (!ids?.length) return;
      const charges = await db.select().from(dues).where(inArray(dues.id, ids));
      for (const charge of charges) await owner(charge.userId, `charge:${charge.id}`, "New payment charge", `A charge of NGN ${charge.amount} for ${charge.periodLabel} has been added to your account.`, "/dashboard/payments");
    } else if (["markDuesPaid", "issueReceipt", "declinePaymentClaim"].includes(name)) {
      const [payment] = await db.select().from(dues).where(eq(dues.id, id));
      if (!payment) return;
      if (name === "declinePaymentClaim") await owner(payment.userId, `payment-declined:${id}:${payment.paymentDeclinedAt?.toISOString()}`, "Payment claim declined", "Your payment claim was declined. Review the reason in Payments before resubmitting.", "/dashboard/payments");
      else if (payment.paid) await owner(payment.userId, `payment:${id}:${payment.receiptNo ? "receipt" : "confirmed"}`, payment.receiptNo ? "Payment receipt issued" : "Payment confirmed", `Your payment of NGN ${payment.amount} for ${payment.periodLabel} has been confirmed.${payment.receiptNo ? " Your receipt is available in the portal." : ""}`, payment.receiptNo ? `/dashboard/receipts/${id}` : "/dashboard/payments");
    } else if (["acceptGradingRequest", "declineGradingRequest"].includes(name)) {
      const requestId = name === "acceptGradingRequest" ? (args[0] as { requestId: string }).requestId : id;
      const [request] = await db.select().from(gradingRequests).where(eq(gradingRequests.id, requestId));
      if (request && request.status !== "pending") await owner(request.userId, `grading-request:${request.id}:${request.status}`, "Grading request reviewed", `Your grading request has been ${request.status}. Check the portal for details and any payment required.`, "/dashboard/grading");
    } else if (name === "publishGrading") {
      const [event] = await db.select().from(gradingEvents).where(eq(gradingEvents.id, id));
      if (event?.status !== "published") return;
      const candidates = await db.select().from(gradingCandidates).where(eq(gradingCandidates.gradingId, id));
      for (const candidate of candidates) await owner(candidate.userId, `grading-result:${id}`, "Grading results published", `Results for ${event.title} are available. Sign in to view your result and belt record.`, "/dashboard/grading");
    } else if (["submitApplication", "submitLeaveRequest", "updateOwnProfile", "requestGrading", "reportPayment", "claimDuesPayment", "submitContactMessage"].includes(name)) {
      const eventKey = `${name}:${randomUUID()}`;
      if (name === "submitContactMessage") await notifyReviewers(["admin", "coach"], eventKey, "Contact message received", "A new website contact message is available in your inbox.", "/dashboard/messages", actorId);
      if (name === "submitApplication") {
        await notifyReviewers(["exco", "admin"], eventKey, "Registration receipt received", "A new applicant's semester payment receipt is awaiting verification.", "/dashboard/treasury/admissions", actorId, true);
        await notifyReviewers(["admin"], eventKey, "Registration receipt received", "A new applicant's semester payment receipt is awaiting verification.", "/dashboard/treasury/admissions", actorId);
        const submitted = result as { applicationId: string; trackingLink: string };
        const [application] = await db.select({ email: applications.email }).from(applications).where(eq(applications.id, submitted.applicationId));
        if (application) await sendNotificationEmail(application.email, "Membership application received", "Your application and semester payment receipt have been received. Payment verification by admin or treasurer is followed by admin approval. Keep this private tracking link to check progress or replace a declined receipt. The link expires in 30 days.", new URL(submitted.trackingLink, await getBaseUrl()).href, `notification/admission-received/${submitted.applicationId}`);
      }
      if (name === "submitLeaveRequest") await notifyReviewers(["coach"], eventKey, "Leave request received", "A member has submitted a leave request for review.", "/dashboard/coach", actorId);
      if (name === "updateOwnProfile") {
        const reviewers = await db.select({ id: users.id, role: users.role, position: users.excoPosition })
          .from(users).where(and(eq(users.status, "active"), inArray(users.role, ["admin", "coach", "exco"])));
        for (const reviewer of reviewers) {
          if (reviewer.id !== actorId && profileReviewStages(reviewer.role, reviewer.position).length) {
            await notifyUser({ userId: reviewer.id, eventKey, title: "Profile changes awaiting review", message: "A member has requested a profile update.", href: "/dashboard/verifications" });
          }
        }
      }
      if (name === "requestGrading") await notifyReviewers(["coach"], eventKey, "Grading request received", "A new grading request is awaiting review.", "/dashboard/coach/grading", actorId);
      if (name === "reportPayment" || name === "claimDuesPayment") await notifyReviewers(["exco", "admin"], eventKey, "Payment claim received", "A member has submitted a payment claim. Verify the transfer before confirming it.", "/dashboard/exco", actorId, true);
    }
  } catch { securityLog("action_notification_failed"); }
}
