function origin(value: string | undefined, name: string): string {
  if (!value?.trim()) return "";
  const url = new URL(value.trim());
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error(`${name} must use HTTPS in production.`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error(`${name} must be an HTTP(S) origin without a path, credentials, query, or fragment.`);
  return url.origin;
}
export const DOMAIN_ORIGINS = {
  site: origin(process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL"),
  portal: origin(process.env.NEXT_PUBLIC_PORTAL_URL, "NEXT_PUBLIC_PORTAL_URL"),
};
function internalHref(base: string, path: string): string {
  if (!base) return path;
  const url = new URL(path, base);
  if (url.origin !== base) throw new Error("Links must remain on the configured origin.");
  return url.toString();
}
export function siteHref(path = "/"): string { return internalHref(DOMAIN_ORIGINS.site, path); }
export function portalHref(path = "/dashboard"): string { return internalHref(DOMAIN_ORIGINS.portal, path); }
const AUTH_PAGES = new Set(["/login", "/register", "/forgot-password", "/reset-password", "/setup-account", "/application-status"]);
function under(path: string, prefix: string): boolean { return path === prefix || path.startsWith(`${prefix}/`); }
export function isPortalPath(path: string): boolean {
  return AUTH_PAGES.has(path.replace(/\/$/, "")) || under(path, "/dashboard") || under(path, "/examiner") || under(path, "/api/auth");
}
function destination(base: URL, pathname: string, search: string): URL {
  const url = new URL(base); url.pathname = pathname; url.search = search; return url;
}
/** Resolve only configured hosts; local development and preview hosts stay on one origin. */
export function domainRedirect(url: URL, origins = DOMAIN_ORIGINS): URL | null {
  if (!origins.site || !origins.portal || origins.site === origins.portal) return null;
  const site = new URL(origins.site), portal = new URL(origins.portal);
  const onSite = url.host === site.host, onPortal = url.host === portal.host;
  if (!onSite && !onPortal) return null;
  const canonical = onPortal ? portal : site;
  if (canonical.protocol === "https:" && url.protocol !== "https:") {
    const target = isPortalPath(url.pathname) ? portal : canonical;
    return destination(target, url.pathname, url.search);
  }
  if (isPortalPath(url.pathname)) return onSite ? destination(portal, url.pathname, url.search) : null;
  if (url.pathname.startsWith("/_next/") || /\.(?:png|jpe?g|webp|gif|svg|ico|css|js|woff2?|ttf|otf|map|txt|xml)$/i.test(url.pathname) || under(url.pathname,"/api")) return null;
  if (!onPortal) return null;
  return destination(url.pathname === "/" ? portal : site, url.pathname === "/" ? "/dashboard" : url.pathname, url.search);
}
/** Authentication can return only to a dashboard path on this portal origin. */
export function portalCallbackPath(value: string | undefined, currentOrigin: string): string {
  if (!value) return "/dashboard";
  try {
    const url = new URL(value, currentOrigin);
    if (url.origin !== new URL(currentOrigin).origin || !under(url.pathname,"/dashboard")) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch { return "/dashboard"; }
}
