import assert from "node:assert/strict";
import { isRasterImage, isSafeImageReference } from "../src/lib/validation/image";
import { applicationSchema } from "../src/lib/validation/application";
import { profileSchema } from "../src/lib/validation/profile";
import { paymentReportSchema, duesChargeSchema, leaveRequestSchema, trainingSessionSchema } from "../src/lib/validation/actions";
import { storedToken, generateResetToken, isValidToken } from "../src/lib/tokens";
import { passwordStrengthError } from "../src/lib/password-strength";
import { contentSecurityPolicy } from "../src/lib/security-headers";
import { canReviewProfileChange } from "../src/lib/verification-permissions";
import { excoPermissions, canManageReceiptSignature } from "../src/lib/exco";
import { domainRedirect } from "../src/lib/domains";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
assert.equal(isRasterImage(png), true);
for (const value of ["data:image/svg+xml;base64," + btoa('<svg onload="alert(1)"/>'), "data:image/png;base64," + btoa("<html>fake png</html>"), "javascript:alert(1)", "//evil.example/x.png", "/\\evil.example/x.png", "/x.svg", "http://example.com/x.png", "https://user:password@example.com/x.png"]) assert.equal(isSafeImageReference(value), false, value.slice(0, 50));
assert.equal(isRasterImage("data:image/png;base64," + "A".repeat(2_800_000)), false);
assert.equal(isSafeImageReference("https://res.cloudinary.com/demo/image/upload/x.png"), true);

const report = { periodLabel: "Membership dues", amount: "1000.00" };
assert.equal(paymentReportSchema.safeParse(report).success, true);
for (const amount of ["-1", "0", "NaN", "Infinity", "1e9", "2.999", "100000000.00"]) assert.equal(paymentReportSchema.safeParse({ ...report, amount }).success, false);
assert.equal(paymentReportSchema.safeParse({ ...report, paid: true, userId: "another-member" }).success, false);
assert.equal(duesChargeSchema.safeParse({ ...report, userId: "__all__" }).success, true);
assert.equal(profileSchema.safeParse({ levelYear: "300", phone: "08012345678", address: "Lagos", beltGrade: "White Belt", role: "admin" }).success, false);
assert.equal(trainingSessionSchema.safeParse({ title: "Training", date: "2026-02-30", startTime: "25:00" }).success, false);
assert.equal(leaveRequestSchema.safeParse({ reasonCategory: "personal", startDate: "2026-11-20", endDate: "2026-11-19", details: "Family travel" }).success, false);

const application = {
  semesterLabel: "Current semester", paymentReference: "SECURITY-CHECK", paymentReceiptData: png,
  membershipCategory: "undergraduate", matricOrStaffNo: "TEST/001", levelYear: "100", fullName: "Example Member", surname: "Example", department: "Science", faculty: "Science", gender: "Male",
  photoData: png, dob: "2012-01-01", phone: "08012345678", email: "example@example.com", address: "Lagos Nigeria",
  emergencyContactName: "Example Guardian", emergencyContactRelationship: "Parent", emergencyContactPhone: "08012345679",
  priorTraining: false, subCommitteePref1Id: "11111111-1111-4111-8111-111111111111", subCommitteePref2Id: "22222222-2222-4222-8222-222222222222", subCommitteePref3Id: "33333333-3333-4333-8333-333333333333",
  statementOfPurpose: "I would like to learn Taekwondo and train with the club.", waiverRiskAck: true, waiverReleaseAck: true,
  waiverMedicalAck: true, waiverMediaConsent: false, waiverSignatureName: "Example Member", waiverSignatureDate: "2026-11-17", isMinor: false,
};
assert.equal(applicationSchema.safeParse(application).success, false, "DOB must enforce guardian consent even when isMinor is false");
assert.equal(applicationSchema.safeParse({ ...application, guardianName: "Example Guardian", guardianSignature: "Example Guardian" }).success, true);
assert.equal(applicationSchema.safeParse({ ...application, dob: "2000-01-01", paymentReceiptData: "https://example.com/receipt.png" }).success, false, "Receipt proof must stay private rather than use a public image host");
assert.equal(applicationSchema.safeParse({ ...application, dob: "2000-01-01", paymentReceiptData: undefined }).success, false, "Registration requires a receipt");
assert.equal(applicationSchema.safeParse({ ...application, dob: "2000-01-01", photoData: "data:text/html;base64,PHNjcmlwdD4=" }).success, false);

const token = generateResetToken();
assert.equal(isValidToken(token), true);
assert.equal(isValidToken({ token }), false);
assert.equal(storedToken(token).startsWith("sha256:"), true);
assert.notEqual(storedToken(token), token);
assert.equal(storedToken(token), storedToken(token));
assert.notEqual(passwordStrengthError("é".repeat(37) + "1"), null, "bcrypt byte bound");
assert.equal(passwordStrengthError("SensibleExample2026!"), null);
assert.equal(canReviewProfileChange("coach", { phone: "08000000000" }), false);
assert.equal(canReviewProfileChange("coach", { beltGrade: "Black Belt 1st Dan" }), true);
assert.equal(excoPermissions("exco", "president").includes("dues:manage"), false);
assert.equal(excoPermissions("exco", "treasurer").includes("dues:manage"), true);
assert.equal(canManageReceiptSignature("coach", null), false);
assert.equal(canManageReceiptSignature("admin", null), false);

const csp = contentSecurityPolicy("test-nonce", false);
assert.equal(csp.includes("'unsafe-inline'"), true); // Style attributes remain supported.
assert.equal(csp.split(";")[1].includes("'unsafe-inline'"), false);
assert.equal(csp.includes("'unsafe-eval'"), false);
assert.equal(csp.includes("'nonce-test-nonce'"), true);
assert.equal(csp.includes("frame-ancestors 'none'"), true);
assert.equal(domainRedirect(new URL("http://portal.unilagtaekwondo.org/login?x=1"), { site: "https://unilagtaekwondo.org", portal: "https://portal.unilagtaekwondo.org" })?.href, "https://portal.unilagtaekwondo.org/login?x=1");
console.log("Security checks passed: image payloads, field allowlists, amounts, dates, guardian consent, tokens, passwords, role boundaries, CSP, and HTTPS.");
