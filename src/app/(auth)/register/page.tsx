import type { Metadata } from "next";
import { db } from "@/db";
import { subCommittees } from "@/db/schema";
import { asc } from "drizzle-orm";
import { AuthSplit } from "./auth-split";

export const metadata: Metadata = { title: "Membership Registration" };

export default async function RegisterPage() {
  const committees = await db.select().from(subCommittees).orderBy(asc(subCommittees.name));

  return <AuthSplit subCommittees={committees} />;
}
