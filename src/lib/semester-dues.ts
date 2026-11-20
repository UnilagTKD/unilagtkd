import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clubSettings } from "@/db/schema";
export const SEMESTER_DUES_AMOUNT = "5000.00";
export async function getSemesterDues() {
  const [setting] = await db.select().from(clubSettings).where(eq(clubSettings.key, "semester-dues"));
  return { label: typeof setting?.value.label === "string" ? setting.value.label : "Current semester", amount: SEMESTER_DUES_AMOUNT };
}
