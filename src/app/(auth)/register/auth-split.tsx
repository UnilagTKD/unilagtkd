"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "./register-form";
import { ClubLogo } from "@/components/club-logo";

const WHY_JOIN = [
  { icon: "target", text: "Train under certified coaches in Kyorugi, Poomsae, and Ho Shin Sul" },
  { icon: "trophy", text: "Compete for UNILAG at NUGA and other national tournaments" },
  { icon: "users", text: "Join a community built on the five tenets of Taekwondo" },
];

function WhyJoinIcon({ icon }: { icon: string }) {
  const paths: Record<string, ReactNode> = {
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
        <path d="M8 5H5a2 2 0 0 0 2 3.5M16 5h3a2 2 0 0 1-2 3.5" />
        <path d="M12 13v3M9 20h6M10 20v-2a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15.5 14.2c2.3.4 4 2.3 4.5 5.8" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      {paths[icon]}
    </svg>
  );
}

type SubCommittee = { id: string; name: string; description: string | null };

export function AuthSplit({ subCommittees, semester }: { subCommittees: SubCommittee[]; semester: { label: string; amount: string } }) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  function goToLogin() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => router.push("/login"), 860);
  }

  return (
    <div className="auth-card relative lg:grid lg:flex-1 lg:grid-cols-2">
      {/* Mobile/tablet: no split-screen animation, just a plain CTA card (form stays full-width and single-column below lg, since it has dense multi-column field grids that need room) */}
      <div className="relative overflow-hidden border-b border-black/10 bg-gradient-to-br from-brand-red-light via-brand-red to-brand-red-dark px-4 py-10 text-white sm:px-6 lg:hidden">
        <div className="pointer-events-none absolute -left-10 -top-10 opacity-10" aria-hidden="true">
          <ClubLogo size={150} />
        </div>
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
            Already a Member?
          </span>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Welcome back, Champ.</h2>
          <p className="mt-2 text-sm text-zinc-200">
            Your dashboard is right where you left it.
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-red-dark"
          >
            Log In
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>

      {/* Left column: red panel, pinned to the viewport while the form scrolls */}
      <div
        className={`auth-overlay hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-screen ${
          transitioning ? "turn-right" : ""
        }`}
      >
        <div className="relative flex h-full flex-col justify-center bg-gradient-to-br from-brand-red-light via-brand-red to-brand-red-dark px-8 py-16 text-white xl:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -left-16 -top-16 opacity-10" aria-hidden="true">
            <ClubLogo size={220} />
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-in-up">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
              Already a Member?
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight">Welcome back, Champ.</h1>
            <p className="mt-3 text-sm text-zinc-200">
              Your dashboard, training log, and dues are right where you left
              them. Log back in to pick up where you left off.
            </p>

            <div className="mt-8">
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Why Join
              </span>
              <ul className="mt-4 space-y-4 text-sm">
                {WHY_JOIN.map((w, i) => (
                  <li key={w.text} className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                        i % 2 === 0 ? "bg-brand-blue" : "bg-white/15"
                      }`}
                    >
                      <WhyJoinIcon icon={w.icon} />
                    </span>
                    <span className="text-zinc-100">{w.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={goToLogin}
              disabled={transitioning}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-red-dark shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-xl disabled:opacity-70 disabled:hover:translate-y-0"
            >
              Log In
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: the actual registration form, fades during transition */}
      <div
        className={`px-4 pb-14 pt-10 transition-opacity duration-500 sm:px-6 lg:px-8 lg:pb-16 lg:pt-32 xl:px-12 ${
          transitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="mx-auto max-w-2xl">
          <div className="animate-fade-in-up">
            <ClubLogo size={40} />
            <span className="mt-4 block text-sm font-semibold uppercase tracking-widest text-brand-red">
              Join the Club
            </span>
            <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">
              Membership Registration &amp; Liability Waiver
            </h1>
            <p className="mt-4 text-zinc-600">
              Complete the form below to apply for membership. Your
              application will be reviewed by an administrator.
              You&apos;ll be contacted once it has been processed. This
              combines the club&apos;s Membership Application (UTC-A01) and
              Liability Waiver (UTC-W01).
            </p>
          </div>

          <div className="animate-fade-in-up animate-delay-1">
            <RegisterForm subCommittees={subCommittees} semester={semester} />
          </div>
        </div>
      </div>
    </div>
  );
}
