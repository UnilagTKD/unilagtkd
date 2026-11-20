# Public SEO and performance

Public pages use unique titles/descriptions, canonical URLs, Open Graph/Twitter previews, a branded sharing image, and SportsOrganization/WebSite structured data. Articles add BlogPosting and breadcrumbs. JSON-LD escapes user-authored text and carries the request's CSP nonce.

`/sitemap.xml` lists public pages and insights. It excludes accounts, dashboards, examiner links, and recovery. `/robots.txt` blocks private routes; the portal host blocks all crawling and returns an empty sitemap. Auth/dashboard/examiner pages also use noindex. Preview deployments use noindex. Authorization remains enforced independently.

Set the public and portal origins before building, as described in `.env.domains.example`. The default public canonical origin is `https://unilagtaekwondo.org`. Attach both domains and configure DNS/HTTPS before enabling them. The owner can then verify the public domain in Google Search Console and submit `https://unilagtaekwondo.org/sitemap.xml`. Indexing and ranking depend on the search engine.

## Performance

- Public CMS queries and aggregate counts are cached for five minutes. CMS writes immediately invalidate the public-content tag. Individual accounts, profiles, attendance, and payments never enter this cache.
- The public layout avoids account/session queries. Member Portal resolves authentication on arrival.
- Gallery listings contain at most 24 items and news listings at most 12. Numbered pages have self-canonical URLs and previous/next links. Listing queries omit article bodies.
- Public base64 uploads become versioned media references inside SQL, avoiding large image strings in HTML and database responses. The media route serves validated raster images from public gallery/news tables only. Profile pictures and signatures are excluded.
- Next Image generates responsive WebP for local assets and allowed remote hosts. Other external CMS images load directly. Original assets remain intact. Icons/logo requests are appropriately sized; lower images load lazily. Only the current hero image loads; its first slide is preloaded.
- Public content is visible before JavaScript. Reveal animations share an observer, skip initial content, and respect reduced motion. Fonts use swap; monospace is not preloaded.
- Club-logo loading screens cover homepage content, auth pages, and dashboards without artificial delays. Public not-found checks run outside loading boundaries so missing articles and invalid pagination retain HTTP 404 status.

HTML stays dynamic for fresh CSP nonces. Private pages keep no-store and live authorization checks.

## Verification

Run `npm run build`, `npm run lint`, and `node --import tsx scripts/seo-check.ts`. Start the production app on port 5215, then run `node scripts/seo-http-check.mjs` and `node scripts/security-http-check.mjs`. `CHECK_BASE_URL` can select another local server.

Checks cover metadata, structured-data nonces, missing-page status, private noindex, host-specific crawl rules, image dimensions, and measured logo-size reduction. Existing security checks cover redirects, CSP, cookies, and headers. Measure deployment Core Web Vitals/Lighthouse separately on the real hosting/domain with representative content and devices.
