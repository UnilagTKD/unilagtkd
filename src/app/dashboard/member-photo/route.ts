import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { applications, memberProfiles } from "@/db/schema";
import { privatePhotoResponse } from "@/lib/member-photo";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });

  const source = new URL(request.url).searchParams.get("source");
  if (source !== "profile" && source !== "application") return new Response(null, { status: 404 });

  const userId = session.user.id;
  const [row] = source === "application"
    ? await db.select({ photo: applications.photoData }).from(applications)
      .where(eq(applications.userId, userId)).orderBy(desc(applications.createdAt)).limit(1)
    : await db.select({ photo: memberProfiles.avatarUrl }).from(memberProfiles)
      .where(eq(memberProfiles.userId, userId)).limit(1);
  return privatePhotoResponse(row?.photo);
}
