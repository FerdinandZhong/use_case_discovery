import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

/**
 * Admin auth for the dashboard + catalog export endpoints.
 *
 * The shared secret (ADMIN_TOKEN) is accepted via:
 *   - Authorization: Bearer <token>   (scripts / curl, and the admin UI's fetches)
 *   - the `admin_token` cookie          (set by the /admin login form)
 *
 * The token is NOT accepted via query string — tokens in URLs leak through server
 * logs, browser history, and Referer headers. The admin UI downloads catalogs with
 * an authenticated fetch instead of a plain <a href>.
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function isAdmin(req: NextRequest): boolean {
  // Trim: env vars piped through GitHub secrets → CML job/app env commonly pick up a
  // trailing newline, which would make the byte-compare fail even when the token matches.
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) return false;

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && safeEqual(auth.slice(7).trim(), expected)) return true;

  const cookie = req.cookies.get('admin_token')?.value?.trim();
  if (cookie && safeEqual(cookie, expected)) return true;

  return false;
}

/** Opaque, URL-safe token for a respondent (unguessable capability). */
export function newToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Short random suffix appended to survey slugs so links can't be enumerated. */
export function slugSuffix(): string {
  return newToken(4); // 8 hex chars
}
