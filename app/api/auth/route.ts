import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  authEnabled,
  isValidPassphrase,
  sessionToken,
} from '@/lib/auth';

/** Sign in with the passphrase. */
export async function POST(req: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: 'No passphrase is configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const candidate = (body as { passphrase?: unknown })?.passphrase;
  // One generic message either way — never hint at what was wrong.
  if (!isValidPassphrase(candidate)) {
    return NextResponse.json({ error: 'That passphrase is not right.' }, { status: 401 });
  }

  const token = sessionToken();
  if (!token) {
    return NextResponse.json({ error: 'No passphrase is configured.' }, { status: 503 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
