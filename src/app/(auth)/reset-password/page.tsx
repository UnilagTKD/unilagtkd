import type { Metadata } from "next";
import Link from "next/link";
import { checkResetToken } from "./actions";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = token ? await checkResetToken(token) : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Account Recovery
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black">Reset Password</h1>

      {!token || !user ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-zinc-50 p-6 text-sm text-zinc-600">
          This reset link is invalid or has expired. Reset links are single-use and
          valid for 24 hours &mdash;{" "}
          <Link href="/forgot-password" className="text-brand-red hover:underline">
            request another
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-brand-red hover:underline">
            log in
          </Link>
          .
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600">
            Setting a new password for <strong>{user.email}</strong>.
          </p>
          <ResetForm token={token} />
        </>
      )}
    </div>
  );
}
