"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export function SessionTimer() {
  const [remaining, setRemaining] = useState(900);
  useEffect(() => {
    let deadline = Date.now() + 900_000;
    let leaving = false;
    const activity = () => { if (!leaving && Date.now() < deadline) deadline = Date.now() + 900_000; };
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds && !leaving) { leaving = true; void signOut({ callbackUrl: "/login" }); }
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => { clearInterval(timer); events.forEach(event => window.removeEventListener(event, activity)); window.removeEventListener("focus", tick); };
  }, []);
  return <div className={`mb-4 rounded-lg border p-3 text-xs print:hidden ${remaining <= 120 ? "border-red-300 bg-red-50 text-red-800" : "border-blue-100 bg-blue-50 text-blue-900"}`} role="timer" aria-label="Inactivity logout countdown">Automatic logout after inactivity: <strong>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</strong>. Using this page resets the 15-minute timer.</div>;
}
