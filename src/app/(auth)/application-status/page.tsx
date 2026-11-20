import Link from "next/link";
import { getTrackedApplication } from "@/lib/admission-tracking";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { ReplacementReceiptForm } from "./receipt-form";
export default async function ApplicationStatusPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const token=(await searchParams).token||"";
  const application=(await requestRateLimit("admission-track",60,900000)).allowed?await getTrackedApplication(token):null;
  return <section className="mx-auto w-full max-w-xl px-5 py-12"><h1 className="text-2xl font-bold">Application status</h1>{!application?<p className="mt-5">This tracking link is invalid, expired, or the account has already been approved. <Link href="/login" className="text-brand-blue underline">Log in</Link></p>:<div className="mt-5 rounded-xl border bg-white p-5"><h2 className="font-semibold">{application.fullName}</h2><p className="mt-2">{application.semester} · ₦{Number(application.amount).toLocaleString("en-NG")}</p><p className="mt-2">Payment: {application.paymentStatus}. Account application: {application.status}.</p>{application.reviewNote&&<p className="mt-3 text-sm">Treasurer note: {application.reviewNote}</p>}{application.status==="pending"&&application.paymentStatus!=="confirmed"&&<ReplacementReceiptForm token={token}/>}</div>}</section>;
}
