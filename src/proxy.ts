import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const DASHBOARD_PREFIXES: Record<string, string[]> = {
  "/dashboard/student": ["student", "exco", "admin"],
  "/dashboard/coach": ["coach", "admin"],
  "/dashboard/exco": ["exco", "admin"],
  "/dashboard/admin": ["admin"],
  "/dashboard/alumni": ["alumni", "admin"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
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

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
