import type { UserRole } from "@/types/next-auth";
import type { ProfileInput } from "@/lib/validation/profile";
export function canAppointExco(role: UserRole): boolean { return role === "admin" || role === "coach"; }
export function canReviewProfileChange(role: UserRole, changes: Partial<ProfileInput>): boolean {
  if (role === "admin") return true;
  const fields = Object.keys(changes);
  return role === "coach" && fields.length > 0 && fields.every(field => field === "beltGrade");
}
