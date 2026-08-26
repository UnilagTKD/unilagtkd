"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/form/fields";
import { PasswordInput } from "@/components/form/password-input";
import { completeAccountSetup } from "./actions";

export function SetupForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await completeAccountSetup(token, password);

    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800">
        Account activated! You can now{" "}
        <button
          type="button"
          className="font-semibold underline"
          onClick={async () => {
            router.push("/login");
          }}
        >
          log in
        </button>
        .
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="New Password">
        <PasswordInput value={password} onChange={setPassword} required minLength={8} />
      </Field>
      <Field label="Confirm Password">
        <PasswordInput value={confirm} onChange={setConfirm} required minLength={8} />
      </Field>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
      >
        {loading ? "Activating..." : "Activate Account"}
      </button>
    </form>
  );
}
