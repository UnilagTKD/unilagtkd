import { z } from "zod";
import { MEMBERSHIP_CATEGORIES } from "./academic";
export const profileSchema = z.object({
  levelYear: z.string().trim().max(20),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(2000),
  beltGrade: z.string().trim().max(50),
  membershipCategory: z.enum(MEMBERSHIP_CATEGORIES).optional(),
  matricOrStaffNo: z.string().trim().max(100).optional(),
  department: z.string().trim().max(150).optional(),
  faculty: z.string().trim().max(150).optional(),
  graduationYear: z.string().trim().max(4).optional(),
  institution: z.string().trim().max(200).optional(),
  occupation: z.string().trim().max(150).optional(),
}).strict();
export type ProfileInput = z.infer<typeof profileSchema>;
export const PROFILE_FIELD_LABELS: Record<keyof ProfileInput, string> = {
  levelYear: "Level / Year", phone: "Phone Number", address: "Residential Address", beltGrade: "Current Belt / Grade",
  membershipCategory: "Membership category", matricOrStaffNo: "Matriculation / Staff number", department: "Department / Course / Unit", faculty: "Faculty", graduationYear: "Graduation year", institution: "Institution / Organisation", occupation: "Occupation / Activity",
};
