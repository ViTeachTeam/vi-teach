import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type WindowState = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, WindowState>();

const POLICY: Record<string, { limit: number; windowMs: number }> = {
  '/api/analyze': { limit: 15, windowMs: 60_000 },
  '/api/chat': { limit: 45, windowMs: 60_000 }
};

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const policy = POLICY[path];
  if (!policy) return NextResponse.next();

  const now = Date.now();
  pruneExpired(now);

  const ip = getClientIp(request);
  const key = `${path}:${ip}`;
  const state = windows.get(key);

  if (!state || state.resetAt <= now) {
    const resetAt = now + policy.windowMs;
    windows.set(key, { count: 1, resetAt });
    const response = NextResponse.next();
    setRateHeaders(response, policy.limit, policy.limit - 1, resetAt, 0);
    return response;
  }

  if (state.count >= policy.limit) {
    const retryAfterSec = Math.max(Math.ceil((state.resetAt - now) / 1000), 1);
    const response = NextResponse.json(
      { error: 'Too many requests. Please retry shortly.' },
      { status: 429 }
    );
    setRateHeaders(response, policy.limit, 0, state.resetAt, retryAfterSec);
    return response;
  }

  state.count += 1;
  windows.set(key, state);

  const response = NextResponse.next();
  setRateHeaders(response, policy.limit, Math.max(policy.limit - state.count, 0), state.resetAt, 0);
  return response;
}

export const config = {
  matcher: ['/api/analyze', '/api/chat']
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function setRateHeaders(response: NextResponse, limit: number, remaining: number, resetAt: number, retryAfterSec: number) {
  response.headers.set('x-edge-ratelimit-limit', String(limit));
  response.headers.set('x-edge-ratelimit-remaining', String(remaining));
  response.headers.set('x-edge-ratelimit-reset', String(Math.floor(resetAt / 1000)));
  response.headers.set('retry-after', String(retryAfterSec));
}

function pruneExpired(now: number) {
  for (const [key, value] of windows.entries()) {
    if (value.resetAt <= now) {
      windows.delete(key);
    }
  }
}
