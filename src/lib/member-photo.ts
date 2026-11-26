import { desc, eq, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { isRasterImage } from "@/lib/validation/image";

export function memberPhotoReference(column: AnyColumn, source: "profile" | "application") {
  return sql<string | null>`case when ${column} like 'data:%' then ${`/dashboard/member-photo?source=${source}`} else ${column} end`;
}

export function privatePhotoResponse(photo: string | null | undefined) {
  if (!photo || !isRasterImage(photo)) return new Response(null, { status: 404 });
  return new Response(Buffer.from(photo.slice(photo.indexOf(",") + 1), "base64"), {
    headers: {
      "Content-Type": photo.slice(5, photo.indexOf(";")),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function memberPhoto(userId: string, avatarUrl?: string | null) {
  if (avatarUrl) return avatarUrl;

  const [application] = await db
    .select({ photo: memberPhotoReference(applications.photoData, "application") })
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  return application?.photo;
}
