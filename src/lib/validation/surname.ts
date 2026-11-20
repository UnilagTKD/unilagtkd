import { z } from "zod";
export const surnameSchema = z.string().trim().min(1, "Enter the member's surname.").max(100)
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s'’\-]*$/u, "Use letters, spaces, apostrophes, or hyphens for the surname.")
  .refine(value => new TextEncoder().encode(value.toLocaleLowerCase("en")).length <= 72, "Surname is too long for the initial password.");
export function initialSurnamePassword(surname: string) { return surnameSchema.parse(surname).toLocaleLowerCase("en"); }
