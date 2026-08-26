import {
  gradingWindowState,
  addDays,
  toDateInput,
  DEFAULT_WINDOW_DAYS,
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

const now = new Date(2026, 7, 24); // 24 Aug 2026, local

console.log("--- no window ever opened ---");
check("phase", gradingWindowState(null, now).phase, "none");
check("open", gradingWindowState(null, now).open, false);

console.log("\n--- upcoming ---");
const upcoming = { opensAt: "2026-09-01", closesAt: "2026-09-21", closedAt: null };
check("phase", gradingWindowState(upcoming, now).phase, "upcoming");
check("open", gradingWindowState(upcoming, now).open, false);
check("days until open", gradingWindowState(upcoming, now).daysUntilOpen, 8);

console.log("\n--- open ---");
const open = { opensAt: "2026-08-10", closesAt: "2026-09-05", closedAt: null };
check("phase", gradingWindowState(open, now).phase, "open");
check("open", gradingWindowState(open, now).open, true);
check("days remaining (incl. today)", gradingWindowState(open, now).daysRemaining, 13);
check("not closing soon", gradingWindowState(open, now).closingSoon, false);

console.log("\n--- boundaries are inclusive ---");
const opensToday = { opensAt: "2026-08-24", closesAt: "2026-08-30", closedAt: null };
check("opens today -> open", gradingWindowState(opensToday, now).open, true);
const closesToday = { opensAt: "2026-08-01", closesAt: "2026-08-24", closedAt: null };
check("closes today -> still open", gradingWindowState(closesToday, now).open, true);
check("closes today -> 1 day left", gradingWindowState(closesToday, now).daysRemaining, 1);
check("closes today -> closing soon", gradingWindowState(closesToday, now).closingSoon, true);
const closedYesterday = { opensAt: "2026-08-01", closesAt: "2026-08-23", closedAt: null };
check("closed yesterday -> closed", gradingWindowState(closedYesterday, now).open, false);
check("lapsed on its own -> expired", gradingWindowState(closedYesterday, now).expired, true);

console.log("\n--- closed early ---");
const early = { opensAt: "2026-08-10", closesAt: "2026-09-05", closedAt: new Date(2026, 7, 20) };
check("phase", gradingWindowState(early, now).phase, "closed");
check("open", gradingWindowState(early, now).open, false);
check("not 'expired' (was closed by hand)", gradingWindowState(early, now).expired, false);

console.log("\n--- closing soon warning ---");
const soon = { opensAt: "2026-08-01", closesAt: "2026-08-28", closedAt: null };
check("5 days left -> closing soon", gradingWindowState(soon, now).closingSoon, true);
check("5 days left -> days remaining", gradingWindowState(soon, now).daysRemaining, 5);

console.log("\n--- date helpers ---");
check("toDateInput pads", toDateInput(new Date(2026, 0, 5)), "2026-01-05");
check("addDays default window", addDays(new Date(2026, 7, 24), DEFAULT_WINDOW_DAYS), "2026-09-14");
check("addDays across month end", addDays(new Date(2026, 7, 31), 1), "2026-09-01");

console.log("\n--- labels ---");
console.log(" ", gradingWindowState(null, now).label);
console.log(" ", gradingWindowState(upcoming, now).label);
console.log(" ", gradingWindowState(open, now).label);
console.log(" ", gradingWindowState(closesToday, now).label);
console.log(" ", gradingWindowState(closedYesterday, now).label);
console.log(" ", gradingWindowState(early, now).label);

console.log(failures === 0 ? "\nALL WINDOW CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
