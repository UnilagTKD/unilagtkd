"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DashboardNavLink = { href: string; label: string };

export function DashboardNavLinks({ links, className, onNavigate }: {
  links: DashboardNavLink[];
  className: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname().replace(/\/$/, "");
  const current = links.reduce<DashboardNavLink | undefined>((match, link) => {
    const matches = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return matches && (!match || link.href.length > match.href.length) ? link : match;
  }, undefined);

  return (
    <nav aria-label="Dashboard" className={className}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          aria-current={link === current ? (pathname === link.href ? "page" : "location") : undefined}
          className={`rounded-lg px-3 py-2 text-white ${link === current ? "bg-brand-red-dark" : "hover:bg-white/15"}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
