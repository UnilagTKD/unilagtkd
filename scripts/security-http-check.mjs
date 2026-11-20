import assert from 'node:assert/strict';
const base = process.env.CHECK_BASE_URL || 'http://localhost:5215';
const get = (path) => fetch(new URL(path, base), { redirect: 'manual' });
function checkHeaders(response, path) {
  assert.ok(response.headers.get('content-security-policy'), `${path}: CSP`);
  assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  assert.match(response.headers.get('strict-transport-security'), /max-age=63072000; includeSubDomains/, path);
  assert.ok(response.headers.get('referrer-policy'), `${path}: referrer policy`);
  assert.match(response.headers.get('permissions-policy'), /camera=\(\).*microphone=\(\).*geolocation=\(\).*payment=\(\).*usb=\(\)/, path);
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin', path);
  assert.equal(response.headers.get('x-dns-prefetch-control'), 'off', path);
  assert.equal(response.headers.get('x-permitted-cross-domain-policies'), 'none', path);
  assert.equal(response.headers.get('x-powered-by'), null, path);
}
for (const path of ['/login', '/privacy']) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  checkHeaders(response, path);
  const policy = response.headers.get('content-security-policy');
  const nonce = policy?.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, 'request-specific nonce');
  assert.ok(!policy.split(';').find(value => value.trim().startsWith('script-src')).includes("'unsafe-inline'"));
  assert.ok(!policy.includes("'unsafe-eval'"));
  const scripts = (await response.text()).match(/<script\b[^>]*>/g) || [];
  assert.ok(scripts.length > 0, 'rendered scripts present');
  assert.ok(scripts.every(tag => tag.includes(`nonce="${nonce}"`)), 'all rendered scripts carry the matching nonce');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  const next = await get(path);
  assert.notEqual(next.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1], nonce, 'fresh nonce per request');
  console.log(`ok ${path}: CSP, script nonces, and security headers`);
}
for (const path of ['/dashboard/admin', '/dashboard/messages']) {
  const response = await get(path);
  checkHeaders(response, path);
  assert.equal(response.status, 307);
  assert.ok(response.headers.get('location').includes('/login'));
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  console.log(`ok ${path}: authentication and private headers`);
}
for (const path of ['/.git/config', '/.env.local', '/examiner/invalid']) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  checkHeaders(response, path);
}
const asset = await get('/icon.png');
assert.equal(asset.status, 200);
checkHeaders(asset, '/icon.png');
const csrf = await get('/api/auth/csrf');
assert.equal(csrf.status, 200);
checkHeaders(csrf, '/api/auth/csrf');
const cookies = csrf.headers.getSetCookie();
assert.ok(cookies.length > 0);
assert.ok(cookies.every(cookie => /;\s*HttpOnly/i.test(cookie) && /;\s*SameSite=Lax/i.test(cookie) && !/;\s*Domain=/i.test(cookie)));
console.log('ok security headers on pages, redirects, API, static assets, and errors; HttpOnly/SameSite host-only cookies');
