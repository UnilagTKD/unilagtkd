"use server";
import { z } from "zod";
import { rateLimit, requestRateLimit } from "@/lib/shared-rate-limit";
import { queuePasswordReset } from "@/lib/password-reset";
import { securityLog } from "@/lib/security-log";
import { failureCode } from "@/lib/failure-code";

export async function requestPasswordReset(input: string) {
  const parsed = z.string().trim().email().max(255).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email address." };
  const email = parsed.data.toLowerCase();
  try {
    if (!(await requestRateLimit("reset-request", 10, 15 * 60_000)).allowed || !(await rateLimit(`reset-request:${email}`, 5, 15 * 60_000)).allowed) return { ok: false as const, error: "Too many reset requests. Please try again later." };
    await queuePasswordReset(email);
    return { ok: true as const, emailEnabled: Boolean(process.env.RESEND_API_KEY) };
  } catch (error) {
    securityLog("password_reset_request_failed", { outcome: failureCode(error) });
    return { ok: false as const, error: "We couldn't process the reset request. Please try again or contact admin." };
  }
}
