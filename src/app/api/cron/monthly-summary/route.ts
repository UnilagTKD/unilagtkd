import { timingSafeEqual } from "node:crypto";
import { sendMonthlyReport } from "@/lib/monthly-reports";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return Response.json({ error: "Not authorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try { return Response.json(await sendMonthlyReport(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Monthly summary could not be submitted. Retry from the reports page." }, { status: 500, headers: { "Cache-Control": "no-store" } }); }
}
