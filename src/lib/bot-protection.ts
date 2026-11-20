import "server-only";
import { z } from "zod";
import { DOMAIN_ORIGINS } from "@/lib/domains";
import { securityLog } from "@/lib/security-log";

const schema = z.object({ website: z.string().max(500), token: z.string().max(2048) }).strict();

export async function verifyBotProtection(input: unknown, action: "register" | "contact") {
  const parsed = schema.safeParse(input);
  if (!parsed.success || parsed.data.website !== "") return false;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!parsed.data.token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: parsed.data.token }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json();
    const hosts = [DOMAIN_ORIGINS.site, DOMAIN_ORIGINS.portal, process.env.AUTH_URL, process.env.NEXTAUTH_URL]
      .filter(Boolean).map((url) => new URL(url!).hostname);
    return response.ok && result.success === true && result.action === action && hosts.includes(result.hostname);
  } catch { securityLog("bot_verification_unavailable"); return false; }
}
