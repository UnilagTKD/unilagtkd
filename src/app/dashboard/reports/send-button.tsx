"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMonthlySummary } from "./actions";
export function SendMonthlySummaryButton({month}:{month:string}) {
  const router=useRouter();const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
  return <div><button disabled={busy} className="rounded-full bg-brand-blue px-5 py-2 text-sm text-white disabled:opacity-50" onClick={async()=>{if(!window.confirm(`Send the ${month} summary to the president, coaches, and configured extra email addresses?`))return;setBusy(true);try{const result=await sendMonthlySummary(month);setMessage(`${result.submitted} email(s) submitted this time. Already submitted recipients are not emailed again; failed submissions can be retried.`);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Could not send report.");}finally{setBusy(false);}}}>{busy?"Sending…":"Send / retry monthly summary"}</button>{message&&<p role="status" className="mt-3 text-sm">{message}</p>}</div>;
}
