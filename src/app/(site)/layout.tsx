import { portalHref } from "@/lib/domains";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StructuredData } from "@/components/structured-data";
import { SITE_NAME, SITE_ORIGIN, publicUrl } from "@/lib/seo";

// Public rendering does not read account cookies or run authentication queries.
// The portal link resolves the visitor's signed-in dashboard on arrival.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>
    <SiteHeader dashboardHref={portalHref("/dashboard")} />
    <main id="main-content" className="flex-1">{children}</main>
    <SiteFooter />
    <StructuredData value={{ "@context": "https://schema.org", "@graph": [
      { "@type": "SportsOrganization", "@id": `${SITE_ORIGIN}/#organization`, name: SITE_NAME, alternateName: "University of Lagos Taekwondo Club", url: SITE_ORIGIN, logo: publicUrl("/brand/club-logo.png"), sport: "Taekwondo", address: { "@type": "PostalAddress", addressLocality: "Lagos", addressRegion: "Lagos", addressCountry: "NG" } },
      { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, name: SITE_NAME, url: SITE_ORIGIN, inLanguage: "en-NG", publisher: { "@id": `${SITE_ORIGIN}/#organization` } },
    ] }} />
  </>;
}
