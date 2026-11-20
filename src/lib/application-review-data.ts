import "server-only";
import { applications } from "@/db/schema";

// Recovery tokens, internal links, and unused medical fields never enter props.
export const applicationReviewColumns = {
  graduationYear: applications.graduationYear, institution: applications.institution, occupation: applications.occupation,
  paymentStatus: applications.paymentStatus, semesterLabel: applications.semesterLabel, semesterDues: applications.semesterDues,
  id: applications.id, status: applications.status, createdAt: applications.createdAt, fullName: applications.fullName, surname: applications.surname,
  photoData: applications.photoData, membershipCategory: applications.membershipCategory,
  department: applications.department, email: applications.email,
  matricOrStaffNo: applications.matricOrStaffNo, phone: applications.phone,
  faculty: applications.faculty, levelYear: applications.levelYear,
  priorTraining: applications.priorTraining, beltGrade: applications.beltGrade,
  emergencyContactName: applications.emergencyContactName,
  emergencyContactRelationship: applications.emergencyContactRelationship,
  emergencyContactPhone: applications.emergencyContactPhone,
  bloodGroup: applications.bloodGroup, genotype: applications.genotype,
  statementOfPurpose: applications.statementOfPurpose,
};
export type ApplicationReviewData = Pick<typeof applications.$inferSelect, keyof typeof applicationReviewColumns>;
