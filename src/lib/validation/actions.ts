import { z } from "zod";
export const recordId = z.string().uuid("Choose a valid record.");
export const reviewNote = z.string().trim().max(2000).optional();
export const paymentReference = z.string().trim().max(150).optional();
export const receiptNumber = z.string().trim().min(1).max(100).optional();
export const money = z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter an amount with at most two decimal places.")
  .refine((value) => Number(value) > 0, "Enter a positive amount.");
export const paymentReportSchema = z.object({ periodLabel: z.string().trim().min(1).max(100), amount: money, reference: paymentReference }).strict();
export const duesChargeSchema = z.object({ userId: z.union([recordId, z.literal("__all__")]), periodLabel: z.string().trim().min(1).max(100), amount: money }).strict();
export const trainingSessionSchema = z.object({
  title: z.string().trim().min(1).max(255), date: z.string().date(),
  startTime: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  location: z.string().trim().max(255).optional(), description: z.string().trim().max(10000).optional(),
}).strict();
export const announcementSchema = z.object({ title: z.string().trim().min(1).max(255), body: z.string().trim().min(1).max(20000), audience: z.enum(["all", "students", "coaches", "exco"]) }).strict();
export const leaveRequestSchema = z.object({
  reasonCategory: z.enum(["injury", "illness", "academics", "travel", "personal"]),
  startDate: z.string().date(), endDate: z.string().date(), details: z.string().trim().min(5).max(10000),
}).strict().refine((data) => data.endDate >= data.startDate, "The end date cannot fall before the start date.");

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your input.");
  return parsed.data;
}
