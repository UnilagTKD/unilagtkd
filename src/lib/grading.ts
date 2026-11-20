// Belt grading reference data for the club.
//
// Everything in this file is pure: no database, no session, no React. The
// server actions in the dashboard own persistence and authorisation; this
// module owns the rank ladder and recommendations shown to coaches and
// members. Coaches record marks and make the final grading decision.
//
// The belt ladder comes from the club's Official Club Manual & Operational
// Handbook (2026 Issue); the Dan time-in-grade references follow Kukkiwon
// practice.

import { ATTENDANCE_THRESHOLDS } from "@/lib/constants";
import { dayNumber } from "@/lib/dates";

// ---------------------------------------------------------------------------
// The rank ladder
// ---------------------------------------------------------------------------

export type Rank = {
  /** Stable identifier stored on grading records. Never renamed. */
  id: string;
  /** Position on the ladder, ascending. The only thing order comparisons use. */
  order: number;
  /** Belt colour, as published in the club manual's belt system table. */
  belt: string;
  /** Geup/Dan grade within that belt. */
  grade: string;
  /**
   * The suggested Poomsae for a candidate being promoted *into* this rank.
   * Names line up with POOMSAE_VIDEOS in `@/lib/constants`, so the dashboard
   * can point a candidate at the reference footage for their test. The entry
   * rank has none - nothing is graded to reach White Belt.
   */
  requiredPoomsae: string | null;
  /**
   * Suggested months a member holds this rank before the next one. Colour
   * belts follow the club's intervals; Dan grades follow
   * the Kukkiwon rule of one year per Dan held (1st -> 2nd is 12 months,
   * 2nd -> 3rd is 24, and so on).
   */
  minMonthsBeforeNext: number;
  /**
   * Dan promotions are certified by Kukkiwon/NTF, not by the club. The panel
   * still examines and records the result, but the rank stays provisional
   * until the external certificate is issued.
   */
  externallyCertified: boolean;
};

// The club manual's belt system table skips 9th Geup, so the ladder does too:
// White (10th) -> Yellow (8th, 7th) -> Blue (6th, 5th) -> Brown (4th, 3rd) ->
// Red (2nd, 1st) -> Black (Dan). That leaves exactly eight colour-belt
// promotions for the eight Taegeuk forms, which is why the Poomsae below line
// up one-to-one with the rungs.
export const RANKS: readonly Rank[] = [
  { id: "10th-geup", order: 0, belt: "White Belt", grade: "10th Geup", requiredPoomsae: null, minMonthsBeforeNext: 3, externallyCertified: false },
  { id: "8th-geup", order: 1, belt: "Yellow Belt", grade: "8th Geup", requiredPoomsae: "Taegeuk Il Jang", minMonthsBeforeNext: 3, externallyCertified: false },
  { id: "7th-geup", order: 2, belt: "Yellow Belt", grade: "7th Geup", requiredPoomsae: "Taegeuk Ee Jang", minMonthsBeforeNext: 3, externallyCertified: false },
  { id: "6th-geup", order: 3, belt: "Blue Belt", grade: "6th Geup", requiredPoomsae: "Taegeuk Sam Jang", minMonthsBeforeNext: 4, externallyCertified: false },
  { id: "5th-geup", order: 4, belt: "Blue Belt", grade: "5th Geup", requiredPoomsae: "Taegeuk Sa Jang", minMonthsBeforeNext: 4, externallyCertified: false },
  { id: "4th-geup", order: 5, belt: "Brown Belt", grade: "4th Geup", requiredPoomsae: "Taegeuk Oh Jang", minMonthsBeforeNext: 4, externallyCertified: false },
  { id: "3rd-geup", order: 6, belt: "Brown Belt", grade: "3rd Geup", requiredPoomsae: "Taegeuk Yuk Jang", minMonthsBeforeNext: 4, externallyCertified: false },
  { id: "2nd-geup", order: 7, belt: "Red Belt", grade: "2nd Geup", requiredPoomsae: "Taegeuk Chil Jang", minMonthsBeforeNext: 6, externallyCertified: false },
  { id: "1st-geup", order: 8, belt: "Red Belt", grade: "1st Geup", requiredPoomsae: "Taegeuk Pal Jang", minMonthsBeforeNext: 6, externallyCertified: false },
  { id: "1st-dan", order: 9, belt: "Black Belt", grade: "1st Dan", requiredPoomsae: "Koryo", minMonthsBeforeNext: 12, externallyCertified: true },
  { id: "2nd-dan", order: 10, belt: "Black Belt", grade: "2nd Dan", requiredPoomsae: "Keumgang", minMonthsBeforeNext: 24, externallyCertified: true },
  { id: "3rd-dan", order: 11, belt: "Black Belt", grade: "3rd Dan", requiredPoomsae: "Taebaek", minMonthsBeforeNext: 36, externallyCertified: true },
  { id: "4th-dan", order: 12, belt: "Black Belt", grade: "4th Dan", requiredPoomsae: "Pyongwon", minMonthsBeforeNext: 48, externallyCertified: true },
  { id: "5th-dan", order: 13, belt: "Black Belt", grade: "5th Dan", requiredPoomsae: "Sipjin", minMonthsBeforeNext: 60, externallyCertified: true },
  { id: "6th-dan", order: 14, belt: "Black Belt", grade: "6th Dan", requiredPoomsae: "Jitae", minMonthsBeforeNext: 72, externallyCertified: true },
  { id: "7th-dan", order: 15, belt: "Black Belt", grade: "7th Dan", requiredPoomsae: "Chonkwon", minMonthsBeforeNext: 84, externallyCertified: true },
  { id: "8th-dan", order: 16, belt: "Black Belt", grade: "8th Dan", requiredPoomsae: "Hansu", minMonthsBeforeNext: 96, externallyCertified: true },
  { id: "9th-dan", order: 17, belt: "Black Belt", grade: "9th Dan", requiredPoomsae: "Ilyeo", minMonthsBeforeNext: 0, externallyCertified: true },
] as const;

/** The rank every member starts at when nothing else is on file. */
export const ENTRY_RANK = RANKS[0];

const RANKS_BY_ID = new Map(RANKS.map((r) => [r.id, r]));

export function rankById(id: string | null | undefined): Rank | null {
  return id ? RANKS_BY_ID.get(id) ?? null : null;
}

/** "White Belt, 10th Geup" - how a rank is written on records and certificates. */
export function rankLabel(rank: Rank): string {
  return `${rank.belt}, ${rank.grade}`;
}

/** The rank immediately above `rank`, or null at the top of the ladder. */
export function nextRank(rank: Rank): Rank | null {
  return RANKS[rank.order + 1] ?? null;
}

// ---------------------------------------------------------------------------
// Belts - the unit a grading actually moves
// ---------------------------------------------------------------------------

// A grading promotes a member by *belt*, not by geup. A single grading moves
// one belt colour, a double moves two. Where inside the awarded belt the member
// lands - 8th Geup or 7th, say - is the panel's call at marking time, not
// something the system decides in advance: it is a judgement about how the
// candidate actually performed, and only the examiners can make it.
//
// The geup ladder above is still the club's record of rank, and still drives
// which Poomsae are required and how long someone has held their grade. It is
// simply no longer the unit of promotion.

export type BeltId = "white" | "yellow" | "blue" | "brown" | "red" | "black";

export type Belt = {
  id: BeltId;
  order: number;
  /** "Yellow Belt", matching the club manual's belt system table. */
  name: string;
  /** Rank ids inside this belt, lowest grade first. */
  grades: string[];
  /** Suggested months a member holds this belt before grading out of it. */
  minMonthsBeforeNext: number;
  /** Dan grades are certified by Kukkiwon/NTF rather than by the club. */
  externallyCertified: boolean;
};

export const BELTS: readonly Belt[] = [
  { id: "white", order: 0, name: "White Belt", grades: ["10th-geup"], minMonthsBeforeNext: 3, externallyCertified: false },
  { id: "yellow", order: 1, name: "Yellow Belt", grades: ["8th-geup", "7th-geup"], minMonthsBeforeNext: 6, externallyCertified: false },
  { id: "blue", order: 2, name: "Blue Belt", grades: ["6th-geup", "5th-geup"], minMonthsBeforeNext: 8, externallyCertified: false },
  { id: "brown", order: 3, name: "Brown Belt", grades: ["4th-geup", "3rd-geup"], minMonthsBeforeNext: 8, externallyCertified: false },
  { id: "red", order: 4, name: "Red Belt", grades: ["2nd-geup", "1st-geup"], minMonthsBeforeNext: 12, externallyCertified: false },
  {
    id: "black",
    order: 5,
    name: "Black Belt",
    grades: [
      "1st-dan", "2nd-dan", "3rd-dan", "4th-dan",
      "5th-dan", "6th-dan", "7th-dan", "8th-dan", "9th-dan",
    ],
    minMonthsBeforeNext: 0,
    externallyCertified: true,
  },
] as const;

const BELTS_BY_ID = new Map(BELTS.map((b) => [b.id, b]));
const BELTS_BY_NAME = new Map(BELTS.map((b) => [b.name, b]));

export function beltById(id: string | null | undefined): Belt | null {
  return id ? BELTS_BY_ID.get(id as BeltId) ?? null : null;
}

/** The belt a rank belongs to. */
export function beltOf(rank: Rank): Belt {
  return BELTS_BY_NAME.get(rank.belt)!;
}

/** The ranks a panel may award when promoting into `belt`, lowest first. */
export function awardableRanks(belt: Belt): Rank[] {
  return belt.grades.map((id) => rankById(id)!).filter(Boolean);
}

/** Every Poomsae covered by a belt, in order. */
export function beltPoomsae(belt: Belt): string[] {
  return awardableRanks(belt)
    .map((r) => r.requiredPoomsae)
    .filter((p): p is string => p !== null);
}

/** The belt immediately above `belt`, or null at Black. */
export function nextBelt(belt: Belt): Belt | null {
  return BELTS[belt.order + 1] ?? null;
}

// ---------------------------------------------------------------------------
// Reading the rank off a member profile
// ---------------------------------------------------------------------------

// `memberProfiles.beltGrade` is free text - members type it themselves at
// registration and can edit it in settings. Grading has to start from whatever
// is there, so this parser is deliberately forgiving, and reports when it had
// to guess.

export type ResolvedRank = {
  rank: Rank;
  /**
   * True when the stored text did not pin down a rank and the ladder's entry
   * rank (or the lowest rank of a named belt) was assumed. The coach dashboard
   * flags these so the panel confirms the rank before examining.
   */
  inferred: boolean;
};

const DAN_PATTERN = /(\d+)\s*(?:st|nd|rd|th)?\s*dan|dan\s*(\d+)/;
const GEUP_PATTERN = /(\d+)\s*(?:st|nd|rd|th)?\s*(?:geup|gup|kup)|(?:geup|gup|kup)\s*(\d+)/;

/**
 * Turns a stored belt grade string into a rank.
 *
 * Recognises the grade outright ("Yellow Belt 8th Geup", "3rd Dan", "8 Kup").
 * Given only a belt colour it takes the *lowest* rank of that colour, so a bare
 * "Red Belt" resolves to 2nd Geup rather than the senior grade - under-reading
 * a rank costs a candidate one grading cycle, while over-reading it puts them
 * in front of a panel they are not ready for.
 */
export function resolveRank(beltGrade: string | null | undefined): ResolvedRank {
  const text = (beltGrade ?? "").trim().toLowerCase();

  if (!text || text === "unranked" || text === "none") {
    return { rank: ENTRY_RANK, inferred: true };
  }

  // Dan is checked first because a Black Belt entry never carries a Geup number.
  const dan = text.match(DAN_PATTERN);
  if (dan) {
    const level = Number(dan[1] ?? dan[2]);
    const match = RANKS.find((r) => r.grade.toLowerCase() === `${level}${ordinalSuffix(level)} dan`);
    if (match) return { rank: match, inferred: false };
  }

  // Geup is also spelled Kup or Gup depending on the romanisation.
  const geup = text.match(GEUP_PATTERN);
  if (geup) {
    const level = Number(geup[1] ?? geup[2]);
    const match = RANKS.find(
      (r) => r.grade.toLowerCase() === `${level}${ordinalSuffix(level)} geup`
    );
    if (match) return { rank: match, inferred: false };

    // A Geup the club's ladder does not use - 9th, say. Round down to the
    // nearest rung the club actually grades, for the same reason as above.
    const below = RANKS.filter((r) => r.grade.endsWith("Geup") && geupLevel(r) > level).pop();
    if (below) return { rank: below, inferred: true };
  }

  // Belt colour only: take the lowest rank wearing that belt.
  const belt = RANKS.find((r) => text.includes(r.belt.toLowerCase()));
  if (belt) {
    const lowest = RANKS.find((r) => r.belt === belt.belt)!;
    return { rank: lowest, inferred: true };
  }

  return { rank: ENTRY_RANK, inferred: true };
}

function geupLevel(rank: Rank): number {
  return Number(rank.grade.replace(/\D/g, ""));
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

// ---------------------------------------------------------------------------
// What the panel scores
// ---------------------------------------------------------------------------

export const GRADING_CRITERIA = [
  {
    id: "basics",
    label: "Basics",
    ko: "Gibon Dongjak",
    description: "Stances, blocks, strikes and kicks performed on command.",
  },
  {
    id: "poomsae",
    label: "Poomsae",
    ko: "Poomsae",
    description: "The form required for the target rank, from memory.",
  },
  {
    id: "kyorugi",
    label: "Sparring",
    ko: "Kyorugi",
    description: "Step sparring at colour belt; free sparring from Red Belt up.",
  },
  {
    id: "kyukpa",
    label: "Breaking",
    ko: "Kyukpa",
    description: "Board breaks with the techniques set for the rank.",
  },
  {
    id: "hoshinsul",
    label: "Self-Defence",
    ko: "Ho Shin Sul",
    description: "Releases, joint locks and escapes against a live partner.",
  },
  {
    id: "theory",
    label: "Theory & Terminology",
    ko: "Iron",
    description: "Korean terminology, the five tenets, and Dojang etiquette.",
  },
] as const;

export type GradingCriterionId = (typeof GRADING_CRITERIA)[number]["id"];

export type CriterionScores = Partial<Record<GradingCriterionId, number | null>>;

/** Every criterion is marked out of this. */
export const MAX_CRITERION_SCORE = 10;

/** Criteria available for a promotion; coaches decide which to use. */
export function criteriaFor() {
  return GRADING_CRITERIA;
}

// ---------------------------------------------------------------------------
// Promotions, single and double
// ---------------------------------------------------------------------------

// A grading moves a member by belt. A single takes the next belt colour; a
// double takes two, skipping a colour outright. A double is not the same test
// twice: the candidate performs every form across both belts.

/** The most belts a single grading may cover. */
export const MAX_PROMOTION_STEPS = 2;

export type Promotion = {
  /** The candidate's rank going in, which fixes their belt and time-in-grade. */
  from: Rank;
  /** The belt being graded to. The geup inside it is awarded at marking. */
  to: Belt;
  /** Belts covered: 1 for a standard grading, 2 for a double. */
  steps: number;
  isDouble: boolean;
  /** Every form across the belts covered. */
  requiredPoomsae: string[];
  /** The grades the panel may award inside `to`, lowest first. */
  awardable: Rank[];
  /** Combined time-in-grade for every belt covered. */
  minMonthsRequired: number;
};

/**
 * Describes a promotion from `from` into belt `to`, including the forms a
 * double grading covers. Throws when the jump is not permitted - callers
 * pick targets from `promotionTargets`, which only offers permitted ones.
 */
export function buildPromotion(from: Rank, to: Belt): Promotion {
  const fromBelt = beltOf(from);
  const steps = to.order - fromBelt.order;

  if (steps < 1) {
    throw new Error("A promotion must target a belt above the candidate's current one");
  }
  if (steps > MAX_PROMOTION_STEPS) {
    throw new Error(`A grading may cover at most ${MAX_PROMOTION_STEPS} belts`);
  }

  const covered = BELTS.slice(fromBelt.order + 1, to.order + 1);
  const isDouble = steps > 1;

  return {
    from,
    to,
    steps,
    isDouble,
    requiredPoomsae: covered.flatMap(beltPoomsae),
    awardable: awardableRanks(to),
    // Time-in-grade accumulates across every belt skipped: a candidate cannot
    // shortcut two belts' worth of mat time by taking them in one sitting.
    minMonthsRequired: BELTS.slice(fromBelt.order, to.order).reduce(
      (sum, b) => sum + b.minMonthsBeforeNext,
      0
    ),
  };
}

/**
 * Whether belt `to` may be graded to from rank `from` in one sitting.
 *
 * Double grading stops at Black Belt: Dan grades are certified individually by
 * Kukkiwon/NTF, and no club panel can skip a colour belt on their behalf.
 */
export function canPromoteTo(from: Rank, to: Belt): boolean {
  const steps = to.order - beltOf(from).order;
  if (steps < 1 || steps > MAX_PROMOTION_STEPS) return false;
  if (steps > 1 && to.id === "black") return false;
  return true;
}

/**
 * The belts a member at `from` may be entered for, nearest first: normally the
 * next belt and the double, and only the single at Red Belt, where the one way
 * on is into Black.
 *
 * A member already at Black Belt has no belt to move to - Dan promotions run
 * through Kukkiwon/NTF rather than through this system.
 */
export function promotionTargets(from: Rank): Belt[] {
  const fromBelt = beltOf(from);
  return BELTS.slice(fromBelt.order + 1, fromBelt.order + 1 + MAX_PROMOTION_STEPS).filter((to) =>
    canPromoteTo(from, to)
  );
}

// ---------------------------------------------------------------------------
// Who may be entered for a grading
// ---------------------------------------------------------------------------

export type EligibilityBlockerCode =
  | "top_of_ladder"
  | "target_not_permitted"
  | "inactive"
  | "no_attendance_data"
  | "attendance_below_threshold"
  | "double_attendance"
  | "outstanding_dues"
  | "time_in_grade";

export type EligibilityBlocker = { code: EligibilityBlockerCode; message: string };

export type EligibilityInput = {
  currentRank: Rank;
  /**
   * The belt being graded to. Defaults to the next belt; pass the belt two up
   * to view guidance for a double grading.
   */
  target?: Belt;
  status: "active" | "inactive";
  /**
   * Sessions that count toward this member's record; 0 means nothing to judge
   * on. Sessions before they joined and sessions inside approved leave are
   * already excluded - see `@/lib/attendance`.
   */
  sessionsRecorded: number;
  /** Attendance percentage over the counting sessions, or null when there are none. */
  attendancePct: number | null;
  /** Day the member's attendance began counting, "YYYY-MM-DD", when known. */
  attendanceCountsFrom?: string;
  /** How many dues charges are still unpaid. */
  outstandingDues: number;
  /** When the member reached their current rank; falls back to `joinedAt`. */
  rankAttainedAt: Date | string | null;
  joinedAt: Date | string;
  /** The grading date being tested against. Defaults to now. */
  asOf?: Date;
};

export type EligibilityResult = {
  promotion: Promotion | null;
  eligible: boolean;
  blockers: EligibilityBlocker[];
  monthsAtRank: number;
};

/**
 * Summarizes how a member compares with the club's suggested grading criteria.
 *
 * Returns every eligibility warning so coaches see the full picture. These
 * recommendations do not prevent a coach from entering or passing a candidate.
 */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const asOf = input.asOf ?? new Date();
  const attainedAt = input.rankAttainedAt ?? input.joinedAt;
  const monthsAtRank = monthsBetween(new Date(attainedAt), asOf);
  const target = input.target ?? nextBelt(beltOf(input.currentRank));

  if (!target) {
    return {
      promotion: null,
      eligible: false,
      monthsAtRank,
      blockers: [
        {
          code: "top_of_ladder",
          message: `${rankLabel(input.currentRank)} is the highest rank on the club ladder.`,
        },
      ],
    };
  }

  if (!canPromoteTo(input.currentRank, target)) {
    return {
      promotion: null,
      eligible: false,
      monthsAtRank,
      blockers: [
        {
          code: "target_not_permitted",
          message:
            target.id === "black" && target.order - beltOf(input.currentRank).order > 1
              ? `${target.name} cannot be double graded: Dan ranks are certified individually by Kukkiwon/NTF.`
              : `${target.name} is not a permitted target from ${rankLabel(input.currentRank)}.`,
        },
      ],
    };
  }

  const promotion = buildPromotion(input.currentRank, target);
  const blockers: EligibilityBlocker[] = [];

  if (input.status !== "active") {
    blockers.push({ code: "inactive", message: "Membership is not active." });
  }

  if (input.sessionsRecorded === 0) {
    blockers.push({
      code: "no_attendance_data",
      // Distinguishes "we have no record" from "their record is poor". A member
      // who joined last week has no record through no fault of their own, and
      // the message should not read like an accusation.
      message: input.attendanceCountsFrom
        ? `No sessions have been marked for this member since they joined on ${input.attendanceCountsFrom}, so the training requirement cannot be verified yet.`
        : "No attendance has been marked for this member, so the training requirement cannot be verified.",
    });
  } else {
    const pct = input.attendancePct ?? 0;
    if (pct < ATTENDANCE_THRESHOLDS.promotionalGrading) {
      blockers.push({
        code: "attendance_below_threshold",
        message: `Attendance is ${pct}% over ${input.sessionsRecorded} counting session${input.sessionsRecorded === 1 ? "" : "s"}, below the ${ATTENDANCE_THRESHOLDS.promotionalGrading}% required for promotional grading.`,
      });
    } else if (promotion.isDouble && pct < ATTENDANCE_THRESHOLDS.varsityRosterPool) {
      // Skipping a rank is a reward for being ahead of the syllabus, and the
      // only objective evidence of that is mat time. The club already defines
      // a higher band for its varsity pool; a double grading uses the same one.
      blockers.push({
        code: "double_attendance",
        message: `A double grading requires ${ATTENDANCE_THRESHOLDS.varsityRosterPool}% attendance; this member is at ${pct}%.`,
      });
    }
  }

  if (input.outstandingDues > 0) {
    blockers.push({
      code: "outstanding_dues",
      message:
        input.outstandingDues === 1
          ? "One dues charge is still outstanding."
          : `${input.outstandingDues} dues charges are still outstanding.`,
    });
  }

  if (monthsAtRank < promotion.minMonthsRequired) {
    blockers.push({
      code: "time_in_grade",
      message: promotion.isDouble
        ? `A double grading to ${target.name} needs ${promotion.minMonthsRequired} months at ${rankLabel(input.currentRank)} (both belts' time-in-grade); ${monthsAtRank} have been served.`
        : `${monthsAtRank} of the ${promotion.minMonthsRequired} months required at ${rankLabel(input.currentRank)} have been served.`,
    });
  }

  return { promotion, eligible: blockers.length === 0, blockers, monthsAtRank };
}

export type GradingOption = {
  target: Belt;
  promotion: Promotion;
  isDouble: boolean;
  eligible: boolean;
  blockers: EligibilityBlocker[];
};

/**
 * Every promotion a member could be entered for, with its verdict - the single
 * step and, where permitted, the double. The coach dashboard renders these side
 * by side so the panel can see what a double would require before choosing it.
 */
export function gradingOptions(input: Omit<EligibilityInput, "target">): GradingOption[] {
  return promotionTargets(input.currentRank).flatMap((target) => {
    const result = checkEligibility({ ...input, target });
    if (!result.promotion) return [];
    return [
      {
        target,
        promotion: result.promotion,
        isDouble: result.promotion.isDouble,
        eligible: result.eligible,
        blockers: result.blockers,
      },
    ];
  });
}

/** Whole months from `from` to `to`, never negative. */
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

// ---------------------------------------------------------------------------
// The grading window
// ---------------------------------------------------------------------------

// Grading is not a standing feature - the club runs it in periods. A coach
// opens a window as a grading approaches, and it closes on its own at the end
// date so nobody has to remember to switch it off. While no window is open the
// grading system is dormant: members see their history but nothing live, and
// coaches cannot open new grading activity.
//
// The window gates *starting* things (declaring a grading, entering
// candidates). It deliberately does not gate marking or publishing a grading
// that already exists, or a window expiring the day after a test would strand
// the panel's results.

/** Default length of a grading window when a coach does not set an end date. */
export const DEFAULT_WINDOW_DAYS = 21;

/** Days remaining at which the dashboard starts warning that time is short. */
export const WINDOW_CLOSING_SOON_DAYS = 7;

export type GradingWindowRecord = {
  opensAt: string;
  closesAt: string;
  /** Set when a coach closed the window early; overrides the dates. */
  closedAt: Date | string | null;
};

export type GradingWindowPhase = "none" | "upcoming" | "open" | "closed";

export type GradingWindowState = {
  phase: GradingWindowPhase;
  /** The one thing callers usually want: may grading activity start today? */
  open: boolean;
  opensAt: string | null;
  closesAt: string | null;
  /** Days until the window opens, when `phase` is "upcoming". */
  daysUntilOpen: number | null;
  /** Days left including today, when `phase` is "open". */
  daysRemaining: number | null;
  closingSoon: boolean;
  /** True when the window ran out on its own rather than being closed early. */
  expired: boolean;
  label: string;
};

/**
 * Works out where `window` stands as at `now`. Pass the most recent window;
 * null means the club has never run one.
 */
export function gradingWindowState(
  window: GradingWindowRecord | null,
  now: Date = new Date()
): GradingWindowState {
  const base = {
    opensAt: window?.opensAt ?? null,
    closesAt: window?.closesAt ?? null,
    daysUntilOpen: null,
    daysRemaining: null,
    closingSoon: false,
    expired: false,
  };

  if (!window) {
    return {
      ...base,
      phase: "none",
      open: false,
      label: "Grading is closed. No grading period has been opened.",
    };
  }

  const today = dayNumber(now);
  const opens = dayNumber(window.opensAt);
  const closes = dayNumber(window.closesAt);

  if (window.closedAt) {
    return {
      ...base,
      phase: "closed",
      open: false,
      label: "Grading is closed. The last grading period was closed early.",
    };
  }

  if (today < opens) {
    return {
      ...base,
      phase: "upcoming",
      open: false,
      daysUntilOpen: opens - today,
      label: `Grading opens on ${window.opensAt}.`,
    };
  }

  if (today > closes) {
    return {
      ...base,
      phase: "closed",
      open: false,
      expired: true,
      label: `Grading is closed. The last grading period ended on ${window.closesAt}.`,
    };
  }

  const daysRemaining = closes - today + 1;
  return {
    ...base,
    phase: "open",
    open: true,
    daysRemaining,
    closingSoon: daysRemaining <= WINDOW_CLOSING_SOON_DAYS,
    label:
      daysRemaining === 1
        ? `Grading is open. The period closes today (${window.closesAt}).`
        : `Grading is open until ${window.closesAt}, ${daysRemaining} days from now.`,
  };
}

// Date helpers live in `@/lib/dates` so the attendance rules can share them
// without depending on grading. Re-exported here because callers already import
// them from this module.
export { toDateInput, addDays } from "@/lib/dates";

// ---------------------------------------------------------------------------
// Display helpers shared by the coach and member dashboards
// ---------------------------------------------------------------------------

export const GRADING_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "Marking",
  published: "Published",
  cancelled: "Cancelled",
};

export const GRADING_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-800",
  cancelled: "bg-zinc-100 text-zinc-500",
};

export const GRADING_DECISIONS = ["pending", "distinction", "pass", "fail"] as const;
export type GradingDecision = (typeof GRADING_DECISIONS)[number];

export function isGradingDecision(value: unknown): value is GradingDecision {
  return GRADING_DECISIONS.some((decision) => decision === value);
}

export const OUTCOME_LABELS: Record<string, string> = {
  pending: "Not yet marked",
  distinction: "Pass with Distinction",
  pass: "Pass",
  fail: "Not promoted",
  absent: "Absent",
  withdrawn: "Withdrawn",
};

export const OUTCOME_STYLES: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  distinction: "bg-green-100 text-green-800",
  pass: "bg-blue-100 text-blue-700",
  fail: "bg-red-100 text-red-700",
  absent: "bg-yellow-100 text-yellow-700",
  withdrawn: "bg-zinc-100 text-zinc-500",
};

/** Outcomes that promote the candidate when the grading is published. */
export function isPromoting(outcome: string): boolean {
  return outcome === "pass" || outcome === "distinction";
}
