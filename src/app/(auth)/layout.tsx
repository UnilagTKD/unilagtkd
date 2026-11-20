import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";
export const metadata: Metadata = { robots: PRIVATE_ROBOTS };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="flex min-h-dvh flex-1 flex-col">{children}</main>;
}
