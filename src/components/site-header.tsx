"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ClubLogo } from "./club-logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/structure", label: "Structure" },
  { href: "/gallery", label: "Gallery" },
  { href: "/achievements", label: "Achievements" },
  { href: "/alumni", label: "Alumni" },
  { href: "/insights", label: "Insights" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ dashboardHref }: { dashboardHref?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-brand-blue-light to-brand-blue-dark shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ClubLogo size={36} />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">UNILAG</span>
            <span className="text-[11px] uppercase tracking-widest text-brand-red">
              Taekwondo Club
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-3 text-[13px] font-medium min-[900px]:flex lg:gap-5 lg:text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-brand-red"
                  : "text-zinc-200 hover:text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 min-[900px]:flex">
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-200 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark"
              >
                Join the Club
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 min-[900px]:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="sr-only">Menu</span>
          <div className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-white" />
            <span className="h-0.5 w-5 bg-white" />
            <span className="h-0.5 w-5 bg-white" />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-brand-blue-dark px-4 py-3 min-[900px]:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-zinc-200">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
              {dashboardHref ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-brand-red px-4 py-2 text-center text-white"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="hover:text-white">
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-brand-red px-4 py-2 text-center text-white"
                  >
                    Join the Club
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
