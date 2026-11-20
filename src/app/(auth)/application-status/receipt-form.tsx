"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoUpload } from "@/components/form/photo-upload";
import { replaceAdmissionReceipt } from "./actions";
export function ReplacementReceiptForm({ token }: { token: string }) {
  const router=useRouter(); const [receipt,setReceipt]=useState(""); const [reference,setReference]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  return <form className="mt-5 space-y-4" onSubmit={async event=>{event.preventDefault();setBusy(true);try{const result=await replaceAdmissionReceipt(token,receipt,reference);setMessage(result.ok?"Receipt submitted for treasurer verification.":result.error||"Could not submit receipt.");if(result.ok)router.refresh();}catch{setMessage("Could not submit. Please try again.");}finally{setBusy(false);}}}>
    <PhotoUpload privateUpload value={receipt} onChange={setReceipt} itemLabel="Replacement receipt" helpText="Receipt image under 1MB, stored privately." previewAlt="Receipt preview" previewClassName="object-contain" />
    <label className="block text-sm">Payment reference<input required minLength={3} maxLength={200} value={reference} onChange={e=>setReference(e.target.value)} className="mt-2 block w-full rounded border p-2" /></label>
    <button disabled={busy||!receipt} className="rounded-full bg-brand-blue px-5 py-2 text-white disabled:opacity-50">{busy?"Submitting…":"Replace receipt"}</button>{message&&<p role="status" className="text-sm">{message}</p>}
  </form>;
}
