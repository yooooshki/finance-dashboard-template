'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { displayFont, btnPrimary, btnGhost } from '@/components/pop-ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-20 text-center md:px-6">
      <p
        className="border-[3px] border-(--ink) bg-(--tertiary) px-5 py-2 text-2xl font-black uppercase text-(--on-accent) shadow-[5px_5px_0_var(--ink)]"
        style={displayFont}
      >
        Well, that broke
      </p>
      <p className="max-w-xs font-bold text-(--ink)/60">
        Something went wrong. Try again, or head back to the overview.
      </p>
      <div className="flex gap-4">
        <button onClick={reset} className={`${btnPrimary} px-6 py-2.5 text-base`}>
          Try again
        </button>
        <Link href="/" className={`${btnGhost} px-6 py-2.5 text-base`}>
          Go home
        </Link>
      </div>
    </div>
  );
}
