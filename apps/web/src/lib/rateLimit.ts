type WindowState = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
  resetAt: number;
};

const windows = new Map<string, WindowState>();

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(options.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    windows.set(options.key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      retryAfterSec: 0,
      resetAt
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      retryAfterSec: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
      resetAt: existing.resetAt
    };
  }

  existing.count += 1;
  windows.set(options.key, existing);
  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    retryAfterSec: 0,
    resetAt: existing.resetAt
  };
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(result.remaining),
    'x-ratelimit-reset': String(Math.floor(result.resetAt / 1000)),
    'retry-after': String(result.retryAfterSec)
  };
}
