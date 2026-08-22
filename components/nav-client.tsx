'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ThemeToggle from './theme-toggle';
import { displayFont } from './pop-ui';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/pending', label: 'Pending' },
  { href: '/history', label: 'History' },
  { href: '/e-statements', label: 'E-Statements' },
  { href: '/settings', label: 'Settings' },
];

function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-(--ink) bg-(--tertiary) text-[11px] font-black text-(--on-accent)">
      {count}
    </span>
  );
}

export default function NavClient({ pendingCount }: { pendingCount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const pill = (active: boolean) =>
    `border-[3px] border-(--ink) px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-all ${
      active
        ? 'bg-(--ink) text-(--bg) shadow-none translate-x-[3px] translate-y-[3px]'
        : 'bg-(--bg) text-(--ink) shadow-[3px_3px_0_var(--ink)] hover:bg-(--tertiary) hover:text-(--on-accent) active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-(--ink) bg-(--secondary)">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 md:px-6">
        <Link
          href="/"
          onClick={() => setIsOpen(false)}
          className="shrink-0 text-xl uppercase tracking-tight text-(--on-accent) sm:text-2xl"
          style={displayFont}
        >
          M<span className="text-(--primary)">ooo</span>lah Tracker
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-3 lg:flex">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className={`relative ${pill(isActive(href))}`}>
              {label}
              {label === 'Pending' && <PendingBadge count={pendingCount} />}
            </Link>
          ))}
          <Link href="/add" className={pill(false)}>
            + Add
          </Link>
          <ThemeToggle />
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            className="relative flex h-11 w-11 items-center justify-center border-[3px] border-(--ink) bg-(--bg) text-xl font-black text-(--ink) shadow-[3px_3px_0_var(--ink)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            {isOpen ? '✕' : '☰'}
            {!isOpen && <PendingBadge count={pendingCount} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <nav className="border-t-[3px] border-(--ink) bg-(--bg) px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`relative flex items-center justify-between ${pill(isActive(href))} px-4 py-2.5 text-base`}
              >
                {label}
                {label === 'Pending' && pendingCount > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full border-[3px] border-(--ink) bg-(--tertiary) px-1 text-[11px] font-black text-(--on-accent)">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
            <Link
              href="/add"
              onClick={() => setIsOpen(false)}
              className={`${pill(false)} bg-(--primary) px-4 py-2.5 text-center text-base text-(--on-primary)`}
            >
              + Add expense
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
