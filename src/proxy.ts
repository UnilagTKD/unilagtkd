import type { NextAuthRequest } from "next-auth";
import type { NextRequest, NextFetchEvent } from "next/server";
import { domainRedirect, isPortalPath } from "@/lib/domains";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomBytes } from "node:crypto";
import { contentSecurityPolicy } from "@/lib/security-headers";

const DASHBOARD_PREFIXES: Record<string, string[]> = {
  "/dashboard/admin": ["admin"],
  "/dashboard/student": ["student", "exco"],
  "/dashboard/coach": ["coach"],
  "/dashboard/exco": ["exco", "admin"],
  "/dashboard/alumni": ["alumni"],
};

const checkDashboard: (request: NextAuthRequest, event: NextFetchEvent) => NextResponse = (req) => {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next({ request: { headers: req.headers } });
  }

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  const matchedPrefix = Object.keys(DASHBOARD_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (matchedPrefix) {
    const allowedRoles = DASHBOARD_PREFIXES[matchedPrefix];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.redirect(
        new URL(`/dashboard/${session.user.role}`, req.nextUrl.origin)
      );
    }
  }

  return NextResponse.next({ request: { headers: req.headers } });
};
const dashboardAuth = auth(checkDashboard);

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (/(?:^|\/)\.(?:git|env|svn|hg)(?:[/.]|$)/i.test(request.nextUrl.pathname)) return new NextResponse(null, { status: 404 });
  // Read the original host before Auth.js applies the configured AUTH_URL.
  const routingUrl = new URL(request.url);
  const requestedHost = request.headers.get("host");
  if (requestedHost) {
    routingUrl.port = "";
    routingUrl.host = requestedHost;
  }
  if (process.env.TRUST_PROXY_HEADERS === "true") {
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (protocol === "http" || protocol === "https") routingUrl.protocol = `${protocol}:`;
  }
  const destination = domainRedirect(routingUrl);
  if (destination) {
    if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.json({ error: "Open this page on its correct site before submitting." }, { status: 421 });
    return NextResponse.redirect(destination);
  }
  const nonce = randomBytes(16).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  const response = request.nextUrl.pathname.startsWith("/dashboard")
    ? (await dashboardAuth(request, event)) ?? NextResponse.next({ request: { headers: request.headers } })
    : NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("Content-Security-Policy", csp);
  if (isPortalPath(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/|brand/|images/|favicon\\.ico|icon\\.png|robots\\.txt|sitemap\\.xml).*)"],
};
