"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/form/fields";
import { submitContactMessage } from "./actions";
import { BotProtection, type BotProtectionInput } from "@/components/form/bot-protection";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [protection, setProtection] = useState<BotProtectionInput>({ website: "", token: "" });
  const [protectionVersion, setProtectionVersion] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    try {
    const result = await submitContactMessage({
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      subject: String(form.get("subject") || ""),
      message: String(form.get("message") || ""),
    }, protection);

    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
      formElement.reset();
    } else {
      setError(result.error);
    }
    } catch { setError("Could not send your message. Please try again."); }
    finally { setSubmitting(false); setProtectionVersion((version) => version + 1); }
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
      <BotProtection key={protectionVersion} action="contact" onChange={setProtection} />

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
