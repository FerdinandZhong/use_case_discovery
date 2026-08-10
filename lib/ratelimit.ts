// Minimal in-memory fixed-window rate limiter. Suitable for a single-replica
// container / Workbench Application. For multi-replica scale, back this with Redis.

import { NextRequest, NextResponse } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Returns null if allowed, or a 429 NextResponse if the limit is exceeded.
 * @param key   distinct bucket key (e.g. `responses:create:${ip}`)
 * @param limit max requests per window
 * @param windowMs window size in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    const retry = Math.ceil((b.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    );
  }
  b.count += 1;
  return null;
}

// Occasional cleanup so the map doesn't grow unbounded.
export function sweep(): void {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}
