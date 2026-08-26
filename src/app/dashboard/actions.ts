"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  applications,
  users,
  memberProfiles,
  medicalRecords,
  trainingSessions,
  attendance,
  announcements,
  achievements,
  galleryItems,
  dues,
  insights,
  contactMessages,
  leaveRequests,
} from "@/db/schema";
import type { UserRole } from "@/types/next-auth";
import { requireExcoPermission } from "@/lib/session";
import {
  excoPermissions,
  isExcoPosition,
  isLeaveReason,
  type ExcoPosition,
  type LeaveReason,
} from "@/lib/exco";
import {
  generateSetupToken,
  setupTokenExpiry,
  generateResetToken,
  resetTokenExpiry,
} from "@/lib/tokens";
import { slugify } from "@/lib/slugify";
import { nextReceiptNo, receiptNoTaken } from "@/lib/receipts";
import { rosterForSession } from "@/lib/attendance-data";

async function requireRole(allowed: UserRole[]) {
  const session = await auth();
  if (!session?.user || !allowed.includes(session.user.role)) {
    throw new Error("Not authorized");
  }
  return session.user;
}

/** Admin, any coach, or the exco officer (Secretary) holding applications:manage. */
async function requireApplicationReviewer() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorized");
  if (session.user.role === "admin" || session.user.role === "coach") {
    return session.user;
  }
  if (session.user.role === "exco") {
    const [row] = await db
      .select({ excoPosition: users.excoPosition })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (excoPermissions("exco", row?.excoPosition ?? null).includes("applications:manage")) {
      return session.user;
    }
  }
  throw new Error("Not authorized");
}

// ---------- Applications (admin, coaches, exco Secretary) ----------

export async function reviewApplication(
  applicationId: string,
  decision: "approved" | "rejected",
  adminNotes?: string
) {
  const user = await requireApplicationReviewer();

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!application || application.status !== "pending") {
    throw new Error("Application not found or already reviewed");
  }

  if (decision === "rejected") {
    await db
      .update(applications)
      .set({
        status: "rejected",
        adminNotes: adminNotes || null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/coach");
    revalidatePath("/dashboard/exco");
    return { ok: true as const, setupLink: null };
  }

  const [newUser] = await db
    .insert(users)
    .values({
      email: application.email,
      role: application.membershipCategory === "alumni" ? "alumni" : "student",
      status: "active",
    })
    .returning();

  await db.insert(memberProfiles).values({
    userId: newUser.id,
    fullName: application.fullName,
    membershipCategory: application.membershipCategory,
    matricOrStaffNo: application.matricOrStaffNo,
    department: application.department,
    faculty: application.faculty,
    levelYear: application.levelYear,
    gender: application.gender,
    dob: application.dob,
    phone: application.phone,
    address: application.address,
    beltGrade: application.beltGrade,
    affiliatedClub: application.affiliatedClub,
    assignedSubCommitteeId: application.subCommitteePref1Id,
    avatarUrl: application.photoData,
  });

  await db.insert(medicalRecords).values({
    userId: newUser.id,
    bloodGroup: application.bloodGroup,
    genotype: application.genotype,
    allergies: application.allergies,
    chronicConditions: application.chronicConditions,
    recentInjuries: application.recentInjuries,
    emergencyContactName: application.emergencyContactName,
    emergencyContactRelationship: application.emergencyContactRelationship,
    emergencyContactPhone: application.emergencyContactPhone,
    altPhone: application.altPhone,
  });

  const setupToken = generateSetupToken();

  await db
    .update(applications)
    .set({
      status: "approved",
      adminNotes: adminNotes || null,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      setupToken,
      setupTokenExpires: setupTokenExpiry(),
      userId: newUser.id,
    })
    .where(eq(applications.id, applicationId));

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/exco");
  return { ok: true as const, setupLink: `/setup-account?token=${setupToken}` };
}

// ---------- User / role management (admin) ----------

export async function updateUserRole(userId: string, role: UserRole) {
  await requireRole(["admin"]);
  // An executive office only means something for exco members, so drop it
  // whenever someone is moved off the exco role.
  await db
    .update(users)
    .set({ role, ...(role === "exco" ? {} : { excoPosition: null }) })
    .where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/exco");
}

export async function updateExcoPosition(userId: string, position: ExcoPosition | null) {
  await requireRole(["admin"]);

  if (position !== null && !isExcoPosition(position)) {
    throw new Error("Unknown exco position");
  }

  await db.update(users).set({ excoPosition: position }).where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/exco");
}

export async function setUserStatus(userId: string, status: "active" | "inactive") {
  await requireRole(["admin"]);
  await db.update(users).set({ status }).where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
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
  const user = await requireRole(["coach", "admin"]);
  await db.insert(trainingSessions).values({
    title: data.title,
    date: data.date,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    location: data.location || null,
    description: data.description || null,
    createdBy: user.id,
  });
  revalidatePath("/dashboard/coach");
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
  await requireRole(["coach", "admin"]);
  await db
    .update(trainingSessions)
    .set({
      title: data.title,
      date: data.date,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      location: data.location || null,
      description: data.description || null,
    })
    .where(eq(trainingSessions.id, sessionId));
  revalidatePath("/dashboard/coach");
}

export async function deleteTrainingSession(sessionId: string) {
  await requireRole(["coach", "admin"]);
  await db.delete(trainingSessions).where(eq(trainingSessions.id, sessionId));
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/coach/attendance");
}

export async function markAttendance(
  sessionId: string,
  entries: { userId: string; present: boolean }[]
) {
  const user = await requireRole(["coach", "admin"]);

  // A member who joined after this session, or who was on approved leave for
  // it, is not on its register. The marking page already leaves them out, but
  // this action is reachable by direct POST, so the rule is enforced here too -
  // and this is the rule's real home: it stops the rows being created at all,
  // rather than leaving the counts to discard them later.
  const roster = await rosterForSession(sessionId);
  const markable = new Set(roster.filter((r) => r.markable).map((r) => r.id));
  const skipped = entries.filter((e) => !markable.has(e.userId)).length;

  for (const entry of entries.filter((e) => markable.has(e.userId))) {
    const [existing] = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(eq(attendance.sessionId, sessionId), eq(attendance.userId, entry.userId))
      )
      .limit(1);

    if (existing) {
      await db
        .update(attendance)
        .set({ present: entry.present, markedBy: user.id, markedAt: new Date() })
        .where(eq(attendance.id, existing.id));
    } else {
      await db.insert(attendance).values({
        sessionId,
        userId: entry.userId,
        present: entry.present,
        markedBy: user.id,
      });
    }
  }

  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/coach/attendance");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");

  return { marked: entries.length - skipped, skipped };
}

// ---------- Announcements (exco: president / VP / general secretary, admin) ----------

export async function createAnnouncement(data: {
  title: string;
  body: string;
  audience: "all" | "students" | "coaches" | "exco";
}) {
  const user = await requireExcoPermission("announcements:manage");
  await db.insert(announcements).values({
    title: data.title,
    body: data.body,
    audience: data.audience,
    createdBy: user.id,
  });
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/admin");
}

export async function deleteAnnouncement(id: string) {
  await requireExcoPermission("announcements:manage");
  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/admin");
}

// ---------- Dues (exco: president / treasurer, admin) ----------

export async function createDuesCharge(data: {
  userId: string;
  periodLabel: string;
  amount: string;
}) {
  await requireExcoPermission("dues:manage");
  await db.insert(dues).values({
    userId: data.userId,
    periodLabel: data.periodLabel,
    amount: data.amount,
    paid: false,
  });
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/admin");
}

export async function markDuesPaid(duesId: string, receiptNo?: string) {
  const user = await requireExcoPermission("dues:manage");
  await db
    .update(dues)
    .set({ paid: true, paidAt: new Date(), receiptNo: receiptNo || null, recordedBy: user.id })
    .where(eq(dues.id, duesId));
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

export async function getPendingClaimsCount() {
  await requireExcoPermission("dues:view");
  const rows = await db
    .select({ id: dues.id })
    .from(dues)
    .where(and(eq(dues.paymentClaimed, true), eq(dues.paid, false)));
  return rows.length;
}

export async function claimDuesPayment(duesId: string, reference?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const [due] = await db
    .select({ userId: dues.userId })
    .from(dues)
    .where(eq(dues.id, duesId))
    .limit(1);

  if (!due || due.userId !== session.user.id) {
    throw new Error("Not authorized");
  }

  await db
    .update(dues)
    .set({
      paymentClaimed: true,
      paymentClaimedAt: new Date(),
      paymentReference: reference || null,
    })
    .where(eq(dues.id, duesId));

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/admin");
}

// ---------- Achievements (admin) ----------

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
  const user = await requireRole(["admin"]);
  await db.insert(achievements).values({ ...data, createdBy: user.id });
  revalidatePath("/dashboard/admin");
  revalidatePath("/achievements");
  revalidatePath("/");
}

export async function deleteAchievement(id: string) {
  await requireRole(["admin"]);
  await db.delete(achievements).where(eq(achievements.id, id));
  revalidatePath("/dashboard/admin");
  revalidatePath("/achievements");
}

// ---------- Gallery (admin) ----------

export async function createGalleryItem(data: {
  imageUrl: string;
  caption?: string;
  category: "training" | "demo" | "tournament";
}) {
  const user = await requireRole(["admin"]);
  await db.insert(galleryItems).values({
    imageUrl: data.imageUrl,
    caption: data.caption || null,
    category: data.category,
    uploadedBy: user.id,
  });
  revalidatePath("/dashboard/admin");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function deleteGalleryItem(id: string) {
  await requireRole(["admin"]);
  await db.delete(galleryItems).where(eq(galleryItems.id, id));
  revalidatePath("/dashboard/admin");
  revalidatePath("/gallery");
}

// ---------- Insights / Blog (admin) ----------

export async function createInsight(data: {
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string;
  category: "training" | "competition" | "club_news" | "wellness";
  authorName?: string;
}) {
  const user = await requireRole(["admin"]);

  const baseSlug = slugify(data.title) || "post";
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

  revalidatePath("/dashboard/admin");
  revalidatePath("/insights");
}

export async function deleteInsight(id: string) {
  await requireRole(["admin"]);
  await db.delete(insights).where(eq(insights.id, id));
  revalidatePath("/dashboard/admin");
  revalidatePath("/insights");
}

// ---------- Contact messages (admin) ----------

export async function markMessageRead(id: string) {
  await requireRole(["admin"]);
  await db.update(contactMessages).set({ read: true }).where(eq(contactMessages.id, id));
  revalidatePath("/dashboard/admin");
}

export async function deleteContactMessage(id: string) {
  await requireRole(["admin"]);
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
  revalidatePath("/dashboard/admin");
}

// ---------- Sub-committees (exco: president / VP, admin) ----------

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
  revalidatePath("/dashboard/admin");
}

// ---------- Leave requests ----------
// Members raise them; the Welfare Officer (or President) reviews them.

export async function submitLeaveRequest(data: {
  reasonCategory: LeaveReason;
  startDate: string;
  endDate: string;
  details: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

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

  await db.update(leaveRequests).set({ status: "cancelled" }).where(eq(leaveRequests.id, id));

  revalidatePath("/dashboard/leave");
  revalidatePath("/dashboard/exco");
}

export async function reviewLeaveRequest(
  id: string,
  decision: "approved" | "rejected",
  reviewNotes?: string
) {
  const user = await requireExcoPermission("leave:review");

  const [request] = await db
    .select({ status: leaveRequests.status })
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);

  if (!request) {
    throw new Error("Leave request not found");
  }
  if (request.status !== "pending") {
    throw new Error("This request has already been dealt with");
  }

  await db
    .update(leaveRequests)
    .set({
      status: decision,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes?.trim() || null,
    })
    .where(eq(leaveRequests.id, id));

  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/leave");
}

// ---------- Password resets (admin) ----------

/**
 * Issues a password reset link for a member who has requested one.
 *
 * The club has no outbound email, so the admin hands this link over directly
 * after confirming the person is who they say they are. Verify identity BEFORE
 * generating - anyone holding this link can take over the account.
 */
export async function issuePasswordResetLink(userId: string) {
  await requireRole(["admin"]);

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
    .set({ resetToken, resetTokenExpires: resetTokenExpiry() })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin");

  return { ok: true as const, resetLink: `/reset-password?token=${resetToken}` };
}

/** Dismisses a reset request without issuing a link (e.g. identity not confirmed). */
export async function dismissPasswordResetRequest(userId: string) {
  await requireRole(["admin"]);

  await db
    .update(users)
    .set({ resetRequestedAt: null, resetToken: null, resetTokenExpires: null })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin");

  return { ok: true as const };
}

// ---------- Receipts (Treasurer) ----------

/**
 * What the Treasurer needs on screen to check a payment before issuing against
 * it, plus the receipt number that would be allocated.
 */
export async function getReceiptDraft(duesId: string) {
  await requireExcoPermission("dues:manage");

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

  return { ...row, suggestedReceiptNo: row.receiptNo ?? (await nextReceiptNo()) };
}

/**
 * Confirms a payment and issues its receipt. This is the Treasurer verifying
 * that money actually arrived: a member claim and reference are evidence, not
 * proof, so this stays a deliberate human step.
 *
 * Refuses to re-issue against a charge that already carries a receipt, because
 * a receipt number is a permanent record and must not silently change.
 */
export async function issueReceipt(duesId: string, receiptNo?: string) {
  const user = await requireExcoPermission("dues:manage");

  const [existing] = await db
    .select({ id: dues.id, receiptNo: dues.receiptNo, paid: dues.paid })
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

  const number = (receiptNo ?? "").trim() || (await nextReceiptNo());

  if (await receiptNoTaken(number, duesId)) {
    return { ok: false as const, error: `Receipt number ${number} is already in use.` };
  }

  await db
    .update(dues)
    .set({ paid: true, paidAt: new Date(), receiptNo: number, recordedBy: user.id })
    .where(eq(dues.id, duesId));

  revalidatePath("/dashboard/exco");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
  revalidatePath("/dashboard/grading");

  return { ok: true as const, receiptNo: number };
}
