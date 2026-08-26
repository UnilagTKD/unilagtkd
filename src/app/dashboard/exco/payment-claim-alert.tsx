"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPendingClaimsCount } from "../actions";

const POLL_INTERVAL_MS = 20000;

function playBeep() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio unavailable (unsupported browser, no user gesture yet) - fail silently.
  }
}

export function PaymentClaimAlert({ initialCount }: { initialCount: number }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [justArrived, setJustArrived] = useState(false);
  const lastSeenRef = useRef(initialCount);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latest = await getPendingClaimsCount();
        setCount(latest);
        if (latest > lastSeenRef.current) {
          playBeep();
          setJustArrived(true);
          router.refresh();
        }
        lastSeenRef.current = latest;
      } catch {
        // Transient failure (network blip, session hiccup) - try again next tick.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  if (count === 0) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
        justArrived
          ? "border-brand-red/40 bg-red-50 text-brand-red-dark"
          : "border-yellow-300 bg-yellow-50 text-yellow-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-2 w-2 flex-none rounded-full ${
            justArrived ? "animate-pulse bg-brand-red" : "bg-yellow-500"
          }`}
        />
        <span className="font-medium">
          {count} payment {count === 1 ? "claim" : "claims"} awaiting confirmation
        </span>
      </div>
      {justArrived && (
        <button
          type="button"
          onClick={() => setJustArrived(false)}
          className="flex-none text-xs font-semibold underline"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
