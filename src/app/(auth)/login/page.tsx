import type { Metadata } from "next";
import { AuthSplit } from "./auth-split";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return <AuthSplit callbackUrl={callbackUrl} />;
}
