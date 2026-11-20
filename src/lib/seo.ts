import type { Metadata } from "next";
import { DOMAIN_ORIGINS } from "@/lib/domains";
export const SITE_NAME = "UNILAG Taekwondo Club";
export const SITE_ORIGIN = DOMAIN_ORIGINS.site || "https://unilagtaekwondo.org";
export const SITE_DESCRIPTION = "Train with the University of Lagos Taekwondo Club. Explore our training, competition results, club news, and membership opportunities in Lagos, Nigeria.";
export const PRIVATE_ROBOTS = { index: false, follow: false, noarchive: true } as const;
const indexable = process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development";
export const PUBLIC_ROBOTS = { index: indexable, follow: indexable, googleBot: { index: indexable, follow: indexable, "max-image-preview": "large" as const, "max-snippet": -1, "max-video-preview": -1 } };
export const PUBLIC_PAGES = [
  { path: "/", title: "University of Lagos Taekwondo Club", description: SITE_DESCRIPTION },
  { path: "/about", title: "About the Club", description: "Learn about UNILAG Taekwondo Club, our values, training pillars, belt system, and the development of student-athletes at the University of Lagos." },
  { path: "/structure", title: "Club Structure", description: "Meet the leadership and committees supporting training, competitions, and member development at the University of Lagos Taekwondo Club." },
  { path: "/achievements", title: "Achievements", description: "Explore UNILAG Taekwondo Club's medal results, competitions, and the achievements of our University of Lagos athletes." },
  { path: "/gallery", title: "Gallery", description: "Photos from UNILAG Taekwondo Club training sessions, demonstrations, tournaments, and club activities in Lagos." },
  { path: "/insights", title: "Insights", description: "Read Taekwondo training advice, competition updates, wellness guidance, and the latest University of Lagos Taekwondo Club news." },
  { path: "/alumni", title: "Alumni", description: "Stay connected with the UNILAG Taekwondo alumni community and discover ways to support the next generation of student-athletes." },
  { path: "/resources", title: "Resources", description: "Explore the UNILAG Taekwondo Club's training resources, membership guidance, grading information, and club policies." },
  { path: "/contact", title: "Contact", description: "Contact the University of Lagos Taekwondo Club for membership, training, alumni, and club enquiries." },
  { path: "/privacy", title: "Privacy Policy", description: "Understand how UNILAG Taekwondo Club handles membership information, account data, and privacy in the public website and member portal." },
] as const;
export function publicUrl(path: string) {
  const url = new URL(path, SITE_ORIGIN);
  if (url.origin !== SITE_ORIGIN) throw new Error("Canonical URLs must use the public website origin.");
  return url.toString();
}
export function seoDescription(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160); }
export function socialImage(value?: string | null) {
  if (value && /^\/(?!\/)/.test(value)) return publicUrl(value);
  if (value) { try { const url = new URL(value); if (url.protocol === "https:" && !url.username && !url.password) return url.href; } catch {} }
  return publicUrl("/opengraph-image");
}
export function publicMetadata(path: string, overrides: { title?: string; description?: string; image?: string | null; article?: boolean; publishedTime?: string; author?: string } = {}): Metadata {
  const page = PUBLIC_PAGES.find(page => page.path === path.split("?")[0]);
  const title = overrides.title ?? page?.title ?? SITE_NAME;
  const description = seoDescription(overrides.description ?? page?.description ?? SITE_DESCRIPTION);
  const fullTitle = `${title} | ${SITE_NAME}`;
  const image = socialImage(overrides.image);
  return { title, description, alternates: { canonical: publicUrl(path) }, robots: PUBLIC_ROBOTS,
    openGraph: { title: fullTitle, description, url: publicUrl(path), siteName: SITE_NAME, locale: "en_NG", images: [{ url: image, alt: title }], ...(overrides.article ? { type: "article" as const, publishedTime: overrides.publishedTime, authors: overrides.author ? [overrides.author] : undefined } : { type: "website" as const }) },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
  };
}
/** Prevent a user-authored title/excerpt from breaking out of a JSON-LD script. */
export function serializeStructuredData(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
