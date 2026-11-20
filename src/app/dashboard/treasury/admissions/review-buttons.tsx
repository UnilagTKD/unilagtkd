"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewAdmissionPayment } from "./actions";
export function AdmissionReviewButtons({ id }: { id: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function decide(decision: "confirmed" | "declined") {
    const note = decision === "declined" ? window.prompt("Why could this payment not be confirmed?") : "";
    if (note === null || (decision === "confirmed" && !window.confirm("Confirm that the actual ₦5,000 transfer was received for this applicant?"))) return;
    setBusy(true); setError("");
    try { await reviewAdmissionPayment(id, decision, note); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not review payment."); }
    finally { setBusy(false); }
  }
  return <div><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy} onClick={() => decide("confirmed")} className="rounded-full bg-brand-blue px-4 py-2 text-sm text-white disabled:opacity-50">Confirm payment</button><button disabled={busy} onClick={() => decide("declined")} className="rounded-full border px-4 py-2 text-sm disabled:opacity-50">Decline</button></div>{error && <p role="alert" className="mt-2 text-sm text-brand-red">{error}</p>}</div>;
}
