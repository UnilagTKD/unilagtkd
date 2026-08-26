import type { Metadata } from "next";
import Link from "next/link";
import { checkSetupToken } from "./actions";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Activate Your Account" };

export default async function SetupAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const application = token ? await checkSetupToken(token) : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Welcome to the Club
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black">Activate Your Account</h1>

      {!token || !application ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-zinc-50 p-6 text-sm text-zinc-600">
          This setup link is invalid or has expired. Please contact the
          Executive Committee, or{" "}
          <Link href="/login" className="text-brand-red hover:underline">
            log in
          </Link>{" "}
          if your account is already active.
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600">
            Your membership application has been approved,{" "}
            <strong>{application.fullName}</strong>. Set a password below to
            activate your dashboard access.
          </p>
          <SetupForm token={token} />
        </>
      )}
    </div>
  );
}
