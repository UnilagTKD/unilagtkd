import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Account Recovery
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black">Forgot Password</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Enter the email on your club account to request a password-reset link.
        If you cannot receive the email, contact admin for manual account recovery.
      </p>

      <ForgotForm />
    </div>
  );
}
