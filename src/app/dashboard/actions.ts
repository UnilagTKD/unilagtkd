"use server";
import { afterAccountAction } from "@/lib/action-notifications";
import { createPeriodSession, updatePeriodSession, deletePeriodSession, endPeriodSession, recordPeriodAttendance, checkInToPeriodSession } from "@/lib/attendance-session-operations";
import { lockAttendancePeriods } from "@/lib/attendance-periods";



import { revalidatePath, updateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/public-content";
import { eq, and, inArray, sql, isNull, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  applications,
  users,
  memberProfiles,
  medicalRecords,
  announcements,
  achievements,
  galleryItems,
  dues,
  insights,
  contactMessages,
  leaveRequests,
} from "@/db/schema";
import type { UserRole } from "@/types/next-auth";
import { MEMBER_ROLES, MEMBER_PAGE_ROLES } from "@/lib/roles";
import { requireExcoPermission } from "@/lib/session";
import {
  isExcoPosition,
  EXCO_POSITION_LABELS,
  excoPositionLimit,
  excoPositionIsFull,
  isLeaveReason,
  type ExcoPosition,
  type LeaveReason,
} from "@/lib/exco";
import {
  generateResetToken,
  resetTokenExpiry,
  storedToken,
} from "@/lib/tokens";
import { achievementContentSchema, galleryContentSchema, insightContentSchema } from "@/lib/validation/content";
import { slugify } from "@/lib/slugify";
import { nextReceiptNo, receiptNoTaken } from "@/lib/receipts";

import { sendApprovalEmail } from "@/lib/email";
import { hash } from "bcryptjs";
import { initialSurnamePassword, surnameSchema } from "@/lib/validation/surname";
import { getBaseUrl } from "@/lib/site-url";
import { validate, recordId, reviewNote, paymentReference, receiptNumber, paymentReportSchema, duesChargeSchema, trainingSessionSchema, announcementSchema, leaveRequestSchema } from "@/lib/validation/actions";
import { rateLimit } from "@/lib/shared-rate-limit";
import { securityLog } from "@/lib/security-log";

async function requireRole(allowed: UserRole[]) {
  const session = await auth();
  if (!session?.user || !allowed.includes(session.user.role)) {
    securityLog("authorization_denied");
    throw new Error("Not authorized");
  }
  if (!(await rateLimit(`dashboard-write:${session.user.id}`, 120, 60_000)).allowed) throw new Error("Too many requests. Please try again later.");
  return session.user;
}

/** Membership verification belongs to admin; leave approval belongs to coaches. */
async function requireApplicationReviewer() { return requireRole(["admin"]); }
async function requireLeaveReviewer() { return requireRole(["coach"]); }

// ---------- Applications (Admin) ----------

async function reviewApplicationCore(
  applicationId: string, decision: "approved" | "rejected", adminNotes?: string, approvedSurname?: string
) {
  const reviewer = await requireApplicationReviewer();
  validate(recordId, applicationId);
  adminNotes = validate(reviewNote, adminNotes);
  if (decision !== "approved" && decision !== "rejected") throw new Error("Choose a valid application decision.");
  const baseUrl = decision === "approved" ? await getBaseUrl() : "";
  const result = await db.transaction(async (tx) => {
    const [application] = await tx.select().from(applications)
      .where(eq(applications.id, applicationId)).for("update");
    if (!application || application.status !== "pending") throw new Error("Application not found or already reviewed.");
    if (decision === "rejected") {
      await tx.update(applications).set({ status: "rejected", adminNotes: adminNotes || null, reviewedBy: reviewer.id, reviewedAt: new Date() }).where(eq(applications.id, applicationId));
      return { approved: false, email: "", fullName: "" };
    }
    if (application.username) {
      const [taken] = await tx.select({ id: users.id }).from(users)
        .where(eq(sql`lower(${users.username})`, application.username.toLowerCase())).limit(1);
      if (taken) throw new Error("The requested username is already taken. Ask the applicant to choose another username.");
    }
    if (application.paymentStatus !== "confirmed" || !application.paymentReceiptData || !application.semesterDues || !application.semesterLabel || !application.paymentReviewedAt) throw new Error("An admin or treasurer must confirm the semester dues before this account can be approved.");
    const surname = validate(surnameSchema, approvedSurname ?? application.surname ?? application.fullName.trim().split(/\s+/)[0]);
    const passwordHash = await hash(initialSurnamePassword(surname), 12);
    const [newUser] = await tx.insert(users).values({ email: application.email, username: application.username || null, passwordHash,
      role: application.membershipCategory === "alumni" ? "alumni" : "student", status: "active" }).returning({ id: users.id });
    await tx.insert(memberProfiles).values({
      userId: newUser.id, fullName: application.fullName, surname, membershipCategory: application.membershipCategory,
      graduationYear: application.graduationYear, institution: application.institution, occupation: application.occupation,
      matricOrStaffNo: application.matricOrStaffNo, department: application.department, faculty: application.faculty,
      levelYear: application.levelYear, gender: application.gender, dob: application.dob, phone: application.phone,
      address: application.address, beltGrade: application.beltGrade, affiliatedClub: application.affiliatedClub,
      assignedSubCommitteeId: application.subCommitteePref1Id, avatarUrl: application.photoData,
    });
    await tx.insert(medicalRecords).values({
      userId: newUser.id, bloodGroup: application.bloodGroup, genotype: application.genotype,
      allergies: application.allergies, chronicConditions: application.chronicConditions, recentInjuries: application.recentInjuries,
      emergencyContactName: application.emergencyContactName, emergencyContactRelationship: application.emergencyContactRelationship,
      emergencyContactPhone: application.emergencyContactPhone, altPhone: application.altPhone,
    });
    await tx.insert(dues).values({ userId: newUser.id, periodLabel: `${application.semesterLabel} semester dues`.slice(0, 100), amount: application.semesterDues, paid: true, paidAt: application.paymentReviewedAt, recordedBy: application.paymentReviewedBy, paymentClaimed: true, paymentClaimedAt: application.createdAt, paymentReference: application.paymentReference });
    await tx.update(applications).set({ status: "approved", adminNotes: adminNotes || null, reviewedBy: reviewer.id,
      reviewedAt: new Date(), surname, setupToken: null, setupTokenExpires: null, userId: newUser.id,
      trackingTokenHash: null, trackingTokenExpires: null,
    }).where(eq(applications.id, applicationId));
    return { approved: true, email: application.email, fullName: application.fullName };
  });
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/verifications");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/exco");
  if (!result.approved) return { ok: true as const, setupLink: null };
  const email = await sendApprovalEmail(result.email, result.fullName, baseUrl + "/login");
  return { ok: true as const, setupLink: null, emailSent: email.ok, loginReady: true };
}

// ---------- User / role management (Admin) ----------

async function updateUserRoleCore(userId: string, role: UserRole) {
  const caller = await requireRole(["admin"]);
  validate(recordId, userId);
  if (userId === caller.id) {
    throw new Error("You cannot change your own role.");
  }
  const assignableRoles: UserRole[] = ["student", "coach", "exco", "alumni"];
  if (!assignableRoles.includes(role)) {
    throw new Error("That role cannot be assigned here.");
  }
  // An executive office only means something for exco members, so drop it
  // whenever someone is moved off the exco role.
  const updated = await db
    .update(users)
    .set({ role, ...(role === "exco" ? {} : { excoPosition: null }) })
    .where(and(eq(users.id, userId), ne(users.role, role))).returning({ id: users.id });
  securityLog("role_changed", { actorId: caller.id, targetId: userId });
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/admin");
  return { changed: updated.length > 0 };
}

/** Coaches may grant admin access to another active account. */
async function appointAdminCore(userId: string) {
  const caller = await requireRole(["coach"]);
  validate(recordId, userId);
  if (userId === caller.id) throw new Error("You cannot appoint yourself as admin.");
  const result = await db.transaction(async tx => {
    const [target] = await tx.select({ role: users.role, status: users.status }).from(users)
      .where(eq(users.id, userId)).for("update");
    if (!target || target.status !== "active") throw new Error("Choose an active registered account.");
    if (target.role === "admin") return { changed: false };
    // Keep an existing executive office when granting administration access.
    await tx.update(users).set({ role: "admin" }).where(eq(users.id, userId));
    return { changed: true };
  });
  if (result.changed) securityLog("admin_appointed", { actorId: caller.id, targetId: userId });
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/dashboard", "layout");
  return { ok: true as const, changed: result.changed };
}

async function updateExcoPositionCore(userId: string, position: ExcoPosition | null) {
  const caller = await requireRole(["admin", "coach"]);
  validate(recordId, userId);
  if (userId === caller.id) throw new Error("You cannot appoint yourself to an Exco office.");
  if (position !== null && !isExcoPosition(position)) throw new Error("Unknown Exco position.");
  const result = await db.transaction(async tx => {
    // Serialize appointments across all app instances, including simultaneous
    // changes by different coaches/admins. No schema migration is needed.
    await tx.execute(sql`select pg_advisory_xact_lock(20261117, 2)`);
    const [target] = await tx.select({ role: users.role, status: users.status, position: users.excoPosition }).from(users).where(eq(users.id,userId)).for("update");
    if (!target || (target.status !== "active" && position !== null)) return { ok: false as const, error: "Choose an active registered member." };
    if (target.role === "coach" || (target.role === "admin" && caller.role !== "admin")) return { ok: false as const, error: "You cannot change this account's office." };
    if (target.position === position) return { ok: true as const, changed: false, previousPosition: target.position, position, previousRole: target.role, role: target.role };
    if (position !== null) {
      // Inactive assignments still reserve a place until explicitly removed.
      const holders = await tx.select({ id: users.id }).from(users).where(eq(users.excoPosition, position)).limit(excoPositionLimit(position));
      if (excoPositionIsFull(position, holders.length, target.position)) return { ok: false as const, error: `${EXCO_POSITION_LABELS[position]} already has ${excoPositionLimit(position)} people assigned. Remove an existing appointment before adding another.` };
    }
    const role = position !== null && (target.role === "student" || target.role === "alumni") ? "exco" as const : target.role;
    await tx.update(users).set({ excoPosition: position, role }).where(eq(users.id,userId));
    return { ok: true as const, changed: true, previousPosition: target.position, position, previousRole: target.role, role };
  }, { isolationLevel: "read committed" });
  if (!result.ok || !result.changed) return result;
  revalidatePath("/dashboard", "layout");
  securityLog("exco_appointment_changed", { actorId: caller.id, targetId: userId });
  return result;
}

async function setUserStatusCore(userId: string, status: "active" | "inactive") {
  const caller = await requireRole(["admin"]);
  validate(recordId, userId);
  if (userId === caller.id) {
    throw new Error("You cannot change your own status.");
  }
  if (status !== "active" && status !== "inactive") {
    throw new Error("Unknown account status.");
  }
  const updated = await db.update(users).set({ status }).where(and(eq(users.id, userId), ne(users.status, status))).returning({ id: users.id });
  securityLog("account_status_changed", { actorId: caller.id, targetId: userId, outcome: status });
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/admin");
  return { changed: updated.length > 0 };
}

// ---------- Training sessions & attendance (coach) ----------

export async function createTrainingSession(data: {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}) {
  const user = await requireRole(["coach"]); data = validate(trainingSessionSchema, data);
await db.transaction(tx => createPeriodSession(tx, user.id, data), { isolationLevel: "read committed" }); revalidatePath("/dashboard", "layout");
}

export async function updateTrainingSession(
  sessionId: string,
  data: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
  }
) {
  await requireRole(["coach"]); validate(recordId, sessionId); data = validate(trainingSessionSchema, data);
await db.transaction(tx => updatePeriodSession(tx, sessionId, data), { isolationLevel: "read committed" }); revalidatePath("/dashboard", "layout");
}

export async function deleteTrainingSession(sessionId: string) {
  await requireRole(["coach"]); validate(recordId, sessionId);
await db.transaction(tx => deletePeriodSession(tx, sessionId), { isolationLevel: "read committed" }); revalidatePath("/dashboard", "layout");
}

/** Closes member check-in; coaches can still record and correct attendance. */
export async function endTrainingSession(sessionId: string) {
  await requireRole(["coach"]); validate(recordId, sessionId);
await db.transaction(tx => endPeriodSession(tx, sessionId), { isolationLevel: "read committed" }); revalidatePath("/dashboard", "layout");
}

export async function markAttendance(
  sessionId: string,
  entries: { userId: string; present: boolean }[]
) {
  const user = await requireRole(["coach"]); validate(recordId, sessionId);
if (!Array.isArray(entries) || entries.length > 1000 || entries.some(entry => !entry || !recordId.safeParse(entry.userId).success || typeof entry.present !== "boolean")) throw new Error("Provide valid attendance entries.");
const result = await db.transaction(tx => recordPeriodAttendance(tx, user.id, sessionId, entries), { isolationLevel: "read committed" });
revalidatePath("/dashboard", "layout"); return result;
}

/**
 * Self check-in via the QR code shown on the coach dashboard for today's
 * session. Only marks the caller during its 24-hour check-in window, and
 * only if they are actually on that session's register - the same
 * roster/leave/join-date rules `markAttendance` enforces for a coach.
 */
export async function selfCheckIn(sessionId: string) {
  const session = await auth(); if (!session?.user) throw new Error("Not authenticated"); validate(recordId, sessionId);
const result = await db.transaction(tx => checkInToPeriodSession(tx, session.user.id, sessionId), { isolationLevel: "read committed" });
revalidatePath("/dashboard", "layout"); return result;
}

// ---------- Announcements (exco: president / VP / general secretary) ----------

export async function createAnnouncement(data: {
  title: string;
  body: string;
  audience: "all" | "students" | "coaches" | "exco";
}) {
  const user = await requireExcoPermission("announcements:manage");
  data = validate(announcementSchema, data);
  await db.insert(announcements).values({
    title: data.title,
    body: data.body,
    audience: data.audience,
    createdBy: user.id,
  });
  revalidatePath("/dashboard/exco");
}

export async function deleteAnnouncement(id: string) {
  await requireExcoPermission("announcements:manage");
  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/dashboard/exco");
}

// ---------- Dues (exco: president / treasurer) ----------

// Sentinel the Treasurer's "Student" dropdown sends to charge every member at
// once instead of one person - kept in sync with dues-charge-form.tsx.
const ALL_MEMBERS = "__all__";

async function createDuesChargeCore(data: {
  userId: string;
  periodLabel: string;
  amount: string;
}) {
  await requireExcoPermission("dues:manage");
  data = validate(duesChargeSchema, data);
  const periodLabel = data.periodLabel;

  if (data.userId !== ALL_MEMBERS) {
    const [charge] = await db.insert(dues).values({
      userId: data.userId,
      periodLabel,
      amount: data.amount,
      paid: false,
    }).returning({ id: dues.id });
    revalidatePath("/dashboard", "layout");
    return { ok: true as const, charged: 1, skipped: 0, notificationChargeIds: [charge.id] };
  }

  // Charge every member (students, alumni, exco - coaches never pay dues),
  // skipping anyone who already has a charge under this exact period label so
  // a repeat click can't double-charge them.
  const members = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, [...MEMBER_ROLES]));

  const existing = await db
    .select({ userId: dues.userId })
    .from(dues)
    .where(eq(dues.periodLabel, periodLabel));
  const alreadyCharged = new Set(existing.map((e) => e.userId));

  const toCharge = members.filter((m) => !alreadyCharged.has(m.id));
  const notificationChargeIds: string[] = [];

  if (toCharge.length > 0) {
    const inserted = await db.insert(dues).values(
      toCharge.map((m) => ({
        userId: m.id,
        periodLabel,
        amount: data.amount,
        paid: false,
      }))
    ).returning({ id: dues.id });
    notificationChargeIds.push(...inserted.map(row => row.id));
  }

  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");

  return { ok: true as const, charged: toCharge.length, skipped: alreadyCharged.size, notificationChargeIds };
}

async function markDuesPaidCore(duesId: string, receiptNo?: string) {
  const user = await requireExcoPermission("dues:manage");
  validate(recordId, duesId);
  if (receiptNo) return issueReceipt(duesId, receiptNo);
  await db
    .update(dues)
    .set({ paid: true, paidAt: new Date(), recordedBy: user.id })
    .where(and(eq(dues.id, duesId), eq(dues.paid, false), isNull(dues.receiptNo)));
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

/** Declines a pending claim without removing the underlying unpaid charge. */
async function declinePaymentClaimCore(duesId: string, reason: string) {
  const reviewer = await requireExcoPermission("dues:manage");
  validate(recordId, duesId);
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000) throw new Error("Give a reason of 3 to 1,000 characters.");
  const [updated] = await db.update(dues).set({
    paymentClaimed: false, paymentClaimedAt: null,
    paymentDeclinedAt: new Date(), paymentDeclinedBy: reviewer.id, paymentDeclineReason: reason.trim(),
  }).where(and(eq(dues.id, duesId), eq(dues.paid, false), eq(dues.paymentClaimed, true), isNull(dues.receiptNo))).returning({ id: dues.id });
  if (!updated) throw new Error("This claim is no longer awaiting review. Refresh the payment list.");
  securityLog("payment_claim_declined", { actorId: reviewer.id, targetId: duesId });
  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}

export async function getPendingClaimsCount() {
  await requireExcoPermission("dues:view");
  const rows = await db
    .select({ id: dues.id })
    .from(dues)
    .where(and(eq(dues.paymentClaimed, true), eq(dues.paid, false)));
  return rows.length;
}

async function claimDuesPaymentCore(duesId: string, reference?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  validate(recordId, duesId);
  reference = validate(paymentReference, reference);
  if (!(await rateLimit(`payment-claim:${session.user.id}`, 20, 60 * 60_000)).allowed) throw new Error("Too many claims. Please try again later.");

  const [due] = await db
    .select({ userId: dues.userId, paid: dues.paid, paymentClaimed: dues.paymentClaimed })
    .from(dues)
    .where(eq(dues.id, duesId))
    .limit(1);

  if (!due || due.userId !== session.user.id) {
    throw new Error("Not authorized");
  }

  const [updated] = await db
    .update(dues)
    .set({
      paymentClaimed: true,
      paymentClaimedAt: new Date(),
      paymentReference: reference || null,
    })
    .where(and(eq(dues.id, duesId), eq(dues.userId, session.user.id), eq(dues.paid, false), eq(dues.paymentClaimed, false))).returning({ id: dues.id });
  if (!updated) throw new Error("This charge is already paid or has a claim awaiting review.");

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
  revalidatePath("/dashboard/exco");
}

/**
 * Self-reports a payment with no pre-existing charge to claim against - the
 * normal case, since members typically pay before the Treasurer raises an
 * official charge for them. Creates a dues row the same way a Treasurer-raised
 * charge would, already marked as claimed, so it shows up for confirmation
 * exactly like any other claim.
 */
async function reportPaymentCore(data: {
  periodLabel: string;
  amount: string;
  reference?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const allowed: UserRole[] = [...MEMBER_PAGE_ROLES];
  if (!allowed.includes(session.user.role)) {
    throw new Error("Not authorized");
  }
  data = validate(paymentReportSchema, data);
  if (!(await rateLimit(`payment-report:${session.user.id}`, 10, 60 * 60_000)).allowed) throw new Error("Too many reports. Please try again later.");
  const periodLabel = data.periodLabel;
  if (!periodLabel) {
    throw new Error("Tell us what this payment was for.");
  }

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount.");
  }

  await db.insert(dues).values({
    userId: session.user.id,
    periodLabel,
    amount: amount.toFixed(2),
    paid: false,
    paymentClaimed: true,
    paymentClaimedAt: new Date(),
    paymentReference: data.reference?.trim() || null,
  });

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
  revalidatePath("/dashboard/exco");

  return { ok: true as const };
}

async function requireContentEditor() {
  const session = await auth();
  if (session?.user.role === "admin") return session.user;
  return requireExcoPermission("content:manage");
}

// ---------- Achievements (Admin and authorized Exco) ----------

export async function createAchievement(data: {
  athleteName: string;
  matricNo?: string;
  sex?: string;
  course?: string;
  level?: string;
  medal: "gold" | "silver" | "bronze";
  competitionName: string;
  competitionDate: string;
  venue?: string;
}) {
  const user = await requireContentEditor();
  data = achievementContentSchema.parse(data);
  await db.insert(achievements).values({ ...data, createdBy: user.id });
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/achievements");
  revalidatePath("/");
}

export async function deleteAchievement(id: string) {
  await requireContentEditor();
  await db.delete(achievements).where(eq(achievements.id, id));
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/achievements");
}

// ---------- Gallery (Admin and authorized Exco) ----------

export async function createGalleryItem(data: {
  imageUrl: string;
  caption?: string;
  category: "training" | "demo" | "tournament";
}) {
  const user = await requireContentEditor();
  data = galleryContentSchema.parse(data);
  await db.insert(galleryItems).values({
    imageUrl: data.imageUrl,
    caption: data.caption || null,
    category: data.category,
    uploadedBy: user.id,
  });
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/gallery");

}

export async function deleteGalleryItem(id: string) {
  await requireContentEditor();
  await db.delete(galleryItems).where(eq(galleryItems.id, id));
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/gallery");
}

// ---------- Insights / Blog (Admin and authorized Exco) ----------

export async function createInsight(data: {
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string;
  category: "training" | "competition" | "club_news" | "wellness";
  authorName?: string;
}) {
  const user = await requireContentEditor();
  data = insightContentSchema.parse(data);

  const baseSlug = (slugify(data.title) || "post").slice(0, 230);
  let slug = baseSlug;
  let suffix = 1;
  while (
    (await db.select({ id: insights.id }).from(insights).where(eq(insights.slug, slug)).limit(1))
      .length > 0
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  await db.insert(insights).values({
    title: data.title,
    slug,
    excerpt: data.excerpt,
    body: data.body,
    coverImageUrl: data.coverImageUrl || null,
    category: data.category,
    authorName: data.authorName || null,
    createdBy: user.id,
  });

  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/insights");
}

export async function deleteInsight(id: string) {
  await requireContentEditor();
  await db.delete(insights).where(eq(insights.id, id));
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/insights");
}

export async function updateAchievement(id: string, data: Parameters<typeof createAchievement>[0]) {
  await requireContentEditor();
  data = achievementContentSchema.parse(data);
  await db.update(achievements).set(data).where(eq(achievements.id, id));
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/achievements");
}

export async function updateGalleryItem(id: string, data: Parameters<typeof createGalleryItem>[0]) {
  await requireContentEditor();
  data = galleryContentSchema.parse(data);
  await db.update(galleryItems).set(data).where(eq(galleryItems.id, id));
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/gallery");
}

export async function updateInsight(id: string, data: Parameters<typeof createInsight>[0]) {
  await requireContentEditor();
  data = insightContentSchema.parse(data);
  const [post] = await db.update(insights).set(data).where(eq(insights.id, id)).returning({ slug: insights.slug });
  if (!post) throw new Error("Post not found");
  updateTag(PUBLIC_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dashboard/admin/cms");
  revalidatePath("/dashboard/exco");
  revalidatePath("/insights");
  revalidatePath(`/insights/${post.slug}`);
}

// ---------- Contact messages ----------

export async function markMessageRead(id: string) {
  const session = await auth();
  if (!session?.user || !["coach", "admin"].includes(session.user.role)) {
    await requireExcoPermission("contact_messages:manage");
  }
  await db.update(contactMessages).set({ read: true }).where(eq(contactMessages.id, id));
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/messages");
}

export async function deleteContactMessage(id: string) {
  await requireExcoPermission("contact_messages:manage");
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/messages");
}

// ---------- Sub-committees (exco: president / VP) ----------

export async function assignSubCommittee(userId: string, subCommitteeId: string | null) {
  await requireExcoPermission("members:assign");

  const [profile] = await db
    .select({ id: memberProfiles.id })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    throw new Error("This member has no profile to assign");
  }

  await db
    .update(memberProfiles)
    .set({ assignedSubCommitteeId: subCommitteeId })
    .where(eq(memberProfiles.userId, userId));

  revalidatePath("/dashboard/exco");
}

// ---------- Leave requests ----------
// Members raise leave requests; coaches review them.

async function submitLeaveRequestCore(data: {
  reasonCategory: LeaveReason;
  startDate: string;
  endDate: string;
  details: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  data = validate(leaveRequestSchema, data);
  if (!(await rateLimit(`leave-request:${session.user.id}`, 10, 60 * 60_000)).allowed) throw new Error("Too many requests. Please try again later.");

  if (!isLeaveReason(data.reasonCategory)) {
    throw new Error("Select a valid reason");
  }
  if (!data.startDate || !data.endDate) {
    throw new Error("Start and end dates are required");
  }
  if (data.endDate < data.startDate) {
    throw new Error("The end date cannot fall before the start date");
  }
  if (data.details.trim().length < 5) {
    throw new Error("Add a short explanation for the request");
  }

  await db.insert(leaveRequests).values({
    userId: session.user.id,
    reasonCategory: data.reasonCategory,
    startDate: data.startDate,
    endDate: data.endDate,
    details: data.details.trim(),
  });

  revalidatePath("/dashboard/leave");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/exco");
}

export async function cancelLeaveRequest(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const [request] = await db
    .select({ userId: leaveRequests.userId, status: leaveRequests.status })
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);

  if (!request || request.userId !== session.user.id) {
    throw new Error("Not authorized");
  }
  if (request.status !== "pending") {
    throw new Error("Only a pending request can be withdrawn");
  }

  await db.update(leaveRequests).set({ status: "cancelled" }).where(and(eq(leaveRequests.id, id), eq(leaveRequests.userId, session.user.id), eq(leaveRequests.status, "pending")));

  revalidatePath("/dashboard/leave");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/exco");
}

async function reviewLeaveRequestCore(
  id: string,
  decision: "approved" | "rejected",
  reviewNotes?: string
) {
  const user = await requireLeaveReviewer();
  validate(recordId, id);
  reviewNotes = validate(reviewNote, reviewNotes);
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Choose a valid leave decision.");
  }
  await db.transaction(async tx => {
  await lockAttendancePeriods(tx);
  const [request] = await tx
    .select({ status: leaveRequests.status, userId: leaveRequests.userId })
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);

  if (!request) {
    throw new Error("Leave request not found");
  }
  if (request.userId === user.id) throw new Error("Another coach must review your own leave request.");
  if (request.status !== "pending") {
    throw new Error("This request has already been dealt with");
  }

  await tx
    .update(leaveRequests)
    .set({
      status: decision,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes?.trim() || null,
    })
    .where(and(eq(leaveRequests.id, id), eq(leaveRequests.status, "pending")));
  }, { isolationLevel: "read committed" });

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/leave");
}

// ---------- Account recovery verification (Admin) ----------

/**
 * Issues a password reset link for a member who has requested one.
 *
 * An admin hands this link over
 * directly after confirming the person is who they say they are. Verify
 * identity BEFORE generating - anyone holding this link can take over the
 * account.
 */
export async function issuePasswordResetLink(userId: string) {
  const admin = await requireRole(["admin"]);
  validate(recordId, userId);

  const [user] = await db
    .select({ id: users.id, resetRequestedAt: users.resetRequestedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { ok: false as const, error: "No such member." };
  }
  if (!user.resetRequestedAt) {
    return { ok: false as const, error: "This member has not requested a reset." };
  }

  const resetToken = generateResetToken();

  await db
    .update(users)
    .set({ resetToken: storedToken(resetToken), resetTokenExpires: resetTokenExpiry() })
    .where(eq(users.id, userId));
  securityLog("password_reset_link_issued", { actorId: admin.id, targetId: userId });

  revalidatePath("/dashboard/admin/verifications");

  return { ok: true as const, resetLink: `/reset-password?token=${resetToken}` };
}

/** Dismisses a reset request without issuing a link (e.g. identity not confirmed). */
export async function dismissPasswordResetRequest(userId: string) {
  await requireRole(["admin"]);

  await db
    .update(users)
    .set({ resetRequestedAt: null, resetToken: null, resetTokenExpires: null })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin/verifications");

  return { ok: true as const };
}

// ---------- Receipts (Treasurer) ----------

/**
 * What the Treasurer needs on screen to check a payment before issuing against
 * it, plus the receipt number that would be allocated.
 */
export async function getReceiptDraft(duesId: string) {
  const treasurer = await requireExcoPermission("dues:manage");

  const [row] = await db
    .select({
      id: dues.id,
      amount: dues.amount,
      periodLabel: dues.periodLabel,
      paid: dues.paid,
      receiptNo: dues.receiptNo,
      paymentClaimed: dues.paymentClaimed,
      paymentClaimedAt: dues.paymentClaimedAt,
      paymentReference: dues.paymentReference,
      memberName: memberProfiles.fullName,
      memberEmail: users.email,
    })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, dues.userId))
    .where(eq(dues.id, duesId))
    .limit(1);

  if (!row) throw new Error("No such charge");

  const [treasurerProfile] = await db
    .select({ signatureUrl: memberProfiles.signatureUrl })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, treasurer.id))
    .limit(1);

  return {
    ...row,
    suggestedReceiptNo: row.receiptNo ?? (await nextReceiptNo()),
    hasSignature: Boolean(treasurerProfile?.signatureUrl),
  };
}

/**
 * Confirms a payment and issues its receipt. This is the Treasurer verifying
 * that money actually arrived: a member claim and reference are evidence, not
 * proof, so this stays a deliberate human step.
 *
 * Requires the caller to already have a signature on file (Settings) - that
 * signature is what prints on the receipt, so there is nothing to check here
 * without it.
 *
 * Refuses to re-issue against a charge that already carries a receipt, because
 * a receipt number is a permanent record and must not silently change.
 */
async function issueReceiptCore(duesId: string, receiptNo?: string, claimVersion?: string | null) {
  const user = await requireExcoPermission("dues:manage");
  validate(recordId, duesId);
  receiptNo = validate(receiptNumber, receiptNo);
  if (claimVersion !== undefined && claimVersion !== null && (typeof claimVersion !== "string" || claimVersion.length > 40 || !Number.isFinite(Date.parse(claimVersion)))) throw new Error("Invalid claim version.");

  const [treasurerProfile] = await db
    .select({ signatureUrl: memberProfiles.signatureUrl })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id))
    .limit(1);

  if (!treasurerProfile?.signatureUrl) {
    return {
      ok: false as const,
      error: "Add your signature in Settings before issuing a receipt.",
    };
  }

  const [existing] = await db
    .select({ id: dues.id, receiptNo: dues.receiptNo, paid: dues.paid, paidAt: dues.paidAt, paymentClaimed: dues.paymentClaimed, paymentClaimedAt: dues.paymentClaimedAt })
    .from(dues)
    .where(eq(dues.id, duesId))
    .limit(1);

  if (!existing) return { ok: false as const, error: "No such charge." };
  if (existing.receiptNo) {
    return {
      ok: false as const,
      error: `A receipt (${existing.receiptNo}) has already been issued for this charge.`,
    };
  }

  if (claimVersion !== undefined && (existing.paymentClaimedAt?.toISOString() ?? null) !== claimVersion) return { ok: false as const, error: "This payment claim changed. Close and reopen it before issuing a receipt." };

  const number = (receiptNo ?? "").trim() || (await nextReceiptNo());

  if (await receiptNoTaken(number, duesId)) {
    return { ok: false as const, error: `Receipt number ${number} is already in use.` };
  }

  const [confirmed] = await db
    .update(dues)
    .set({ paid: true, paidAt: existing.paidAt || new Date(), receiptNo: number, recordedBy: user.id })
    .where(and(eq(dues.id, duesId), eq(dues.paid, existing.paid), isNull(dues.receiptNo),
      eq(dues.paymentClaimed, existing.paymentClaimed),
      existing.paymentClaimedAt ? eq(dues.paymentClaimedAt, existing.paymentClaimedAt) : isNull(dues.paymentClaimedAt)))
    .returning({ id: dues.id });
  if (!confirmed) return { ok: false as const, error: "This payment changed during review. Refresh and review it again." };
  securityLog("receipt_issued", { actorId: user.id, targetId: duesId });

  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
  revalidatePath("/dashboard/grading");

  return { ok: true as const, receiptNo: number };
}

export async function reviewApplication(...args: Parameters<typeof reviewApplicationCore>) {
  const result = await reviewApplicationCore(...args);
  await afterAccountAction("reviewApplication", args, result);
  return result;
}

export async function updateUserRole(...args: Parameters<typeof updateUserRoleCore>) {
  const result = await updateUserRoleCore(...args);
  await afterAccountAction("updateUserRole", args, result);
  return result;
}

export async function appointAdmin(...args: Parameters<typeof appointAdminCore>) {
  const result = await appointAdminCore(...args);
  await afterAccountAction("appointAdmin", args, result);
  return result;
}

export async function updateExcoPosition(...args: Parameters<typeof updateExcoPositionCore>) {
  const result = await updateExcoPositionCore(...args);
  await afterAccountAction("updateExcoPosition", args, result);
  return result;
}

export async function setUserStatus(...args: Parameters<typeof setUserStatusCore>) {
  const result = await setUserStatusCore(...args);
  await afterAccountAction("setUserStatus", args, result);
  return result;
}

export async function createDuesCharge(...args: Parameters<typeof createDuesChargeCore>) {
  const result = await createDuesChargeCore(...args);
  await afterAccountAction("createDuesCharge", args, result);
  return result;
}

export async function markDuesPaid(...args: Parameters<typeof markDuesPaidCore>) {
  const result = await markDuesPaidCore(...args);
  await afterAccountAction("markDuesPaid", args, result);
  return result;
}

export async function declinePaymentClaim(...args: Parameters<typeof declinePaymentClaimCore>) {
  const result = await declinePaymentClaimCore(...args);
  await afterAccountAction("declinePaymentClaim", args, result);
  return result;
}

export async function claimDuesPayment(...args: Parameters<typeof claimDuesPaymentCore>) {
  const result = await claimDuesPaymentCore(...args);
  await afterAccountAction("claimDuesPayment", args, result);
  return result;
}

export async function reportPayment(...args: Parameters<typeof reportPaymentCore>) {
  const result = await reportPaymentCore(...args);
  await afterAccountAction("reportPayment", args, result);
  return result;
}

export async function submitLeaveRequest(...args: Parameters<typeof submitLeaveRequestCore>) {
  const result = await submitLeaveRequestCore(...args);
  await afterAccountAction("submitLeaveRequest", args, result);
  return result;
}

export async function reviewLeaveRequest(...args: Parameters<typeof reviewLeaveRequestCore>) {
  const result = await reviewLeaveRequestCore(...args);
  await afterAccountAction("reviewLeaveRequest", args, result);
  return result;
}

export async function issueReceipt(...args: Parameters<typeof issueReceiptCore>) {
  const result = await issueReceiptCore(...args);
  await afterAccountAction("issueReceipt", args, result);
  return result;
}
