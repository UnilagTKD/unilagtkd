"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./login-form";
import { ClubLogo } from "@/components/club-logo";

const SIGNUP_BENEFITS = [
  { icon: "belt", text: "Track your training attendance and belt progress" },
  { icon: "dues", text: "Stay on top of your dues and membership status" },
  { icon: "bell", text: "Get club announcements straight to your dashboard" },
];

function BenefitIcon({ icon }: { icon: string }) {
  const paths: Record<string, ReactNode> = {
    belt: (
      <>
        <path d="M4 4h16" />
        <path d="M8 4v6a4 4 0 0 0 8 0V4" />
        <path d="M9 20h6" />
        <path d="M12 14v6" />
      </>
    ),
    dues: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5a2.5 2.5 0 0 1 2.5-1h.5a2 2 0 1 1 0 4h-1a2 2 0 1 0 0 4h.5a2.5 2.5 0 0 0 2.5-1" />
      </>
    ),
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10.5 20a1.5 1.5 0 0 0 3 0" />
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

export function AuthSplit() {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  function goToSignup() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => router.push("/register"), 860);
  }

  return (
    <div className="auth-card relative grid flex-1 overflow-hidden md:grid-cols-2">
      {/* Left: login form, fades out mid-transition */}
      <div
        className={`flex flex-col justify-center px-4 py-16 transition-opacity duration-500 sm:px-6 md:px-12 ${
          transitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="animate-fade-in-up">
            <ClubLogo size={40} />
            <span className="mt-4 block text-sm font-semibold uppercase tracking-widest text-brand-red">
              Member Login
            </span>
            <h1 className="mt-1 text-4xl font-bold text-brand-black">Welcome Back</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Log in to access your dashboard.
            </p>
          </div>
          <div className="animate-fade-in-up animate-delay-1">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Right: revealed once the overlay slides away */}
      <div className="hidden items-center justify-center px-12 md:flex">
        {transitioning && (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-red/30 border-t-brand-red" />
            <p className="text-sm font-medium text-zinc-500">
              Taking you to the application form...
            </p>
          </div>
        )}
      </div>

      {/* Sliding overlay: 3D page-turn via .auth-overlay/.turn-left in globals.css */}
      <div
        className={`auth-overlay absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden md:block ${
          transitioning ? "turn-left" : ""
        }`}
      >
        <div className="relative flex h-full flex-col justify-center bg-gradient-to-br from-brand-blue-light via-brand-blue to-brand-blue-dark px-4 py-16 text-white sm:px-6 md:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -right-16 -top-16 opacity-10" aria-hidden="true">
            <ClubLogo size={280} />
          </div>

          <div className="relative w-full max-w-md animate-fade-in-up animate-delay-2">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
              Not a Member Yet?
            </span>
            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Train With UNILAG&apos;s Own.
            </h2>
            <p className="mt-3 text-sm text-zinc-200">
              Apply for membership today and get a dashboard of your own the
              moment an administrator approves your application.
            </p>
            <ul className="mt-7 space-y-4 text-sm">
              {SIGNUP_BENEFITS.map((b, i) => (
                <li key={b.text} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                      i % 2 === 0 ? "bg-brand-red" : "bg-white/15"
                    }`}
                  >
                    <BenefitIcon icon={b.icon} />
                  </span>
                  <span className="text-zinc-100">{b.text}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goToSignup}
              disabled={transitioning}
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-blue-dark shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-xl disabled:opacity-70 disabled:hover:translate-y-0"
            >
              Join the Club
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: no split-screen animation, just a plain CTA card */}
      <div className="relative overflow-hidden border-t border-black/10 bg-gradient-to-br from-brand-blue-light via-brand-blue to-brand-blue-dark px-4 py-10 text-white md:hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 opacity-10" aria-hidden="true">
          <ClubLogo size={150} />
        </div>
        <div className="relative">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
            Not a Member Yet?
          </span>
          <h2 className="mt-3 text-2xl font-bold">Train With UNILAG&apos;s Own.</h2>
          <p className="mt-2 text-sm text-zinc-200">
            Apply for membership and get a dashboard of your own once
            you&apos;re approved.
          </p>
          <a
            href="/register"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-blue-dark"
          >
            Join the Club
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
