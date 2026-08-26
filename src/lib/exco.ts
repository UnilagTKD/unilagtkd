import type { UserRole } from "@/types/next-auth";

// The executive offices defined in the club's Official Club Manual (2026 Issue).
export const EXCO_POSITIONS = [
  "president",
  "vice_president",
  "general_secretary",
  "treasurer",
  "welfare_officer",
] as const;

export type ExcoPosition = (typeof EXCO_POSITIONS)[number];

export const EXCO_POSITION_LABELS: Record<ExcoPosition, string> = {
  president: "President / Captain",
  vice_president: "Vice President / Deputy Captain",
  general_secretary: "General Secretary",
  treasurer: "Treasurer",
  welfare_officer: "Welfare Officer",
};

// Names the dashboard a post adds to an account, in the sidebar and as its
// heading, e.g. "Treasurer Dashboard" - so keep these short.
export const EXCO_POSITION_SHORT_LABELS: Record<ExcoPosition, string> = {
  president: "President",
  vice_president: "Vice President",
  general_secretary: "General Secretary",
  treasurer: "Treasurer",
  welfare_officer: "Welfare Officer",
};

// What each office is accountable for, shown at the top of their dashboard.
export const EXCO_POSITION_DUTIES: Record<ExcoPosition, string> = {
  president:
    "Administrative head of the club. Oversees every portfolio, posts club-wide announcements, and represents the club at the UNILAG Sports Council.",
  vice_president:
    "Deputises for the President and runs the sub-committees: assigning members, tracking committee strength, and following the intake pipeline.",
  general_secretary:
    "Custodian of club records and communication. Maintains the member register, issues announcements, reviews membership applications, manages user roles and password resets, handles contact messages, and publishes achievements, gallery, and insights content.",
  treasurer:
    "Runs the club purse: raises dues charges, confirms payments, and keeps the collection ledger balanced.",
  welfare_officer:
    "Leads athlete wellbeing: medical readiness, emergency contacts, leave requests, and first-aid logistics for training and travel.",
};

export type ExcoPermission =
  // Post and remove club announcements.
  | "announcements:manage"
  // See the dues ledger / raise charges and confirm payments.
  | "dues:view"
  | "dues:manage"
  // Follow the membership intake pipeline.
  | "applications:view"
  // Approve or reject applications, activating the account it produces.
  | "applications:manage"
  // Sub-committee rosters (every officer needs these).
  | "members:view"
  // The full member register: contact details, academics, belt grade.
  | "members:records"
  // Move members between sub-committees.
  | "members:assign"
  // Medical readiness and emergency contacts. Deliberately narrow.
  | "welfare:view"
  // Approve or decline requests to be excused from training.
  | "leave:review"
  // Change a member's role/exco office, and activate/deactivate accounts.
  | "members:manage_roles"
  // Issue or dismiss password reset requests.
  | "password_resets:manage"
  // Read and remove messages sent through the public contact form.
  | "contact_messages:manage"
  // Publish achievements, gallery photos, and insights/blog posts.
  | "content:manage";

// Every exco officer can at least see the sub-committee rosters and who else
// holds office; the rest is granted per portfolio.
const BASE_PERMISSIONS: ExcoPermission[] = ["members:view"];

const PERMISSIONS_BY_POSITION: Record<ExcoPosition, ExcoPermission[]> = {
  // Administrative head: every portfolio except the members' medical files,
  // which stay with the Welfare Officer.
  president: [
    "announcements:manage",
    "dues:view",
    "dues:manage",
    "applications:view",
    "members:view",
    "members:records",
    "members:assign",
    "leave:review",
  ],
  // Deputises for the President on everything except the purse, which stays
  // between the Treasurer and the President.
  vice_president: [
    "announcements:manage",
    "applications:view",
    "members:view",
    "members:assign",
  ],
  // Took on every duty the admin role used to hold, on top of its own.
  general_secretary: [
    "announcements:manage",
    "applications:view",
    "applications:manage",
    "members:view",
    "members:records",
    "members:manage_roles",
    "password_resets:manage",
    "contact_messages:manage",
    "content:manage",
  ],
  treasurer: ["dues:view", "dues:manage", "members:view"],
  welfare_officer: ["members:view", "welfare:view", "leave:review"],
};

export function isExcoPosition(value: unknown): value is ExcoPosition {
  return EXCO_POSITIONS.includes(value as ExcoPosition);
}

/**
 * Resolves what a user may do inside the exco dashboard. An exco member with
 * no office assigned yet falls back to the read-only base permissions.
 */
export function excoPermissions(
  role: UserRole,
  position: ExcoPosition | null
): ExcoPermission[] {
  if (role !== "exco") return [];

  return position ? PERMISSIONS_BY_POSITION[position] : BASE_PERMISSIONS;
}

export const LEAVE_REASONS = [
  "injury",
  "illness",
  "academics",
  "travel",
  "personal",
] as const;

export type LeaveReason = (typeof LEAVE_REASONS)[number];

export function isLeaveReason(value: unknown): value is LeaveReason {
  return LEAVE_REASONS.includes(value as LeaveReason);
}

export const LEAVE_REASON_LABELS: Record<LeaveReason, string> = {
  injury: "Injury",
  illness: "Illness",
  academics: "Academics / Exams",
  travel: "Travel",
  personal: "Personal",
};
