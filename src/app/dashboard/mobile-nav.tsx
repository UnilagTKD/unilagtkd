"use client";

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
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white sm:hidden print:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <ClubLogo size={28} />
          <span className="text-sm font-semibold text-brand-black">UNILAG TKD</span>
        </Link>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="sr-only">Menu</span>
          <div className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-brand-black" />
            <span className="h-0.5 w-5 bg-brand-black" />
            <span className="h-0.5 w-5 bg-brand-black" />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-black/10 px-4 py-3">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-black/10 pt-3">
            <div className="mb-3 text-xs text-zinc-500">
              Signed in as <span className="font-medium text-zinc-700">{email}</span>
              <br />
              Role: <span className="uppercase text-brand-red">{role}</span>
            </div>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mb-2 block rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              &larr; Back to site
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
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
