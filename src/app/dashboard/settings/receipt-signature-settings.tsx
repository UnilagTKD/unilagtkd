"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoUpload } from "@/components/form/photo-upload";
import { saveReceiptSignature } from "./actions";
export function ReceiptSignatureSettings({ initialSignatureUrl }: { initialSignatureUrl: string }) {
  const [signature, setSignature] = useState(initialSignatureUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setSaved(false);
    try {
      const result = await saveReceiptSignature(signature);
      if (result.ok) { setSaved(true); router.refresh(); } else setError(result.error);
    } catch { setError("Could not save your receipt signature. Please try again."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
    <h2 className="font-semibold text-brand-black">Receipt signature</h2>
    <p className="text-sm text-zinc-600">Upload your signature before confirming payments and issuing receipts. Use a clear signature on a plain background, under 2MB.</p>
    <PhotoUpload value={signature} onChange={value => { setSignature(value); setSaved(false); setError(null); }} itemLabel="Signature" previewAlt="Receipt signature preview" previewClassName="object-contain bg-white p-1" noValueLabel={"No signature\nuploaded"} helpText="Your saved signature will be printed on receipts you issue." />
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {saved && <p role="status" className="text-sm text-green-700">Receipt signature saved. You can now issue receipts.</p>}
    <button type="submit" disabled={saving || !signature} className="w-full rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">{saving ? "Saving..." : "Save Receipt Signature"}</button>
  </form>;
}
