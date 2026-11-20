import "server-only";
import { DOMAIN_ORIGINS } from "@/lib/domains";

/** Absolute origin for the current request, for building links sent in email/QR codes. */
export async function getBaseUrl() {
  if (DOMAIN_ORIGINS.portal) return DOMAIN_ORIGINS.portal;
  // Never build emailed recovery links from a client-controlled Host header.
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured) {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid application origin configuration.");
    return url.origin;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Configure AUTH_URL or NEXT_PUBLIC_PORTAL_URL before deployment.");
  return "http://localhost:5213";
}
