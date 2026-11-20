import { createHash, randomBytes } from "crypto";

export function isValidToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export function storedToken(token: string) {
  return `sha256:${hashToken(token)}`;
}

export function generateExaminerToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function examinerTokenExpiry(days = 7) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function generateSetupToken() {
  return randomBytes(32).toString("hex");
}

export function setupTokenExpiry(days = 7) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

// Shorter-lived than a setup token: a reset link is handed over directly by
// the Secretary, so it should not stay valid for long afterwards.
export function resetTokenExpiry(hours = 24) {
  const expires = new Date();
  expires.setHours(expires.getHours() + hours);
  return expires;
}
