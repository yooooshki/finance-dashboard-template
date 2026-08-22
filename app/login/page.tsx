import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, authEnabled, isMisconfigured, isValidSession } from '@/lib/auth';
import LoginForm from '@/components/login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in — Mooolah Tracker' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Nothing to sign in to when the gate is off, or already signed in.
  if (!isMisconfigured() && !authEnabled()) redirect('/');
  if (authEnabled()) {
    const store = await cookies();
    if (isValidSession(store.get(SESSION_COOKIE)?.value)) redirect('/');
  }

  return <LoginForm unconfigured={error === 'unconfigured'} />;
}
