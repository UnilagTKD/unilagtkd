import type { UserRole } from "@/types/next-auth";

/**
 * Roles held by people who actually train with the club.
 *
 * `exco` is a tag on a member's account, not a replacement for it: an officer
 * keeps their member dashboard, attendance, dues and grading, and picks up an
 * extra dashboard for their office on top. So exco accounts must be counted as
 * members everywhere members are listed.
 */
export const MEMBER_ROLES = ["student", "alumni", "exco"] as const satisfies readonly UserRole[];

/**
 * Members expected at training this session. Alumni keep an account and can
 * still pay dues, but they are not on the active training register.
 */
export const ACTIVE_MEMBER_ROLES = ["student", "exco"] as const satisfies readonly UserRole[];

/** Shared personal pages are also available to coaches, independently of training rosters. */
export const MEMBER_PAGE_ROLES = [...MEMBER_ROLES, "coach"] as const satisfies readonly UserRole[];
