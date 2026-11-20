"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, inputClass } from "@/components/form/fields";
import { PasswordInput } from "@/components/form/password-input";
import { loginAction } from "./actions";

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await loginAction(email, password);
    setLoading(false);

    if (result.ok) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 space-y-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <Field label="Email">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-zinc-400">
            <MailIcon />
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} pl-10`}
            placeholder="you@example.com"
          />
        </div>
      </Field>
      <Field label="Password">
        <PasswordInput
          value={password}
          onChange={setPassword}
          required
          withLockIcon
          autoComplete="current-password"
        />
      </Field>

      <div className="-mt-2 text-right">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-zinc-500 hover:text-brand-red hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-brand-red">
          <span aria-hidden="true">&#9888;</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark disabled:opacity-60"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {loading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
