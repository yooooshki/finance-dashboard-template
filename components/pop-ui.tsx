// Pop Ledger UI primitives and shared class strings.
// Usable from both server and client components.

export function BrutalCard({
  children,
  className = '',
  bg = 'bg-(--card)',
}: {
  children: React.ReactNode;
  className?: string;
  bg?: string;
}) {
  return (
    <div className={`border-[3px] border-(--ink) ${bg} p-5 shadow-[6px_6px_0_var(--ink)] md:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function ShoutLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="inline-block border-[3px] border-(--ink) bg-(--secondary) px-3 py-1 text-sm uppercase tracking-wide text-(--on-accent)"
      style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
    >
      {children}
    </h2>
  );
}

export const displayFont = { fontFamily: 'var(--font-archivo-black), sans-serif' };

/** Primary action button (filled) */
export const btnPrimary =
  'border-[3px] border-(--ink) bg-(--primary) text-(--on-primary) font-black uppercase shadow-[4px_4px_0_var(--ink)] transition-all hover:bg-(--ink) hover:text-(--bg) active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none';

/** Secondary action button (bright) */
export const btnAccent =
  'border-[3px] border-(--ink) bg-(--secondary) text-(--on-accent) font-black uppercase shadow-[4px_4px_0_var(--ink)] transition-all hover:bg-(--tertiary) active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none';

/** Neutral button (card surface) */
export const btnGhost =
  'border-[3px] border-(--ink) bg-(--card) text-(--ink) font-bold uppercase shadow-[3px_3px_0_var(--ink)] transition-all hover:bg-(--secondary) hover:text-(--on-accent) active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none';

/** Chunky input / select */
export const inputBrutal =
  'border-[3px] border-(--ink) bg-(--card) text-(--ink) font-bold px-3 py-2 shadow-[3px_3px_0_var(--ink)] focus:outline-none focus:bg-(--secondary)/20 disabled:opacity-40';
