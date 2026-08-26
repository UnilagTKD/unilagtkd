import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no database imports) used by middleware.
// The Credentials provider (which needs `db`) is added in `auth.ts`,
// which is only ever loaded in Node runtimes (API routes, server components).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "student" | "coach" | "exco" | "admin";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
