import { auth } from "@/auth";
import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordId } from "@/lib/validation/actions";
import { receiptImageSchema } from "@/lib/validation/admission";
export async function GET(_request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox" };
  const session = await auth(); if (!session?.user) return new Response(null, { status: 404, headers });
  const [account] = await db.select({ position: users.excoPosition }).from(users).where(eq(users.id, session.user.id));
  if (session.user.role !== "admin" && !(["exco"].includes(session.user.role) && account?.position === "treasurer")) return new Response(null, { status: 404, headers });
  const { applicationId } = await params; if (!recordId.safeParse(applicationId).success) return new Response(null, { status: 404, headers });
  const [row] = await db.select({ receipt: applications.paymentReceiptData }).from(applications).where(eq(applications.id, applicationId));
  if (!row?.receipt || !receiptImageSchema.safeParse(row.receipt).success) return new Response(null, { status: 404, headers });
  const mime = row.receipt.slice(5, row.receipt.indexOf(";"));
  return new Response(Buffer.from(row.receipt.slice(row.receipt.indexOf(",")+1), "base64"), { headers: { ...headers, "Content-Type": mime, "Content-Disposition": "inline; filename=payment-receipt" } });
}
