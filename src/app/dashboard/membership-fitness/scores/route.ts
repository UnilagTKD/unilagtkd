import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberProfiles, membershipFitness } from "@/db/schema";
import { canValidateMembershipFitness } from "@/lib/exco";
import { getExcoPosition } from "@/lib/session";
import { recordId } from "@/lib/validation/actions";

const score = z.string().regex(/^\d{1,4}$/, "Enter a whole number from 0 to 9999.").transform(Number);
const scores = z.object({
  userId: recordId,
  jumpingJacks: score,
  pushUps: score,
  sitUps: score,
  burpees: score,
  shuttle: z.enum(["pass", "fail"]),
});

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return Response.json({ error: "Submit the scores from the Membership Fitness form." }, { status: 415 });
  }

  const session = await auth();
  if (!session?.user) return Response.json({ error: "Sign in to validate scores." }, { status: 401 });
  const { user } = session;
  const position = await getExcoPosition(user.id);
  if (!canValidateMembershipFitness(user.role, position)) {
    return Response.json({ error: "You do not have permission to validate fitness scores." }, { status: 403 });
  }

  const parsed = scores.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { userId, jumpingJacks, pushUps, sitUps, burpees, shuttle } = parsed.data;
  const [member] = await db.select({ id: memberProfiles.userId }).from(memberProfiles)
    .where(eq(memberProfiles.userId, userId)).limit(1);
  if (!member) return Response.json({ error: "Choose an existing member." }, { status: 404 });

  const result = { jumpingJacks, pushUps, sitUps, burpees, shuttlePassed: shuttle === "pass", validatedBy: user.id, validatedAt: new Date() };
  await db.insert(membershipFitness).values({ userId, ...result })
    .onConflictDoUpdate({ target: membershipFitness.userId, set: result });
  revalidatePath("/dashboard/membership-form");
  revalidatePath("/dashboard/membership-fitness");
  return Response.json({ ok: true });
}
