import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createHash } from "node:crypto";
import { asc, count, desc, eq, and, inArray, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { achievements, galleryItems, insights, leadership, subCommittees, users } from "@/db/schema";
import { MEMBER_ROLES } from "@/lib/roles";
export const PUBLIC_CONTENT_TAG = "public-content";
export const GALLERY_PAGE_SIZE = 24, INSIGHTS_PAGE_SIZE = 12;
const options = { tags: [PUBLIC_CONTENT_TAG], revalidate: 300 };
export function imageVersion(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 16); }
export function publicImageSource(kind: "gallery" | "insights", id: string, value: string | null) {
  return value?.startsWith("data:") ? `/media/${kind}/${id}?v=${imageVersion(value)}` : value;
}
// Build a public media reference inside SQL so base64 uploads are not copied
// across the database connection or into a page's HTML/React payload.
function imageReference<T extends string | null>(kind: string, id: AnyColumn, image: AnyColumn) {
  return sql<T>`case when ${image} like 'data:%' then '/media/' || ${kind} || '/' || ${id}::text || '?v=' || substr(encode(sha256(convert_to(${image}, 'UTF8')), 'hex'), 1, 16) else ${image} end`;
}
const POST_SUMMARY = { id: insights.id, title: insights.title, slug: insights.slug, excerpt: insights.excerpt, category: insights.category, coverImageUrl: imageReference<string | null>("insights", insights.id, insights.coverImageUrl), authorName: insights.authorName, createdAt: insights.createdAt };
const GALLERY_COLUMNS = { id: galleryItems.id, imageUrl: imageReference<string>("gallery", galleryItems.id, galleryItems.imageUrl), caption: galleryItems.caption, category: galleryItems.category, createdAt: galleryItems.createdAt };
const postImage = <T extends { id: string; coverImageUrl: string | null }>(post: T) => ({ ...post, coverImageUrl: publicImageSource("insights", post.id, post.coverImageUrl) });
const galleryImage = <T extends { id: string; imageUrl: string }>(photo: T) => ({ ...photo, imageUrl: publicImageSource("gallery", photo.id, photo.imageUrl)! });

// Public CMS data and public aggregate counts only; never individual accounts,
// profiles, payments, or sessions.
export const getHomeContent = unstable_cache(async () => {
  const [results, photos, posts, [medals], [members], [committees]] = await Promise.all([
    db.select().from(achievements).orderBy(desc(achievements.competitionDate)).limit(3),
    db.select(GALLERY_COLUMNS).from(galleryItems).orderBy(desc(galleryItems.createdAt)).limit(4),
    db.select(POST_SUMMARY).from(insights).orderBy(desc(insights.createdAt)).limit(3),
    db.select({ value: count() }).from(achievements),
    db.select({ value: count() }).from(users).where(and(inArray(users.role, [...MEMBER_ROLES]), eq(users.status, "active"))),
    db.select({ value: count() }).from(subCommittees),
  ]);
  return { recentAchievements: results, recentPhotos: photos.map(galleryImage), recentInsights: posts.map(postImage), medalCount: medals.value, memberCount: members.value, subCommitteeCount: committees.value };
}, ["public-home-v2"], options);
export const getAchievements = unstable_cache(() => db.select().from(achievements).orderBy(desc(achievements.competitionDate)), ["public-achievements-v1"], options);
export const getStructure = unstable_cache(async () => {
  const [people, committees] = await Promise.all([db.select().from(leadership).orderBy(asc(leadership.displayOrder)), db.select().from(subCommittees).orderBy(asc(subCommittees.name))]);
  return { people, committees };
}, ["public-structure-v1"], options);
export const getGalleryPage = cache(unstable_cache(async (page: number) => {
  const [{ total }] = await db.select({ total: count() }).from(galleryItems);
  const pages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
  if (page > pages) return { photos: [], total, pages };
  const photos = await db.select(GALLERY_COLUMNS).from(galleryItems).orderBy(desc(galleryItems.createdAt), desc(galleryItems.id)).limit(GALLERY_PAGE_SIZE).offset((page - 1) * GALLERY_PAGE_SIZE);
  return { photos: photos.map(galleryImage), total, pages };
}, ["public-gallery-page-v1"], options));
export const getInsightsPage = cache(unstable_cache(async (page: number) => {
  const [{ total }] = await db.select({ total: count() }).from(insights);
  const pages = Math.max(1, Math.ceil(total / INSIGHTS_PAGE_SIZE));
  if (page > pages) return { posts: [], total, pages };
  const posts = await db.select(POST_SUMMARY).from(insights).orderBy(desc(insights.createdAt), desc(insights.id)).limit(INSIGHTS_PAGE_SIZE).offset((page - 1) * INSIGHTS_PAGE_SIZE);
  return { posts: posts.map(postImage), total, pages };
}, ["public-insights-page-v1"], options));
export const getPublicPost = cache(unstable_cache(async (slug: string) => {
  const [post] = await db.select({ ...POST_SUMMARY, body: insights.body }).from(insights).where(eq(insights.slug, slug)).limit(1);
  return post ? postImage(post) : null;
}, ["public-insight-v1"], options));
export const getSitemapPosts = unstable_cache(() => db.select({ slug: insights.slug, createdAt: insights.createdAt }).from(insights).orderBy(desc(insights.createdAt)), ["public-sitemap-posts-v1"], options);
export function pageNumber(value?: string) { return value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1; }
