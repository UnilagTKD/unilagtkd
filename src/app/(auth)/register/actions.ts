"use server";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { applicationSchema } from "@/lib/validation/application";

export type SubmitApplicationResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

export async function submitApplication(
  input: unknown
): Promise<SubmitApplicationResult> {
  const parsed = applicationSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Please check the form for errors and try again." };
  }

  const data = parsed.data;

  try {
    const [row] = await db
      .insert(applications)
      .values({
        membershipCategory: data.membershipCategory,
        photoData: data.photoData,
        fullName: data.fullName,
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
        guardianName: data.isMinor ? data.guardianName || null : null,
        guardianSignature: data.isMinor ? data.guardianSignature || null : null,
        status: "pending",
      })
      .returning({ id: applications.id });

    return { ok: true, applicationId: row.id };
  } catch (err) {
    console.error("Failed to submit application", err);
    return { ok: false, error: "Something went wrong submitting your application. Please try again." };
  }
}
