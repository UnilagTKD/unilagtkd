import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { galleryItems, insights } from "@/db/schema";
import { recordId } from "@/lib/validation/actions";
import { isRasterImage } from "@/lib/validation/image";
import { imageVersion } from "@/lib/public-content";
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!recordId.safeParse(id).success || !["gallery", "insights"].includes(kind)) return new Response(null, { status: 404 });
  // Only already-public CMS images. Member photos/signatures are never exposed.
  const [row] = kind === "gallery" ? await db.select({ image: galleryItems.imageUrl }).from(galleryItems).where(eq(galleryItems.id, id)).limit(1)
    : await db.select({ image: insights.coverImageUrl }).from(insights).where(eq(insights.id, id)).limit(1);
  const value = row?.image;
  if (!value || !isRasterImage(value) || request.nextUrl.searchParams.get("v") !== imageVersion(value)) return new Response(null, { status: 404 });
  const etag = `"${imageVersion(value)}"`;
  const headers = { "Content-Type": value.slice(5, value.indexOf(";")), "Cache-Control": "public, max-age=86400, immutable", ETag: etag, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(Buffer.from(value.slice(value.indexOf(",") + 1), "base64"), { headers });
}
