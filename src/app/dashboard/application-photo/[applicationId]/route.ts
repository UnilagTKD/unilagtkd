import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { excoPermissions } from "@/lib/exco";
import { privatePhotoResponse } from "@/lib/member-photo";
import { getExcoPosition } from "@/lib/session";
import { recordId } from "@/lib/validation/actions";

export async function GET(_request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  if (!recordId.safeParse(applicationId).success) return new Response(null, { status: 404 });
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  const { user } = session;
  if (user.role !== "admin" && (
    user.role !== "exco" || !excoPermissions(user.role, await getExcoPosition(user.id)).includes("applications:view")
  )) return new Response(null, { status: 403 });

  const [row] = await db.select({ photo: applications.photoData }).from(applications)
    .where(eq(applications.id, applicationId)).limit(1);
  return privatePhotoResponse(row?.photo);
}
