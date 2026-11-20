import { z } from "zod";
import { isSafeImageReference } from "./image";
import { lagosToday, memberAge } from "@/lib/members";
import { surnameSchema } from "./surname";
import { receiptImageSchema } from "./admission";
import { MEMBERSHIP_CATEGORIES, academicInfoError } from "./academic";

export const applicationSchema = z.object({
  semesterLabel: z.string().trim().min(1).max(150),
  paymentReceiptData: receiptImageSchema,
  paymentReference: z.string().trim().min(3, "Enter the payment reference").max(200),
  // 1. Membership category
  membershipCategory: z.enum(MEMBERSHIP_CATEGORIES, {
    error: "Select a membership category",
  }),

  // Passport photograph (base64 data URL, set client-side after file selection)
  photoData: z.string().min(1, "A passport photograph is required").max(2_800_000).refine(isSafeImageReference, "Choose a supported image under 2MB or an HTTPS photo URL."),

  // 2. Personal & academic profile
  username: z.string().trim().toLowerCase().regex(/^$|^[a-z0-9_]{3,30}$/, "Use 3-30 letters, numbers, or underscores").optional(),
  fullName: z.string().trim().min(2, "Full name is required").max(255),
  surname: surnameSchema,
  matricOrStaffNo: z.string().trim().max(100).optional(),
  utmeJambNo: z.string().trim().max(100).optional(),
  department: z.string().trim().max(150),
  faculty: z.string().trim().max(150),
  graduationYear: z.string().trim().max(4).optional(),
  institution: z.string().trim().max(200).optional(),
  occupation: z.string().trim().max(150).optional(),
  levelYear: z.string().trim().max(20).optional(),
  gender: z.enum(["Male", "Female"], { error: "Select a gender" }),
  dob: z.string().date("Enter a valid date of birth").refine((value) => value <= lagosToday() && value >= "1900-01-01", "Enter a valid date of birth"),
  phone: z.string().trim().min(7, "Phone number is required").max(30),
  email: z.string().trim().email("Enter a valid email").max(255),
  address: z.string().trim().min(5, "Residential address is required").max(2000),

  // 3. Medical history
  bloodGroup: z.string().trim().max(10).optional(),
  genotype: z.string().trim().max(10).optional(),
  allergies: z.string().trim().max(5000).optional(),
  chronicConditions: z.string().trim().max(5000).optional(),
  recentInjuries: z.string().trim().max(5000).optional(),
  emergencyContactName: z.string().trim().min(2, "Emergency contact name is required").max(255),
  emergencyContactRelationship: z.string().trim().min(2, "Relationship is required").max(100),
  emergencyContactPhone: z.string().trim().min(7, "Emergency contact phone is required").max(30),
  altPhone: z.string().trim().max(30).optional(),

  // 4. Martial arts experience & structural commitments
  priorTraining: z.boolean(),
  beltGrade: z.string().trim().max(50).optional(),
  affiliatedClub: z.string().trim().max(255).optional(),
  subCommitteePref1Id: z.string().uuid("Select your first preference"),
  subCommitteePref2Id: z.string().uuid("Select your second preference"),
  subCommitteePref3Id: z.string().uuid("Select your third preference"),

  // 5. Statement of purpose
  statementOfPurpose: z.string().trim().min(20, "Please write at least a few sentences").max(10000),

  // 6. Waiver acknowledgements (UTC-W01)
  waiverRiskAck: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge the assumption of risk",
  }),
  waiverReleaseAck: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge the waiver & release",
  }),
  waiverMedicalAck: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge the medical declaration",
  }),
  waiverMediaConsent: z.boolean(),
  waiverSignatureName: z.string().trim().min(2, "Type your full name as signature").max(255),
  waiverSignatureDate: z.string().date("Enter a valid date"),
  isMinor: z.boolean(),
  guardianName: z.string().trim().max(255).optional(),
  guardianSignature: z.string().trim().max(255).optional(),
}).refine(
  (data) => !(data.isMinor || (memberAge(data.dob) ?? 0) < 18) || Boolean(data.guardianName && data.guardianSignature),
  {
    message: "Parent/guardian name and signature are required for applicants under 18",
    path: ["guardianSignature"],
  }
).superRefine((data, context) => {
  const error = academicInfoError(data);
  if (error) context.addIssue({ code: "custom", message: error, path: ["membershipCategory"] });
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
