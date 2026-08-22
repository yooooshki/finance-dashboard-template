// Route-handler guard. Every API route that touches user data calls this
// first; see lib/auth.ts for why the check is not delegated to a proxy.
//
// SERVER ONLY.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, authEnabled, isMisconfigured, isValidSession, hasValidBearer } from '@/lib/auth';

/**
 * Returns a response to send back when the caller is not allowed in, or null
 * when the request may proceed.
 *
 *   const denied = await requireAuth(req.headers);
 *   if (denied) return denied;
 */
export async function requireAuth(headers: Headers): Promise<NextResponse | null> {
  if (isMisconfigured()) {
    return NextResponse.json(
      { error: 'APP_PASSPHRASE is not set on this deployment.' },
      { status: 503 },
    );
  }
  if (!authEnabled()) return null;

  if (hasValidBearer(headers)) return null;

  const store = await cookies();
  if (isValidSession(store.get(SESSION_COOKIE)?.value)) return null;

  return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
}
