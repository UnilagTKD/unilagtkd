import assert from "node:assert/strict";
import { currentLagosMonth, lastReportMonth, reportPeriod } from "../src/lib/report-period";
assert.equal(currentLagosMonth(new Date("2026-12-31T23:30:00Z")), "2027-01");
assert.equal(lastReportMonth(new Date("2026-12-31T23:30:00Z")), "2026-12");
assert.equal(reportPeriod("2026-02").start.toISOString(), "2026-01-31T23:00:00.000Z");
assert.equal(reportPeriod("2026-02").end.toISOString(), "2026-02-28T23:00:00.000Z");
assert.equal(reportPeriod("2024-02").end.toISOString(), "2024-02-29T23:00:00.000Z");
for (const month of ["2026-00", "2026-13", "2026-1", "not-a-month"]) assert.throws(() => reportPeriod(month));
console.log("Monthly periods: Lagos boundary, year rollover, leap year, and invalid months passed.");
