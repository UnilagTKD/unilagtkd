"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/components/form/fields";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800">
        <p className="font-semibold">Request received.</p>
        <p className="mt-2 leading-relaxed">
          If that address belongs to a club account, the Secretariat has been notified.
          They will confirm your identity and send you a reset link directly, so please
          contact them if you do not hear back.
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

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
