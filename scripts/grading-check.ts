import { canAppointExco, canReviewProfileChange } from "@/lib/verification-permissions";
import {
  resolveRank,
  rankLabel,
  buildPromotion,
  promotionTargets,
  canPromoteTo,
  checkEligibility,
  gradingOptions,
  criteriaFor,
  GRADING_DECISIONS,
  isGradingDecision,
  beltOf,
  beltById,
  beltPoomsae,
  awardableRanks,
  BELTS,
  RANKS,
  rankById,
} from "@/lib/grading";
import { excoPermissions, canManageReceiptSignature } from "@/lib/exco";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.log(`FAIL ${name}\n  got      ${a}\n  expected ${e}`);
  } else {
    console.log(`ok   ${name} = ${a}`);
  }
}

const belt = (id: string) => beltById(id)!;
const rank = (id: string) => rankById(id)!;

console.log("--- belt ladder integrity ---");
check(
  "every rank belongs to exactly one belt",
  RANKS.every((r) => beltOf(r) !== undefined),
  true
);
check(
  "belt grades cover every rank",
  BELTS.flatMap((b) => b.grades).sort(),
  RANKS.map((r) => r.id).sort()
);

console.log("\n--- rank parsing (geup is still the record of rank) ---");
check("Yellow Belt 8th Geup", resolveRank("Yellow Belt 8th Geup").rank.id, "8th-geup");
check("Black Belt 3rd Dan", resolveRank("Black Belt 3rd Dan").rank.id, "3rd-dan");
check("bare 'Red Belt' -> lowest red", resolveRank("Red Belt").rank.id, "2nd-geup");
check("null -> entry", resolveRank(null).rank.id, "10th-geup");
check("belt of 7th geup", beltOf(rank("7th-geup")).id, "yellow");
check("belt of 3rd dan", beltOf(rank("3rd-dan")).id, "black");

console.log("\n--- promotion targets are BELTS ---");
check(
  "from White (10th geup)",
  promotionTargets(rank("10th-geup")).map((b) => b.id),
  ["yellow", "blue"]
);
check(
  "from Yellow 8th geup - same targets as Yellow 7th",
  promotionTargets(rank("8th-geup")).map((b) => b.id),
  ["blue", "brown"]
);
check(
  "from Yellow 7th geup",
  promotionTargets(rank("7th-geup")).map((b) => b.id),
  ["blue", "brown"]
);
check(
  "from Brown - double into Black blocked",
  promotionTargets(rank("3rd-geup")).map((b) => b.id),
  ["red"]
);
check(
  "from Red - single into Black only",
  promotionTargets(rank("1st-geup")).map((b) => b.id),
  ["black"]
);
check("from Black - nothing (Kukkiwon certifies Dan)", promotionTargets(rank("1st-dan")), []);
check("no double into Black", canPromoteTo(rank("3rd-geup"), belt("black")), false);
check("single into Black is fine", canPromoteTo(rank("1st-geup"), belt("black")), true);

console.log("\n--- single vs double ---");
const single = buildPromotion(rank("10th-geup"), belt("yellow"));
check("single steps", single.steps, 1);
check("single isDouble", single.isDouble, false);
check("single poomsae = whole Yellow belt", single.requiredPoomsae, [
  "Taegeuk Il Jang",
  "Taegeuk Ee Jang",
]);
check("single awardable geups", single.awardable.map((r) => r.id), ["8th-geup", "7th-geup"]);
check("single time-in-grade (White = 3)", single.minMonthsRequired, 3);

const double = buildPromotion(rank("10th-geup"), belt("blue"));
check("double steps", double.steps, 2);
check("double isDouble", double.isDouble, true);
check("double poomsae = Yellow + Blue", double.requiredPoomsae, [
  "Taegeuk Il Jang",
  "Taegeuk Ee Jang",
  "Taegeuk Sam Jang",
  "Taegeuk Sa Jang",
]);
check("double awardable geups", double.awardable.map((r) => r.id), ["6th-geup", "5th-geup"]);
check("double time-in-grade = White 3 + Yellow 6", double.minMonthsRequired, 9);

console.log("\n--- coach picks the geup ---");
check("Yellow awardable", awardableRanks(belt("yellow")).map((r) => r.grade), [
  "8th Geup",
  "7th Geup",
]);
check("Yellow poomsae", beltPoomsae(belt("yellow")), ["Taegeuk Il Jang", "Taegeuk Ee Jang"]);
check("manual grading decisions", GRADING_DECISIONS, ["pending", "distinction", "pass", "fail"]);
check("pass is a valid manual decision", isGradingDecision("pass"), true);
check("invalid decisions are rejected", isGradingDecision("automatic"), false);
check("White has a single grade only", awardableRanks(belt("white")).length, 1);

console.log("\n--- leave permissions ---");
check("Treasurer can manage receipt signature", canManageReceiptSignature("exco", "treasurer"), true);
check("President cannot manage receipt signature", canManageReceiptSignature("exco", "president"), false);
check("Admin Secretary cannot manage receipt signature", canManageReceiptSignature("admin", "general_secretary"), false);
check("Admin holding Treasurer can manage receipt signature", canManageReceiptSignature("admin", "treasurer"), true);
check("Secretary cannot verify account recovery", excoPermissions("admin", "general_secretary").includes("password_resets:manage"), false);
check("Admin without an office has no Exco permissions", excoPermissions("admin", null), []);
check(
  "President cannot review leave",
  excoPermissions("exco", "president").includes("leave:review"),
  false
);
check(
  "Welfare cannot review leave",
  excoPermissions("exco", "welfare_officer").includes("leave:review"),
  false
);
check(
  "Welfare can see approved leave",
  excoPermissions("exco", "welfare_officer").includes("leave:view_approved"),
  true
);

console.log("\n--- marks ---");
check(
  "coaches can mark every criterion at every rank",
  criteriaFor().map((c) => c.id),
  ["basics", "poomsae", "kyorugi", "kyukpa", "hoshinsul", "theory"]
);

console.log("\n--- eligibility ---");
const base = {
  currentRank: rank("10th-geup"),
  status: "active" as const,
  sessionsRecorded: 20,
  attendancePct: 85,
  outstandingDues: 0,
  // 12 months at White, which clears the single (3) and the double (3 + 6 = 9).
  rankAttainedAt: "2025-08-26",
  joinedAt: "2025-08-26",
  asOf: new Date("2026-08-26"),
};
check("single at 85% -> eligible", checkEligibility(base).eligible, true);
check(
  "double at 85% -> blocked on attendance",
  checkEligibility({ ...base, target: belt("blue") }).blockers.map((b) => b.code),
  ["double_attendance"]
);
check(
  "double at 92% -> eligible",
  checkEligibility({ ...base, attendancePct: 92, target: belt("blue") }).eligible,
  true
);
check(
  "double needs both belts' time-in-grade",
  checkEligibility({
    ...base,
    attendancePct: 92,
    target: belt("blue"),
    rankAttainedAt: "2026-03-01",
  }).blockers.map((b) => b.code),
  ["time_in_grade"]
);
check(
  "the same 5 months is fine for a single",
  checkEligibility({ ...base, rankAttainedAt: "2026-03-26" }).eligible,
  true
);
check(
  "new account, no sessions -> distinct blocker",
  checkEligibility({
    ...base,
    sessionsRecorded: 0,
    attendancePct: null,
    attendanceCountsFrom: "2026-08-20",
  }).blockers.map((b) => b.code),
  ["no_attendance_data"]
);
check(
  "double into Black rejected",
  checkEligibility({
    ...base,
    currentRank: rank("3rd-geup"),
    target: belt("black"),
  }).blockers.map((b) => b.code),
  ["target_not_permitted"]
);
check(
  "Black Belt has nowhere to go here",
  checkEligibility({ ...base, currentRank: rank("1st-dan") }).blockers.map((b) => b.code),
  ["top_of_ladder"]
);

console.log("\n--- gradingOptions ---");
check(
  "two belt options at 92%",
  gradingOptions({ ...base, attendancePct: 92 }).map((o) => `${o.target.id}:${o.eligible}`),
  ["yellow:true", "blue:true"]
);
check(
  "double blocked at 85%",
  gradingOptions(base).map((o) => `${o.target.id}:${o.eligible}`),
  ["yellow:true", "blue:false"]
);

console.log("\n--- eligibility guidance sample ---");
console.log(
  " ",
  checkEligibility({ ...base, attendancePct: 92, target: belt("blue"), rankAttainedAt: "2026-03-26" })
    .blockers[0].message
);
console.log(" ", rankLabel(rank("1st-dan")));



check("admin appoints Exco", canAppointExco("admin"), true);
check("coach appoints Exco", canAppointExco("coach"), true);
check("Exco cannot appoint Exco", canAppointExco("exco"), false);
check("coach approves belt-only requests", canReviewProfileChange("coach", { beltGrade: "Black Belt 1st Dan" }), true);
check("coach cannot approve contact requests", canReviewProfileChange("coach", { phone: "08000000000" }), false);
check("coach cannot approve mixed requests", canReviewProfileChange("coach", { beltGrade: "Black Belt 1st Dan", levelYear: "300" }), false);
check("admin verifies mixed requests", canReviewProfileChange("admin", { beltGrade: "Black Belt 1st Dan", levelYear: "300" }), true);
check("President cannot approve profile changes", canReviewProfileChange("exco", { beltGrade: "Black Belt 1st Dan" }), false);
check("Treasurer retains payment verification", excoPermissions("exco", "treasurer").includes("dues:manage"), true);
check("President cannot verify payments", excoPermissions("exco", "president").includes("dues:manage"), false);
check("Secretary cannot verify membership", excoPermissions("exco", "general_secretary").includes("applications:manage"), false);

console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
