import "server-only";
import { headers } from "next/headers";

/** Absolute origin for the current request, for building links sent in email/QR codes. */
export async function getBaseUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) return process.env.NEXTAUTH_URL ?? "http://localhost:5213";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
