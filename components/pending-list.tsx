'use client';

import { motion, AnimatePresence } from 'motion/react';
import {
  usePending,
  formatTxnDate,
  type PendingTransaction,
} from '@/lib/hooks/use-pending';
import { displayFont, btnAccent, btnPrimary, btnGhost } from '@/components/pop-ui';

export default function PendingList({
  initialTransactions,
  categories,
}: {
  initialTransactions: PendingTransaction[];
  categories: string[];
}) {
  const {
    transactions,
    selectedCategories,
    setCategory,
    loadingIds,
    commitAllLoading,
    commit,
    discard,
    commitAll,
    eligibleCount,
    scanning,
    scanResult,
    scanError,
    runScan,
  } = usePending(initialTransactions);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1
          className="text-4xl uppercase tracking-tight text-(--ink) md:text-6xl"
          style={displayFont}
        >
          Sort it out
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runScan}
            disabled={scanning}
            className={`${btnGhost} px-5 py-2.5 text-base`}
          >
            {scanning ? 'Scanning…' : 'Run scan now'}
          </button>
          {eligibleCount >= 1 && (
            <button
              onClick={commitAll}
              disabled={commitAllLoading}
              className={`${btnAccent} px-6 py-2.5 text-base`}
            >
              {commitAllLoading ? 'Committing…' : `Commit all (${eligibleCount})`}
            </button>
          )}
        </div>
      </div>

      {scanResult && (
        <p className="mt-4 inline-block border-[3px] border-(--ink) bg-(--tertiary) px-3 py-1 text-sm font-black text-(--on-accent)">
          {scanResult.imported} imported · {scanResult.skipped} skipped
        </p>
      )}
      {scanError && (
        <p className="mt-4 text-sm font-black uppercase text-(--danger)">{scanError}</p>
      )}

      {transactions.length === 0 ? (
        <div className="mt-10 border-[3px] border-dashed border-(--ink) py-20 text-center">
          <p className="text-2xl uppercase text-(--ink) md:text-3xl" style={displayFont}>
            Inbox zero, baby
          </p>
          <p className="mt-2 font-bold uppercase text-(--ink)/50">Nothing left to sort</p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {transactions.map((t) => {
              const isLoading = loadingIds.has(t.id);
              const selectedCategory = selectedCategories[t.id] ?? '';
              return (
                <motion.div
                  key={t.id}
                  layout
                  exit={{ opacity: 0, scale: 0.85, rotate: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                  className="relative border-[3px] border-(--ink) bg-(--card) p-5 shadow-[6px_6px_0_var(--ink)]"
                >
                  <span className="absolute -right-3 -top-3 border-[3px] border-(--ink) bg-(--primary) px-2 py-0.5 text-sm font-black text-(--on-primary)">
                    ${t.amount.toFixed(2)}
                  </span>
                  <p className="pr-16 text-lg font-bold text-(--ink)">{t.detail}</p>
                  <p className="mt-1 text-sm font-bold uppercase text-(--ink)/50">
                    {formatTxnDate(t.date, t.month, t.year)} · {t.payment_type}
                  </p>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setCategory(t.id, e.target.value)}
                    disabled={isLoading}
                    className={`mt-4 w-full border-[3px] border-(--ink) px-3 py-2 text-base font-bold shadow-[3px_3px_0_var(--ink)] focus:outline-none disabled:opacity-40 ${
                      selectedCategory
                        ? 'bg-(--card) text-(--ink)'
                        : 'bg-(--secondary) text-(--on-accent)'
                    }`}
                  >
                    <option value="" disabled>
                      PICK A CATEGORY
                    </option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => commit(t.id)}
                      disabled={!selectedCategory || isLoading}
                      className={`${btnPrimary} flex-1 py-2 text-base`}
                    >
                      {isLoading ? 'Saving…' : 'Commit ✓'}
                    </button>
                    <button
                      onClick={() => discard(t.id)}
                      disabled={isLoading}
                      className={`${btnGhost} px-4 py-2 text-base hover:bg-(--tertiary)`}
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
