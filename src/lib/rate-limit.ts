import "server-only";

/**
 * Fixed-window rate limiter, in-process memory only. Fine for a single Node
 * server; if this ever runs on multi-instance serverless, each instance
 * tracks its own counts, so the effective limit multiplies by instance count.
 * Good enough for the login/reset/spam-prevention limits below - none of them
 * need to be exact, just bounded.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Sweep occasionally so the map does not grow unbounded over a long-running
// process, without adding a real cost to the common case.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
