import type { DefaultSession } from "next-auth";

export type UserRole = "student" | "coach" | "exco" | "alumni" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    passwordVersion?: string;
    id: string;
    role: UserRole;
  }
}
