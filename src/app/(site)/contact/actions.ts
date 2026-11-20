"use server";
import { afterAccountAction } from "@/lib/action-notifications";

import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { verifyBotProtection } from "@/lib/bot-protection";
import { securityLog } from "@/lib/security-log";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(150),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().max(255).optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(10000),
});

export type SubmitContactResult = { ok: true } | { ok: false; error: string };

async function submitContactMessageCore(input: unknown, protection?: unknown): Promise<SubmitContactResult> {
  const { allowed } = await requestRateLimit("contact", 5, 60 * 60_000);
  if (!allowed) {
    return { ok: false, error: "Too many messages from this connection. Please try again later." };
  }

  if (!(await verifyBotProtection(protection, "contact"))) return { ok: false, error: "Please complete the form verification and try again." };
  const parsed = contactSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Please check the form for errors and try again." };
  }

  try {
    await db.insert(contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase().trim(),
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });
    return { ok: true };
  } catch {
    securityLog("contact_submit_failed");
    return { ok: false, error: "Something went wrong sending your message. Please try again." };
  }
}

export async function submitContactMessage(...args: Parameters<typeof submitContactMessageCore>) {
const result = await submitContactMessageCore(...args);
await afterAccountAction("submitContactMessage", args, result);
return result;
}
