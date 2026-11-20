export const MEMBERSHIP_CATEGORIES = ["undergraduate", "postgraduate", "alumni", "non_student", "staff"] as const;
export type MembershipCategory = typeof MEMBERSHIP_CATEGORIES[number];
export const ACADEMIC_FIELDS = ["membershipCategory", "matricOrStaffNo", "department", "faculty", "levelYear", "graduationYear", "institution", "occupation"] as const;
export function academicInfoError(data: Partial<Record<typeof ACADEMIC_FIELDS[number], string | null>>) {
  const category = data.membershipCategory;
  if (!MEMBERSHIP_CATEGORIES.includes(category as MembershipCategory)) return "Select a membership category.";
  const has = (key: typeof ACADEMIC_FIELDS[number], minimum = 2) => (data[key]?.trim().length || 0) >= minimum;
  if (category === "undergraduate" || category === "postgraduate") {
    if (!has("matricOrStaffNo", 3) || !has("department") || !has("faculty") || !has("levelYear", 1)) return "Students must provide their matriculation number, department/course, faculty, and current level/year.";
  } else if (category === "alumni") {
    const year = Number(data.graduationYear);
    const currentYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Africa/Lagos" }).format(new Date()));
    if (!has("matricOrStaffNo", 3) || !has("department") || !has("faculty") || !/^\d{4}$/.test(data.graduationYear || "") || year < 1900 || year > currentYear) return "Alumni must provide their former matriculation number, department/course, faculty, and a valid graduation year.";
  } else if (category === "staff") {
    if (!has("matricOrStaffNo", 3) || !has("department") || !has("institution")) return "Staff must provide their staff number, department/unit, and institution.";
  } else if (!has("occupation")) return "Non-students must provide their current occupation or activity.";
  return null;
}
