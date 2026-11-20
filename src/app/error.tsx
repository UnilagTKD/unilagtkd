"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-lg px-4 py-16 text-center">
    <h1 className="text-2xl font-bold">Something went wrong</h1>
    <p className="mt-3 text-sm text-zinc-600">We couldn&apos;t complete this request. Please try again.</p>
    <button onClick={reset} className="mt-6 rounded-full bg-brand-blue px-6 py-2 text-white">Try again</button>
  </div>;
}
