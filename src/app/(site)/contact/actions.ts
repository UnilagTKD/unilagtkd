"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type SubmitContactResult = { ok: true } | { ok: false; error: string };

export async function submitContactMessage(input: unknown): Promise<SubmitContactResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(`contact:${ip}`, 5, 60 * 60_000);
  if (!allowed) {
    return { ok: false, error: "Too many messages from this connection. Please try again later." };
  }

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
  } catch (err) {
    console.error("Failed to submit contact message", err);
    return { ok: false, error: "Something went wrong sending your message. Please try again." };
  }
}
