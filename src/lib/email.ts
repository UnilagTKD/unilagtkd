import "server-only";
import { rateLimit } from "@/lib/shared-rate-limit";
import { securityLog } from "@/lib/security-log";
import { publicUrl } from "@/lib/seo";

// Sending is a no-op (logged, not thrown) when RESEND_API_KEY is unset, so
// the app keeps working - manual/Secretary-mediated flows still apply - for
// anyone running this without an email provider configured.

const FROM = process.env.EMAIL_FROM || "UNILAG Taekwondo Club <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "unilagtkd@gmail.com";

export async function sendEmail(to: string, subject: string, html: string, idempotencyKey?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    securityLog("email_not_configured");
    return { ok: false as const, error: "Email is not configured." };
  }

  try {
    const notification = idempotencyKey?.startsWith("notification/") === true;
    // Routine updates must not consume a member's password-reset allowance.
    const recipientScope = notification ? "email:notification-recipient" : "email:recipient";
    if (!(await rateLimit(`${recipientScope}:${to.toLowerCase()}`, 5, 60 * 60_000)).allowed ||
      (notification && !(await rateLimit("email:notifications-global", 90, 24 * 60 * 60_000)).allowed) ||
      !(await rateLimit("email:global", 100, 24 * 60 * 60_000)).allowed) return { ok: false as const, error: "Email limit reached. Please try again later." };
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [to], subject, html }), signal: AbortSignal.timeout(15_000) });
    const result = await response.json();
    if (!response.ok || typeof result.id !== "string") { securityLog("email_send_failed"); return { ok: false as const, error: "Failed to send email." }; }
    return { ok: true as const };
  } catch {
    securityLog("email_send_failed");
    return { ok: false as const, error: "Failed to send email." };
  }
}

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  const url = escapeHtml(resetUrl);
  return sendEmail(to, "Reset your UNILAG Taekwondo Club password", wrapper(`<p>A password reset was requested for your club account.</p><p><a href="${url}">Reset my password</a></p><p>This single-use link expires in one hour. If you did not request a reset, ignore this message.</p><p>If the link does not open, copy this address: ${url}</p>`));
}

export function sendApprovalEmail(to: string, name: string, loginUrl: string) {
  const url = escapeHtml(loginUrl);
  return sendEmail(to, "Your UNILAG Taekwondo membership is approved", wrapper(`<p>Hi ${escapeHtml(name)},</p><p>Your account has been created and approved. You can now sign in to the member portal.</p><p><strong>Login email:</strong> ${escapeHtml(to)}<br /><strong>Initial password:</strong> Your surname in lowercase.</p><p><a href="${url}">Open the member portal</a></p><p>You can update your password in Settings after signing in.</p>`));
}

function wrapper(bodyHtml: string) {
  const logoUrl = escapeHtml(publicUrl("/brand/club-logo.png"));
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <img src="${logoUrl}" alt="UNILAG Taekwondo Club logo" width="64" height="64" style="display: block; width: 64px; height: 64px; border: 0; border-radius: 50%; object-fit: contain; margin: 20px 0 12px;" />
      <h2 style="color: #c8102e; margin-bottom: 4px;">UNILAG Taekwondo Club</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #71717a;">
        University of Lagos Taekwondo Club
      </p>
    </div>
  `;
}

export function sendNotificationEmail(to: string, title: string, message: string, link: string, idempotencyKey?: string) {
  return sendEmail(to, title, wrapper(`<p>${escapeHtml(message).replace(/\r?\n/g, "<br />")}</p><p><a href="${escapeHtml(link)}">Open the member portal</a></p>`), idempotencyKey);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendExternalExaminerInviteEmail(
  to: string,
  examinerName: string,
  gradingTitle: string,
  inviteUrl: string,
  expiresAt: Date
) {
  const safeName = escapeHtml(examinerName);
  const safeTitle = escapeHtml(gradingTitle);
  const safeUrl = escapeHtml(inviteUrl);
  const expiryLabel = escapeHtml(expiresAt.toLocaleString());

  return sendEmail(
    to,
    `External examiner invitation: ${gradingTitle}`,
    wrapper(`
      <p>Hi ${safeName},</p>
      <p>You have been invited to submit marks for <strong>${safeTitle}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}" style="background: #c8102e; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Open grading form
        </a>
      </p>
      <p>This private link expires ${expiryLabel}. It only provides access to this grading event and does not create a club account.</p>
      <p style="font-size: 13px; color: #52525b;">If the button doesn't work, copy this link: ${safeUrl}</p>
    `)
  );
}

export async function sendSetupLinkEmail(to: string, fullName: string, setupUrl: string) {
  const pipelineImageUrl = escapeHtml(`${new URL(setupUrl).origin}/onboarding-pipeline.png`);
  fullName = escapeHtml(fullName);
  setupUrl = escapeHtml(setupUrl);

  return sendEmail(
    to,
    "Activate your UNILAG Taekwondo Club account",
    wrapper(`
      <p>Hi ${fullName},</p>
      <p>Your membership application has been approved. Set your password to activate your account and confirm this email address:</p>
      <p style="margin: 24px 0;">
        <a href="${setupUrl}" style="background: #c8102e; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Set up my account
        </a>
      </p>
      <p style="font-size: 13px; color: #52525b;">If the button doesn't work, copy this link: ${setupUrl}</p>
      <p style="margin-top: 28px; font-size: 14px;">For reference, here is the onboarding process you have just completed:</p>
      <img src="${pipelineImageUrl}" alt="UNILAG Taekwondo Club onboarding pipeline" style="max-width: 100%; border: 1px solid #e4e4e7; border-radius: 8px;" />
    `)
  );
}

export async function sendPasswordChangedEmail(to: string, fullName: string) {
  fullName = escapeHtml(fullName);
  return sendEmail(
    to,
    "Your UNILAG Taekwondo Club password was changed",
    wrapper(`
      <p>Hi ${fullName},</p>
      <p>This confirms your account password was just changed. If this wasn't you, contact the General Secretary immediately.</p>
    `)
  );
}
