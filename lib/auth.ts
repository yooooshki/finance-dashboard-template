// Passphrase gate for the whole app.
//
// Design note: the check lives in the route handlers and the (main) layout,
// NOT only in a proxy. Next.js renamed middleware to proxy.ts in 16 partly
// because of CVE-2025-29927, a middleware auth bypass, and the guidance is
// explicit that a proxy must not be the sole auth layer. So each entry point
// verifies for itself; a proxy, if ever added, is only defence in depth.
//
// There is no session store. The cookie holds an HMAC of a fixed string keyed
// by APP_PASSPHRASE, so a valid cookie proves the passphrase was known, and
// changing the passphrase invalidates every outstanding cookie.
//
// SERVER ONLY — never import this from a 'use client' file.

import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'findash_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function passphrase(): string | undefined {
  const p = process.env.APP_PASSPHRASE;
  return p && p.length > 0 ? p : undefined;
}

/**
 * Is the gate switched on?
 *
 * Unset locally means "no gate", so `npm run dev` and a fresh clone work out
 * of the box. Unset in production is a misconfiguration, not a licence to be
 * open: isMisconfigured() below turns it into a 503 rather than a free pass.
 */
export function authEnabled(): boolean {
  return passphrase() !== undefined;
}

export function isMisconfigured(): boolean {
  return !authEnabled() && process.env.VERCEL_ENV === 'production';
}

/** Deterministic session value. Same passphrase in, same token out. */
export function sessionToken(): string | null {
  const p = passphrase();
  if (!p) return null;
  return createHmac('sha256', p).update('findash-session-v1').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isValidPassphrase(candidate: unknown): boolean {
  const p = passphrase();
  if (!p || typeof candidate !== 'string') return false;
  return safeEqual(candidate, p);
}

export function isValidSession(cookieValue: string | undefined): boolean {
  const expected = sessionToken();
  if (!expected || !cookieValue) return false;
  return safeEqual(cookieValue, expected);
}

/**
 * Bearer form, for the Apple Shortcut and any other headless caller:
 *   Authorization: Bearer <APP_PASSPHRASE>
 */
export function hasValidBearer(headers: Headers): boolean {
  const header = headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return false;
  return isValidPassphrase(header.slice(7));
}
