import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { securityLog } from "@/lib/security-log";
import { rateLimit as localRateLimit } from "@/lib/rate-limit";

/** Atomic shared buckets: limits survive restarts and span all app instances. */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  // Keep development usable before the reviewed database migration is applied.
  // Production never falls back to per-process limits.
  if (process.env.NODE_ENV !== "production") return localRateLimit(key, limit, windowMs);
  const digest = createHash("sha256").update(key).digest("hex");
  try {
    const [bucket] = await db.execute<{ count: number; retry_after: number }>(sql`
      insert into security_rate_limits (key_hash, count, reset_at)
      values (${digest}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
      on conflict (key_hash) do update set
        count = case when security_rate_limits.reset_at <= clock_timestamp() then 1 else least(security_rate_limits.count + 1, ${limit + 1}) end,
        reset_at = case when security_rate_limits.reset_at <= clock_timestamp() then clock_timestamp() + ${windowMs} * interval '1 millisecond' else security_rate_limits.reset_at end
      returning count, greatest(1, ceil(extract(epoch from reset_at - clock_timestamp())))::integer as retry_after
    `);
    const allowed = bucket.count <= limit;
    if (!allowed) securityLog("rate_limit_exceeded");
    if (Math.random() < 0.01) await db.execute(sql`delete from security_rate_limits where reset_at < clock_timestamp() - interval '1 day'`);
    return { allowed, retryAfterSeconds: allowed ? 0 : bucket.retry_after };
  } catch {
    securityLog("rate_limit_store_unavailable");
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

export async function requestRateLimit(scope: string, limit: number, windowMs: number) {
  const requestHeaders = await headers();
  // Enable only behind a proxy which strips/replaces client-supplied headers.
  const ip = process.env.TRUST_PROXY_HEADERS === "true"
    ? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 128) || "shared"
    : "shared";
  const global = await rateLimit(`${scope}:global`, Math.max(100, limit * 10), windowMs);
  if (!global.allowed) return global;
  return rateLimit(`${scope}:ip:${ip}`, limit, windowMs);
}
