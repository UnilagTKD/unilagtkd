"use server";
import { afterAccountAction } from "@/lib/action-notifications";

import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { applications, users } from "@/db/schema";
import { applicationSchema } from "@/lib/validation/application";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { verifyBotProtection } from "@/lib/bot-protection";
import { securityLog } from "@/lib/security-log";
import { memberAge } from "@/lib/members";
import { getSemesterDues } from "@/lib/semester-dues";
import { generateResetToken, storedToken } from "@/lib/tokens";

export type SubmitApplicationResult =
  | { ok: true; applicationId: string; trackingLink: string }
  | { ok: false; error: string };

async function submitApplicationCore(
  input: unknown,
  protection?: unknown
): Promise<SubmitApplicationResult> {
  // Public, unauthenticated form - bound how many pending applications one
  // source can flood the review queue with.
  const { allowed } = await requestRateLimit("application", 5, 60 * 60_000);
  if (!allowed) {
    return { ok: false, error: "Too many submissions from this connection. Please try again later." };
  }

  if (!(await verifyBotProtection(protection, "register"))) return { ok: false, error: "Please complete the form verification and try again." };
  const parsed = applicationSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Please check the form for errors and try again." };
  }

  const data = parsed.data;
  const semester = await getSemesterDues();
  if (semester.label !== data.semesterLabel) return { ok: false, error: "The semester details changed. Refresh the form before submitting your payment." };
  const trackingToken = generateResetToken();
  const isMinor = data.isMinor || (memberAge(data.dob) ?? 0) < 18;

  try {
    if (data.username) {
      const [taken] = await db.select({ id: users.id }).from(users)
        .where(eq(sql`lower(${users.username})`, data.username)).limit(1);
      if (taken) return { ok: false, error: "That username is already taken. Choose another username." };
    }
    const [row] = await db
      .insert(applications)
      .values({
        semesterLabel: semester.label,
        graduationYear: data.graduationYear || null,
        institution: data.institution || null,
        occupation: data.occupation || null,
        semesterDues: semester.amount,
        paymentReceiptData: data.paymentReceiptData,
        paymentReference: data.paymentReference,
        paymentStatus: "pending",
        trackingTokenHash: storedToken(trackingToken),
        trackingTokenExpires: new Date(Date.now() + 30 * 86400000),
        membershipCategory: data.membershipCategory,
        photoData: data.photoData,
        fullName: data.fullName,
        surname: data.surname,
        username: data.username || null,
        matricOrStaffNo: data.matricOrStaffNo || null,
        utmeJambNo: data.utmeJambNo || null,
        department: data.department,
        faculty: data.faculty,
        levelYear: data.levelYear || null,
        gender: data.gender,
        dob: data.dob,
        phone: data.phone,
        email: data.email.toLowerCase().trim(),
        address: data.address,
        bloodGroup: data.bloodGroup || null,
        genotype: data.genotype || null,
        allergies: data.allergies || null,
        chronicConditions: data.chronicConditions || null,
        recentInjuries: data.recentInjuries || null,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelationship: data.emergencyContactRelationship,
        emergencyContactPhone: data.emergencyContactPhone,
        altPhone: data.altPhone || null,
        priorTraining: data.priorTraining,
        beltGrade: data.beltGrade || null,
        affiliatedClub: data.affiliatedClub || null,
        subCommitteePref1Id: data.subCommitteePref1Id,
        subCommitteePref2Id: data.subCommitteePref2Id,
        subCommitteePref3Id: data.subCommitteePref3Id,
        statementOfPurpose: data.statementOfPurpose,
        waiverRiskAck: data.waiverRiskAck,
        waiverReleaseAck: data.waiverReleaseAck,
        waiverMedicalAck: data.waiverMedicalAck,
        waiverMediaConsent: data.waiverMediaConsent,
        waiverSignatureName: data.waiverSignatureName,
        waiverSignatureDate: data.waiverSignatureDate,
        guardianName: isMinor ? data.guardianName || null : null,
        guardianSignature: isMinor ? data.guardianSignature || null : null,
        status: "pending",
      })
      .returning({ id: applications.id });

    return { ok: true, applicationId: row.id, trackingLink: `/application-status?token=${trackingToken}` };
  } catch {
    securityLog("application_submit_failed");
    return { ok: false, error: "Something went wrong submitting your application. Please try again." };
  }
}

export async function submitApplication(...args: Parameters<typeof submitApplicationCore>) {
  const result = await submitApplicationCore(...args);
  await afterAccountAction("submitApplication", args, result);
  return result;
}
