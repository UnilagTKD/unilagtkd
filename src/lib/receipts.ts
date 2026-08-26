import { and, eq, isNotNull, like } from "drizzle-orm";
import { db } from "@/db";
import { dues } from "@/db/schema";

/**
 * Official club receipt number, in the UTC-R series the Secretariat quotes to
 * members: UTC-R/2026/0001.
 *
 * Numbering restarts each calendar year and is derived from the highest number
 * already issued in that year, so a deleted or voided row never causes a reuse.
 */
export function receiptPrefix(year = new Date().getFullYear()) {
  return `UTC-R/${year}/`;
}

export async function nextReceiptNo(year = new Date().getFullYear()) {
  const prefix = receiptPrefix(year);

  const issued = await db
    .select({ receiptNo: dues.receiptNo })
    .from(dues)
    .where(and(isNotNull(dues.receiptNo), like(dues.receiptNo, `${prefix}%`)));

  const highest = issued.reduce((max, row) => {
    const n = Number((row.receiptNo ?? "").slice(prefix.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

/** True when this receipt number is already on another dues row. */
export async function receiptNoTaken(receiptNo: string, exceptDuesId?: string) {
  const rows = await db
    .select({ id: dues.id })
    .from(dues)
    .where(eq(dues.receiptNo, receiptNo));

  return rows.some((r) => r.id !== exceptDuesId);
}
