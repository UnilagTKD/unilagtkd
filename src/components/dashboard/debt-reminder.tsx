"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { naira } from "@/lib/currency";

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const DISPLAY_DURATION_MS = 20 * 1000;

export function DebtReminder() {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let hideTimer: number | undefined;

    async function checkBalance() {
      if (document.hidden) return;

      try {
        const response = await fetch("/dashboard/outstanding-balance", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok || controller.signal.aborted) return;
        const { amount } = await response.json();
        if (controller.signal.aborted || document.hidden) return;

        window.clearTimeout(hideTimer);
        setAmount(amount);
        if (amount > 0) {
          hideTimer = window.setTimeout(() => setAmount(0), DISPLAY_DURATION_MS);
        }
      } catch {
        // Retry at the next reminder interval.
      }
    }

    void checkBalance();
    const interval = window.setInterval(checkBalance, REMINDER_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-80 print:hidden">
      <div role="status">
        {amount > 0 && (
          <div className="pointer-events-auto rounded-xl border border-brand-red/30 bg-white p-4 text-sm shadow-lg">
            <p className="font-semibold text-brand-black">Outstanding balance</p>
            <p className="mt-1 text-zinc-700">You have {naira.format(amount)} in unpaid charges.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link href="/dashboard/payments" onClick={() => setAmount(0)} className="font-semibold text-brand-blue underline">
                View Payments
              </Link>
              <button type="button" onClick={() => setAmount(0)} className="font-medium text-zinc-600 underline">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
