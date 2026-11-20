import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authConfig } from "@/auth.config";
import { rateLimit, requestRateLimit } from "@/lib/shared-rate-limit";
import { hashToken } from "@/lib/tokens";
import { securityLog } from "@/lib/security-log";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (typeof token.id !== "string") return null;
      const [account] = await db
        .select({ role: users.role, status: users.status, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, token.id))
        .limit(1);
      if (!account || account.status !== "active" || !account.passwordHash) return null;
      const passwordVersion = hashToken(account.passwordHash);
      if (user) token.passwordVersion = passwordVersion;
      if (token.passwordVersion !== passwordVersion) return null;
      token.role = account.role;
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || email.length > 255 || typeof password !== "string" || !password || new TextEncoder().encode(password).length > 72) return null;

        // Bounds credential-stuffing / brute-force against one account,
        // regardless of how many source IPs it comes from. Failing "closed"
        // as a plain invalid-login rather than a distinct error, so an
        // attacker cannot tell the difference from a wrong password.
        const normalizedEmail = email.toLowerCase().trim();
        const connection = await requestRateLimit("login", 50, 5 * 60_000);
        if (!connection.allowed) return null;
        const { allowed } = await rateLimit(`login:${normalizedEmail}`, 10, 5 * 60_000);
        if (!allowed) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (!user || !user.passwordHash || user.status !== "active") return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;
        securityLog("login_succeeded", { actorId: user.id });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
