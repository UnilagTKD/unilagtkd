import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { DOMAIN_ORIGINS } from "@/lib/domains";
import { PUBLIC_PAGES, publicUrl } from "@/lib/seo";
import { getSitemapPosts } from "@/lib/public-content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (host === new URL(DOMAIN_ORIGINS.portal || "https://portal.unilagtaekwondo.org").hostname || process.env.VERCEL_ENV === "preview") return [];
  const posts = await getSitemapPosts();
  return [...PUBLIC_PAGES.map(page => ({ url: publicUrl(page.path) })), ...posts.map(post => ({ url: publicUrl(`/insights/${post.slug}`) }))];
}
