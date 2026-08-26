"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }
}
