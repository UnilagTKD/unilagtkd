import assert from 'node:assert/strict';
import http from 'node:http';
const base = process.env.CHECK_BASE_URL || 'http://localhost:5215';
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://unilagtaekwondo.org';
const pages = ['/', '/about', '/structure', '/achievements', '/gallery', '/insights', '/alumni', '/resources', '/contact', '/privacy'];
const descriptions = new Set();
async function page(path, status = 200) {
  const response = await fetch(new URL(path, base), { headers: { 'user-agent': 'Twitterbot/1.0' }, redirect: 'manual' });
  assert.equal(response.status, status, path);
  return { response, html: await response.text() };
}
for (const path of pages) {
  const { response, html } = await page(path);
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(description && description.length >= 50 && description.length <= 180, `${path}: useful description`);
  assert.ok(!descriptions.has(description), `${path}: unique description`);
  descriptions.add(description);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(canonical, `${path}: canonical present`);
  assert.equal(new URL(canonical).href, new URL(path, origin).href, `${path}: public canonical`);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<meta name="robots" content="index, follow"/);
  const nonce = response.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, `${path}: nonce retained`);
  const dataScripts = [...html.matchAll(/<script([^>]*)type="application\/ld\+json"([^>]*)>(.*?)<\/script>/gs)];
  assert.ok(dataScripts.length, `${path}: structured data`);
  for (const match of dataScripts) {
    assert.ok((match[1] + match[2]).includes(`nonce="${nonce}"`), `${path}: structured data nonce`);
    const data = JSON.parse(match[3]);
    assert.equal(data['@context'], 'https://schema.org');
  }
  assert.ok(!html.includes('src="data:image/'), `${path}: public images do not bloat HTML with base64 uploads`);
  console.log(`ok ${path}: canonical, unique description, social previews, structured data, nonce`);
}
for (const path of ['/this-page-does-not-exist-seo-check', '/insights/this-post-does-not-exist-seo-check', '/gallery?page=999999']) {
  const { html } = await page(path, 404);
  assert.match(html, /This page is out of bounds/);
  assert.match(html, /name="robots" content="noindex/);
}
const { html: login } = await page('/login');
assert.match(login, /name="robots" content="noindex, nofollow/);
const robots = await (await fetch(new URL('/robots.txt', base))).text();
assert.match(robots, /Allow: \//);
for (const path of ['/dashboard', '/api/', '/examiner/', '/login', '/register']) assert.ok(robots.includes(`Disallow: ${path}`));
const sitemap = await (await fetch(new URL('/sitemap.xml', base))).text();
for (const path of pages) assert.ok(sitemap.includes(`<loc>${new URL(path, origin).href}</loc>`), `sitemap ${path}`);
assert.ok(!/\/dashboard|\/login|\/register|\/examiner/.test(sitemap));
const articleUrl = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).find(url => new URL(url).pathname.startsWith('/insights/'));
if (articleUrl) {
  const { html } = await page(new URL(articleUrl).pathname);
  assert.match(html, /property="og:type" content="article"/);
  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /property="article:published_time"/);
  console.log('ok published article metadata and breadcrumbs');
}
const homepage = await (await fetch(new URL('/', base))).text();
assert.match(homepage, /role="status"/);
assert.match(homepage, /Loading UNILAG Taekwondo Club/);
assert.ok(homepage.includes('club-logo.png'));
for (const path of ['/media/members/00000000-0000-0000-0000-000000000000', '/media/gallery/invalid']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 404, path);
}
function hostRequest(path, host) {
  return new Promise((resolve, reject) => {
    const request = http.get(new URL(path, base), { headers: { Host: host } }, response => {
      let body = ''; response.setEncoding('utf8'); response.on('data', part => body += part); response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('error', reject);
  });
}
const portalRobots = await hostRequest('/robots.txt', 'portal.unilagtaekwondo.org');
assert.equal(portalRobots.status, 200);
assert.match(portalRobots.body, /Disallow: \/\s*$/);
const portalSitemap = await hostRequest('/sitemap.xml', 'portal.unilagtaekwondo.org');
assert.equal(portalSitemap.status, 200);
assert.ok(!portalSitemap.body.includes('<loc>'));
console.log('ok custom 404s, private noindex, public sitemap, portal crawl exclusion');
const original = await (await fetch(new URL('/brand/club-logo.png', base))).arrayBuffer();
for (const [path, width, height] of [['/icon.png', 64, 64], ['/apple-icon', 180, 180], ['/opengraph-image', 1200, 630]]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type'), /image\/png/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.readUInt32BE(16), width, path);
  assert.equal(bytes.readUInt32BE(20), height, path);
  if (width === 64) assert.ok(bytes.length < original.byteLength / 4);
  console.log(`ok ${path}: ${width}x${height}, ${bytes.length} bytes`);
}
const optimized = await fetch(new URL('/_next/image?url=%2Fbrand%2Fclub-logo.png&w=96&q=75', base), { headers: { Accept: 'image/webp' } });
assert.equal(optimized.status, 200);
assert.match(optimized.headers.get('content-type'), /image\/webp/);
const optimizedSize = (await optimized.arrayBuffer()).byteLength;
assert.ok(optimizedSize < original.byteLength / 4);
console.log(`ok logo optimization: ${original.byteLength} -> ${optimizedSize} bytes`);
