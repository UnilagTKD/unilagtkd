"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMonthlyReportEmails } from "./actions";
export function ReportRecipientForm({ automatic, extra }: { automatic: string[]; extra: string[] }) {
  const router=useRouter(); const [emails,setEmails]=useState(extra.join("\n")); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  return <form className="space-y-3 rounded-xl border bg-white p-5" onSubmit={async event=>{event.preventDefault();setBusy(true);try{await saveMonthlyReportEmails(emails);setMessage("Recipients saved.");router.refresh();}catch{setMessage("Could not save. Enter up to 10 valid email addresses and try again.");}finally{setBusy(false);}}}>
    <h2 className="font-semibold">Recipients</h2><p className="break-all text-sm">President and coaches: {automatic.join(", ")||"No active president or coach accounts"}</p>
    <label className="block text-sm">Additional email addresses<textarea value={emails} onChange={event=>setEmails(event.target.value)} rows={3} maxLength={3000} placeholder="One email per line; up to 10" className="mt-2 block w-full rounded border p-2" /></label>
    <p className="text-xs text-zinc-500">These addresses receive the aggregate summary by email, without portal access. Remove an address to exclude it from future sends.</p><button disabled={busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-50">{busy?"Saving…":"Save extra emails"}</button>{message&&<p role="status" className="text-sm">{message}</p>}
  </form>;
}
