"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/form/fields";
import { submitContactMessage } from "./actions";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const result = await submitContactMessage({
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      subject: String(form.get("subject") || ""),
      message: String(form.get("message") || ""),
    });

    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
      e.currentTarget.reset();
    } else {
      setError(result.error);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-800">
        Thanks for reaching out. Your message has been sent to the club.
        We&apos;ll get back to you soon.
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-3 block font-medium underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Email">
          <input type="email" name="email" required className={inputClass} />
        </Field>
      </div>
      <Field label="Subject (optional)">
        <input name="subject" className={inputClass} />
      </Field>
      <Field label="Message">
        <textarea name="message" required rows={5} className={inputClass} />
      </Field>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
      >
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
