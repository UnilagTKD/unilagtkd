"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/components/form/fields";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await requestPasswordReset(email);
      if (result.ok) { setEmailEnabled(result.emailEnabled); setSent(true); }
      else setError(result.error);
    } catch { setError("We couldn't send your request. Please try again or contact admin."); }
    finally { setLoading(false); }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800">
        <p className="font-semibold">Request received.</p>
        <p className="mt-2 leading-relaxed">
          {emailEnabled ? "If that address belongs to an active club account, check your inbox and spam folder for a reset link. If no email arrives, contact admin for manual recovery." : "If that address belongs to an active club account, admin will see the recovery request. Contact admin to verify your identity and receive a reset link."}
        </p>
        <p className="mt-3">
          <Link href="/login" className="font-semibold underline">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
      >
        {loading ? "Sending..." : "Request Password Reset"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
