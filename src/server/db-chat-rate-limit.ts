type Bucket = { n: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PUBLIC = 16;
const MAX_PRO = 80;
const MAX_ADMIN = 200;

/** Shrink unbounded growth (best-effort). */
const MAX_KEYS = 8000;

function prune(now: number) {
  if (buckets.size <= MAX_KEYS) return;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export function checkDbChatRateLimit(
  key: string,
  tier: "public" | "pro" | "admin",
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const max = tier === "admin" ? MAX_ADMIN : tier === "pro" ? MAX_PRO : MAX_PUBLIC;
  const bucketKey = `${tier}:${key || "unknown"}`;
  prune(now);

  let b = buckets.get(bucketKey);
  if (!b || now > b.resetAt) {
    b = { n: 1, resetAt: now + WINDOW_MS };
    buckets.set(bucketKey, b);
    return { ok: true };
  }
  if (b.n >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.n += 1;
  return { ok: true };
}
