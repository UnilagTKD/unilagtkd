import type { UserRole } from "@/types/next-auth";
import type { ExcoPosition } from "@/lib/exco";
export function canAppointExco(role: UserRole): boolean { return role === "admin" || role === "coach"; }

export const PROFILE_REVIEW_LABELS = {
  coach: "Coach",
  general_secretary: "General Secretary",
  president: "President",
  admin: "Admin",
} as const;
export type ProfileReviewStage = keyof typeof PROFILE_REVIEW_LABELS;
export const PROFILE_REVIEW_STAGES = Object.keys(PROFILE_REVIEW_LABELS) as ProfileReviewStage[];
export type ProfileApprovals = Partial<Record<ProfileReviewStage, { reviewerId: string; at: string; note?: string }>>;

export function profileReviewStages(role: UserRole, position: ExcoPosition | null): ProfileReviewStage[] {
  return PROFILE_REVIEW_STAGES.filter(stage =>
    stage === role || ((role === "exco" || role === "admin") && stage === position),
  );
}
