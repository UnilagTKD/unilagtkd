import Link from "next/link";
import { ClubLogo } from "@/components/club-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <ClubLogo size={64} />
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-red">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold text-brand-black">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        Back to home
      </Link>
    </div>
  );
}
