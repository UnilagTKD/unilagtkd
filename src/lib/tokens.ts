import { randomBytes } from "crypto";

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
