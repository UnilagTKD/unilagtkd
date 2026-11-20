"use client";

import { siteHref } from "@/lib/domains";
import Link from "next/link";
import { useState } from "react";
import { ClubLogo } from "@/components/club-logo";

type NavLink = { href: string; label: string };

export function DashboardMobileNav({
  navLinks,
  email,
  role,
  signOutAction,
}: {
  navLinks: NavLink[];
  email: string;
  role: string;
  signOutAction: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-brand-blue lg:hidden print:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href={siteHref("/")} className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <ClubLogo size={28} />
          <span className="text-sm font-semibold text-white">UNILAG TKD</span>
        </Link>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/30"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="dashboard-mobile-menu"
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
        <div id="dashboard-mobile-menu" className="sidebar-scroll max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/15 px-4 py-3">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-white hover:bg-white/15"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-white/15 pt-3">
            <div className="mb-3 break-words text-xs text-blue-100">
              Signed in as <span className="font-medium text-white">{email}</span>
              <br />
              Role: <span className="uppercase text-blue-100">{role}</span>
            </div>
            <Link
              href={siteHref("/")}
              onClick={() => setOpen(false)}
              className="mb-2 block rounded-lg border border-white/30 px-3 py-2 text-center text-sm font-medium text-white hover:bg-white/15"
            >
              &larr; Back to site
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-lg border border-white/30 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
