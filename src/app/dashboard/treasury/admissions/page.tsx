import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { getExcoContext } from "@/lib/session";
import { getSemesterDues } from "@/lib/semester-dues";
import { saveSemesterLabel } from "./actions";
import { AdmissionReviewButtons } from "./review-buttons";
export default async function AdmissionPaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const context = await getExcoContext(); if (context.user.role !== "admin" && !context.can("dues:manage")) redirect("/dashboard");
  const semester = await getSemesterDues(); const input = (await searchParams).page; const page = input && /^[1-9]\d{0,5}$/.test(input) ? Number(input) : 1;
  const filter = and(eq(applications.status, "pending"), eq(applications.paymentStatus, "pending"));
  const [rows, [total]] = await Promise.all([db.select({ id: applications.id, name: applications.fullName, email: applications.email, semester: applications.semesterLabel, amount: applications.semesterDues, reference: applications.paymentReference }).from(applications).where(filter).orderBy(desc(applications.createdAt), desc(applications.id)).limit(20).offset((page - 1)*20), db.select({ value: count() }).from(applications).where(filter)]);
  return <div className="max-w-4xl space-y-6"><header><h1 className="text-2xl font-bold">Registration dues verification</h1><p className="mt-2 text-sm text-zinc-600">Verify the actual transfer before confirming a receipt. Admin can approve an account only after confirmation.</p></header>
    <form action={saveSemesterLabel} className="space-y-3 rounded-xl border bg-white p-5"><label className="block text-sm font-medium">Semester name<input name="label" defaultValue={semester.label} required maxLength={150} className="mt-2 block w-full rounded border p-2" /></label><p className="text-sm">Semester dues: ₦5,000. A new label applies to future applications; existing applications retain their submitted semester.</p><button className="rounded-full bg-brand-blue px-4 py-2 text-sm text-white">Save semester name</button></form>
    {rows.map(row => <section key={row.id} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{row.name}</h2><p className="break-all text-sm">{row.email}</p><p className="mt-2 text-sm">{row.semester} · ₦{Number(row.amount || 0).toLocaleString("en-NG")} · Reference: {row.reference || "Not supplied"}</p><a href={`/api/admission-receipts/${row.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-blue underline">View private payment receipt</a><AdmissionReviewButtons id={row.id} /></section>)}
    {!rows.length && <p>No receipts awaiting verification.</p>}<nav className="flex gap-4 text-brand-blue">{page>1&&<Link href={`?page=${page-1}`}>Previous</Link>}{page*20<total.value&&<Link href={`?page=${page+1}`}>Next</Link>}</nav>
  </div>;
}
