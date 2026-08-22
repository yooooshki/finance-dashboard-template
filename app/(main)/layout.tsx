import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import NavBar from '@/components/nav-bar';
import { SESSION_COOKIE, authEnabled, isMisconfigured, isValidSession } from '@/lib/auth';

// Pages check for themselves rather than trusting a proxy — see lib/auth.ts.
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isMisconfigured()) {
    redirect('/login?error=unconfigured');
  }
  if (authEnabled()) {
    const store = await cookies();
    if (!isValidSession(store.get(SESSION_COOKIE)?.value)) {
      redirect('/login');
    }
  }

  return (
    <>
      <Suspense
        fallback={<div className="h-[76px] border-b-[3px] border-(--ink) bg-(--secondary)" />}
      >
        <NavBar />
      </Suspense>
      <main>{children}</main>
    </>
  );
}
