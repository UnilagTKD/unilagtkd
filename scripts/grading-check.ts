import {
  resolveRank,
  rankLabel,
  buildPromotion,
  promotionTargets,
  canPromoteTo,
  assessGrading,
  checkEligibility,
  gradingOptions,
  criteriaFor,
  weightsFor,
  suggestedAward,
  beltOf,
  beltById,
  beltPoomsae,
  awardableRanks,
  BELTS,
  RANKS,
  rankById,
} from "@/lib/grading";

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
for (const b of BELTS) {
  const sum = Object.values(weightsFor(b)).reduce((x, y) => x + y, 0);
  check(`weights ${b.id} (${b.band}) sum to 100`, sum, 100);
}
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
check("single pass mark", single.passMark, 70);
check("single min per component", single.minCriterionScore, 5);
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
check("double pass mark", double.passMark, 80);
check("double min per component", double.minCriterionScore, 6);
check("double time-in-grade = White 3 + Yellow 6", double.minMonthsRequired, 9);

console.log("\n--- coach picks the geup ---");
check("Yellow awardable", awardableRanks(belt("yellow")).map((r) => r.grade), [
  "8th Geup",
  "7th Geup",
]);
check("Yellow poomsae", beltPoomsae(belt("yellow")), ["Taegeuk Il Jang", "Taegeuk Ee Jang"]);
check("pass suggests bottom of belt", suggestedAward(single, "pass")?.id, "8th-geup");
check("distinction suggests top of belt", suggestedAward(single, "distinction")?.id, "7th-geup");
check("fail suggests nothing", suggestedAward(single, "fail"), null);
check("absent suggests nothing", suggestedAward(single, "absent"), null);
check("White has a single grade only", awardableRanks(belt("white")).length, 1);

console.log("\n--- scoring ---");
// Yellow is the beginner band: basics 40, poomsae 35, hoshinsul 10, theory 15.
check(
  "beginner criteria",
  criteriaFor(belt("yellow")).map((c) => c.id),
  ["basics", "poomsae", "hoshinsul", "theory"]
);
check(
  "advanced criteria (Red)",
  criteriaFor(belt("red")).map((c) => c.id),
  ["basics", "poomsae", "kyorugi", "kyukpa", "hoshinsul", "theory"]
);

// A double into Blue is examined on BLUE.s syllabus - the intermediate band,
// which adds sparring and breaking. Skipping a belt does not skip its material.
const eights = { basics: 8, poomsae: 8, hoshinsul: 8, theory: 8 };
const eightsFull = { ...eights, kyorugi: 8, kyukpa: 8 };
const sevensFull = { basics: 7, poomsae: 7, hoshinsul: 7, theory: 7, kyorugi: 7, kyukpa: 7 };
const ninesFull = { basics: 9, poomsae: 9, hoshinsul: 9, theory: 9, kyorugi: 9, kyukpa: 9 };
const poomsaeFiveFull = { basics: 10, poomsae: 5, hoshinsul: 10, theory: 10, kyorugi: 10, kyukpa: 10 };
check(
  "double into Blue is examined on Blue material",
  criteriaFor(belt("blue")).map((c) => c.id),
  ["basics", "poomsae", "kyorugi", "kyukpa", "hoshinsul", "theory"]
);
check("beginner marks alone leave a Blue double unmarked", assessGrading(double, eights).outcome, "pending");
check("all 8s -> 80%", assessGrading(single, eights).total, 80);
check("all 8s single -> pass", assessGrading(single, eights).outcome, "pass");
check("all 8s double -> pass (80 = double pass mark)", assessGrading(double, eightsFull).outcome, "pass");

const sevens = { basics: 7, poomsae: 7, hoshinsul: 7, theory: 7 };
check("all 7s single -> pass", assessGrading(single, sevens).outcome, "pass");
check("all 7s double -> fail (70 < 80)", assessGrading(double, sevensFull).outcome, "fail");

const nines = { basics: 9, poomsae: 9, hoshinsul: 9, theory: 9 };
check("all 9s single -> distinction", assessGrading(single, nines).outcome, "distinction");
check("all 9s double -> distinction (90 = double distinction)", assessGrading(double, ninesFull).outcome, "distinction");

// The mandatory floor overrides a comfortable total, and the double floor is higher.
const poomsaeFive = { basics: 10, poomsae: 5, hoshinsul: 10, theory: 10 };
check("poomsae 5 single -> pass", assessGrading(single, poomsaeFive).outcome, "pass");
check("poomsae 5 double -> fail on floor (double floor is 6)", assessGrading(double, poomsaeFiveFull).outcome, "fail");
check(
  "floor shortfall names the component",
  assessGrading(double, poomsaeFiveFull).shortfalls,
  ["Poomsae"]
);
check("unmarked -> pending", assessGrading(single, { basics: 8 }).outcome, "pending");

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

console.log("\n--- sample messages ---");
console.log(" ", assessGrading(double, ninesFull).summary);
console.log(" ", assessGrading(double, sevensFull).summary);
console.log(" ", assessGrading(double, poomsaeFiveFull).summary);
console.log(
  " ",
  checkEligibility({ ...base, attendancePct: 92, target: belt("blue"), rankAttainedAt: "2026-03-26" })
    .blockers[0].message
);
console.log(" ", rankLabel(rank("1st-dan")));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
