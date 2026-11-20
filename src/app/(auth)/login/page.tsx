import type { Metadata } from "next";
import { AuthSplit } from "./auth-split";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return <AuthSplit />;
}
