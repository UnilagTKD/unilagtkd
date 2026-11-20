import Link from "next/link";
import type { Metadata } from "next";
import { ClubLogo } from "@/components/club-logo";
import { siteHref, portalHref } from "@/lib/domains";
export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };
export default function NotFound() {
  return <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-16 text-center">
    <Link href={siteHref("/")} aria-label="UNILAG Taekwondo Club home"><ClubLogo size={80} preload /></Link>
    <p className="mt-7 text-7xl font-black tracking-tight text-brand-blue sm:text-9xl">404</p>
    <h1 className="mt-4 text-2xl font-bold text-brand-black sm:text-3xl">This page is out of bounds</h1>
    <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600">The page you&apos;re looking for may have moved, or the link may no longer be available.</p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Link href={siteHref("/")} className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white hover:bg-brand-blue-dark">Back to home</Link>
      <Link href={portalHref("/dashboard")} className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-brand-black hover:bg-white">Member portal</Link>
    </div>
    <Link href={siteHref("/contact")} className="mt-6 text-sm font-medium text-brand-red hover:underline">Need help? Contact the club</Link>
  </main>;
}
