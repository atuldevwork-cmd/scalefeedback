// In-memory rate limiter (resets on server restart; good enough for self-hosted)
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: limit - entry.count };
}
