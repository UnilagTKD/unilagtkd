"use server";
import { afterAccountAction } from "@/lib/action-notifications";

import { compare, hash } from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canReviewProfileChange } from "@/lib/verification-permissions";
import { canManageReceiptSignature } from "@/lib/exco";
import { requireExcoPermission } from "@/lib/session";
import { receiptSignatureSchema } from "@/lib/validation/receipt-signature";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, memberProfiles, profileChangeRequests } from "@/db/schema";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { RANKS } from "@/lib/grading";
import { BELT_SYSTEM } from "@/lib/constants";
import { passwordStrengthError } from "@/lib/password-strength";
import { sendPasswordChangedEmail } from "@/lib/email";
import { rateLimit } from "@/lib/shared-rate-limit";
import { securityLog } from "@/lib/security-log";
import { ACADEMIC_FIELDS, academicInfoError } from "@/lib/validation/academic";
import { updateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/public-content";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

async function updateOwnProfileCore(input: ProfileInput, confirmation?: { confirmed: boolean; reason: string }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return db.transaction(async (tx) => {
    const [profile] = await tx.select().from(memberProfiles).where(eq(memberProfiles.userId, user.id)).for("update");
    if (!profile) return { ok: false, error: "Member profile not found." };
    const [pending] = await tx.select({ id: profileChangeRequests.id }).from(profileChangeRequests)
      .where(and(eq(profileChangeRequests.userId, user.id), eq(profileChangeRequests.status, "pending"))).limit(1);
    if (pending) return { ok: false, error: "Your previous profile change is still awaiting approval." };
    const before: Partial<ProfileInput> = {}, proposed: Partial<ProfileInput> = {};
    for (const field of Object.keys(parsed.data) as (keyof ProfileInput)[]) {
      const value = parsed.data[field];
      if (value === undefined) continue;
      if (value !== (profile[field] ?? "")) { Object.assign(before, { [field]: profile[field] ?? "" }); Object.assign(proposed, { [field]: value }); }
    }
    if (!Object.keys(proposed).length) return { ok: false, error: "Make a change before submitting a request." };
    const academicChanged = ACADEMIC_FIELDS.some(field => field in proposed);
    if (academicChanged) {
      const error = academicInfoError({ ...profile, ...proposed });
      if (error) return { ok: false, error };
      if (!confirmation || confirmation.confirmed !== true || typeof confirmation.reason !== "string" || confirmation.reason.trim().length < 10 || confirmation.reason.length > 2000) return { ok: false, error: "Confirm your academic/membership details and explain the change in at least 10 characters." };
    }
    if ("beltGrade" in proposed && user.role === "coach" && !RANKS.some((r) => r.belt === "Black Belt" && proposed.beltGrade === `${r.belt} ${r.grade}`)) return { ok: false, error: "Coaches must choose Black Belt, 1st to 9th Dan." };
    if (proposed.beltGrade && !RANKS.some((r) => proposed.beltGrade === `${r.belt} ${r.grade}`) &&
      !BELT_SYSTEM.some((r) => proposed.beltGrade === `${r.belt} (${r.grade})`)) {
      return { ok: false, error: "Choose a current belt from the list." };
    }
    await tx.insert(profileChangeRequests).values({ userId: user.id, before, proposed, memberNote: academicChanged ? confirmation!.reason.trim() : null });
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  });
}

async function reviewProfileChangeCore(requestId: string, decision: "approved" | "rejected", note = ""): Promise<ActionResult> {
  const user = await requireUser();
  if (decision !== "approved" && decision !== "rejected") throw new Error("Invalid decision");
  if (typeof note !== "string" || note.length > 2000) throw new Error("Review notes must be 2,000 characters or fewer.");
  return db.transaction(async (tx) => {
    const [reviewer] = await tx.select().from(users).where(eq(users.id, user.id)).for("share");
    if (!reviewer || reviewer.status !== "active" || !(reviewer.role === "admin" || reviewer.role === "coach")) throw new Error("Not authorized");
    const [request] = await tx.select().from(profileChangeRequests).where(eq(profileChangeRequests.id, requestId)).for("update");
    if (!request || request.status !== "pending") return { ok: false, error: "This request has already been reviewed or no longer exists." };
    if (!canReviewProfileChange(reviewer.role, request.proposed)) throw new Error("Only admin may verify level and contact changes. Coaches may review belt-only changes.");
    if (request.userId === user.id) return { ok: false, error: "Another reviewer must approve your own profile changes." };
    if (decision === "approved") {
      const changes = profileSchema.partial().safeParse(request.proposed);
      if (!changes.success || !Object.keys(changes.data).length) throw new Error("Invalid profile changes");
      const [targetAccount] = await tx.select({ role: users.role }).from(users).where(eq(users.id, request.userId)).for("update");
      if (targetAccount?.role === "coach" && "beltGrade" in changes.data && !RANKS.some((rank) => rank.belt === "Black Belt" && changes.data.beltGrade === `${rank.belt} ${rank.grade}`)) return { ok: false, error: "A coach must have Black Belt, 1st to 9th Dan. Reject this request and ask for a new one." };
      const [profile] = await tx.select().from(memberProfiles).where(eq(memberProfiles.userId, request.userId)).for("update");
      if (!profile) return { ok: false, error: "Member profile no longer exists." };
      for (const field of Object.keys(changes.data) as (keyof ProfileInput)[]) {
        if ((profile[field] ?? "") !== request.before[field]) return { ok: false, error: "The member record changed since this request. Reject it and ask for a new request." };
      }
      if (ACADEMIC_FIELDS.some(field => field in changes.data)) {
        const error = academicInfoError({ ...profile, ...changes.data });
        if (error || !request.memberNote || request.memberNote.length < 10) return { ok: false, error: error || "The member must confirm the relevant information and reason for this change." };
      }
      await tx.update(memberProfiles).set(changes.data).where(eq(memberProfiles.userId, request.userId));
      if (changes.data.membershipCategory && targetAccount && ["student", "alumni"].includes(targetAccount.role)) {
        await tx.update(users).set({ role: changes.data.membershipCategory === "alumni" ? "alumni" : "student" }).where(eq(users.id, request.userId));
        updateTag(PUBLIC_CONTENT_TAG);
      }
    }
    await tx.update(profileChangeRequests).set({ status: decision, reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note.trim() || null })
      .where(eq(profileChangeRequests.id, requestId));
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  });
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (typeof currentPassword !== "string" || new TextEncoder().encode(currentPassword).length > 72) return { ok: false, error: "Current password is incorrect." };
  if (!(await rateLimit(`password-change:${user.id}`, 5, 15 * 60_000)).allowed) return { ok: false, error: "Too many attempts. Please try again later." };

  const strengthError = passwordStrengthError(newPassword);
  if (strengthError) {
    return { ok: false, error: strengthError };
  }

  const [row] = await db
    .select({ passwordHash: users.passwordHash, fullName: memberProfiles.fullName })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row?.passwordHash) {
    return { ok: false, error: "Account not found." };
  }

  const valid = await compare(currentPassword, row.passwordHash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const newHash = await hash(newPassword, 12);
  const [updated] = await db.update(users).set({ passwordHash: newHash, resetToken: null, resetTokenExpires: null, resetRequestedAt: null })
    .where(and(eq(users.id, user.id), eq(users.passwordHash, row.passwordHash))).returning({ id: users.id });
  if (!updated) return { ok: false, error: "Your password changed during this request. Please sign in again." };
  securityLog("password_changed", { actorId: user.id });

  if (user.email) {
    await sendPasswordChangedEmail(user.email, row.fullName ?? user.email);
  }

  return { ok: true };
}

/** Only the Treasurer maintains the receipt signature. */
export async function saveReceiptSignature(input: string): Promise<ActionResult> {
  const user = await requireExcoPermission("dues:manage");
  const [account] = await db.select({ role: users.role, position: users.excoPosition }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!account || !canManageReceiptSignature(account.role, account.position)) throw new Error("Only the Treasurer can upload a receipt signature.");
  const parsed = receiptSignatureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const [profile] = await db.update(memberProfiles).set({ signatureUrl: parsed.data })
    .where(eq(memberProfiles.userId, user.id)).returning({ id: memberProfiles.id });
  if (!profile) return { ok: false, error: "Your member profile could not be found." };
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/exco");
  return { ok: true };
}

export async function updateOwnProfile(...args: Parameters<typeof updateOwnProfileCore>) {
  const result = await updateOwnProfileCore(...args);
  await afterAccountAction("updateOwnProfile", args, result);
  return result;
}

export async function reviewProfileChange(...args: Parameters<typeof reviewProfileChangeCore>) {
  const result = await reviewProfileChangeCore(...args);
  await afterAccountAction("reviewProfileChange", args, result);
  return result;
}
