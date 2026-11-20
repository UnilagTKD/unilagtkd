import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { DOMAIN_ORIGINS } from "@/lib/domains";
import { SITE_ORIGIN, publicUrl } from "@/lib/seo";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  const portalHost = new URL(DOMAIN_ORIGINS.portal || "https://portal.unilagtaekwondo.org").hostname;
  if (host === portalHost || process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/examiner/", "/login", "/register", "/forgot-password", "/reset-password", "/setup-account", "/application-status"] }, sitemap: publicUrl("/sitemap.xml"), host: SITE_ORIGIN };
}
