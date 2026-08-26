import { z } from "zod";

export const applicationSchema = z.object({
  // 1. Membership category
  membershipCategory: z.enum(["undergraduate", "postgraduate", "alumni", "non_student"], {
    required_error: "Select a membership category",
  }),

  // Passport photograph (base64 data URL, set client-side after file selection)
  photoData: z.string().min(1, "A passport photograph is required"),

  // 2. Personal & academic profile
  fullName: z.string().min(2, "Full name is required"),
  matricOrStaffNo: z.string().optional(),
  utmeJambNo: z.string().optional(),
  department: z.string().min(2, "Department is required"),
  faculty: z.string().min(2, "Faculty is required"),
  levelYear: z.string().optional(),
  gender: z.enum(["Male", "Female"], { required_error: "Select a gender" }),
  dob: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  address: z.string().min(5, "Residential address is required"),

  // 3. Medical history
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  recentInjuries: z.string().optional(),
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactRelationship: z.string().min(2, "Relationship is required"),
  emergencyContactPhone: z.string().min(7, "Emergency contact phone is required"),
  altPhone: z.string().optional(),

  // 4. Martial arts experience & structural commitments
  priorTraining: z.boolean(),
  beltGrade: z.string().optional(),
  affiliatedClub: z.string().optional(),
  subCommitteePref1Id: z.string().uuid("Select your first preference"),
  subCommitteePref2Id: z.string().uuid("Select your second preference"),
  subCommitteePref3Id: z.string().uuid("Select your third preference"),

  // 5. Statement of purpose
  statementOfPurpose: z.string().min(20, "Please write at least a few sentences"),

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
  waiverSignatureName: z.string().min(2, "Type your full name as signature"),
  waiverSignatureDate: z.string().min(1, "Date is required"),
  isMinor: z.boolean(),
  guardianName: z.string().optional(),
  guardianSignature: z.string().optional(),
}).refine(
  (data) => !data.isMinor || (data.guardianName && data.guardianSignature),
  {
    message: "Parent/guardian name and signature are required for applicants under 18",
    path: ["guardianSignature"],
  }
);

export type ApplicationInput = z.infer<typeof applicationSchema>;
