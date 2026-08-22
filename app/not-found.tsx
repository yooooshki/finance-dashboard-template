import Link from 'next/link';
import { displayFont, btnPrimary } from '@/components/pop-ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <p
        className="border-[3px] border-(--ink) bg-(--secondary) px-6 py-3 text-6xl font-black text-(--on-accent) shadow-[6px_6px_0_var(--ink)] md:text-8xl"
        style={displayFont}
      >
        404
      </p>
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-(--ink) md:text-3xl" style={displayFont}>
          Page not found
        </h1>
        <p className="mt-2 font-bold text-(--ink)/60">This page doesn&apos;t exist. The money probably does.</p>
      </div>
      <Link href="/" className={`${btnPrimary} px-6 py-2.5 text-base`}>
        Back to the ledger
      </Link>
    </div>
  );
}
