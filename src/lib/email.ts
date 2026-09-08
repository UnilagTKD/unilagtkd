import "server-only";
import { Resend } from "resend";

// Sending is a no-op (logged, not thrown) when RESEND_API_KEY is unset, so
// the app keeps working - manual/Secretary-mediated flows still apply - for
// anyone running this without an email provider configured.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM || "UNILAG Taekwondo Club <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set - skipped sending "${subject}" to ${to}`);
    return { ok: false as const, error: "Email is not configured." };
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return { ok: true as const };
  } catch (err) {
    console.error("Failed to send email", err);
    return { ok: false as const, error: "Failed to send email." };
  }
}

function wrapper(bodyHtml: string) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <h2 style="color: #c8102e; margin-bottom: 4px;">UNILAG Taekwondo Club</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #71717a;">
        University of Lagos Taekwondo Club
      </p>
    </div>
  `;
}

export async function sendSetupLinkEmail(to: string, fullName: string, setupUrl: string) {
  const pipelineImageUrl = `${new URL(setupUrl).origin}/onboarding-pipeline.png`;

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
  return sendEmail(
    to,
    "Your UNILAG Taekwondo Club password was changed",
    wrapper(`
      <p>Hi ${fullName},</p>
      <p>This confirms your account password was just changed. If this wasn't you, contact the General Secretary immediately.</p>
    `)
  );
}
