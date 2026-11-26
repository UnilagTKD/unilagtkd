import { and, eq, sum } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dues } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });

  const [balance] = await db.select({ amount: sum(dues.amount) }).from(dues)
    .where(and(eq(dues.userId, session.user.id), eq(dues.paid, false)));

  return Response.json({ amount: Number(balance?.amount ?? 0) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
