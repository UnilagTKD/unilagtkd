import Link from "next/link";
import { ClubLogo } from "./club-logo";
import { AffiliationBadges } from "./affiliation-badges";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-gradient-to-b from-brand-blue-dark to-brand-black text-zinc-300">
      <div className="h-1 w-full bg-brand-red" />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <ClubLogo size={36} />
            <span className="font-semibold text-white">UNILAG Taekwondo Club</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-zinc-400">
            The official Taekwondo Club of the University of Lagos. Courtesy,
            Integrity, Perseverance, Self-Control, Indomitable Spirit.
          </p>
          <div className="mt-4">
            <AffiliationBadges variant="dark" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Explore
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-brand-red">About the Club</Link></li>
            <li><Link href="/structure" className="hover:text-brand-red">Club Structure</Link></li>
            <li><Link href="/gallery" className="hover:text-brand-red">Gallery</Link></li>
            <li><Link href="/achievements" className="hover:text-brand-red">Achievements</Link></li>
            <li><Link href="/alumni" className="hover:text-brand-red">Alumni</Link></li>
            <li><Link href="/insights" className="hover:text-brand-red">Insights</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Get Involved
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/register" className="hover:text-brand-red">Membership Registration</Link></li>
            <li><Link href="/contact" className="hover:text-brand-red">Contact Us</Link></li>
            <li><Link href="/login" className="hover:text-brand-red">Member Login</Link></li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 items-center gap-2 border-t border-white/10 px-4 py-4 text-center text-xs text-white sm:grid-cols-3 sm:px-6">
        <span className="sm:justify-self-start">
          &copy; {new Date().getFullYear()} UNILAG Taekwondo Club, University of Lagos.
        </span>
        <span className="sm:justify-self-center">
          Developed by{" "}
          <a
            href="https://shabbaz.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-brand-red"
          >
            Shabbaz
          </a>
        </span>
        <Link href="/privacy" className="hover:text-brand-red sm:justify-self-end">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
