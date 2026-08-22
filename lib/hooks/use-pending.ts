'use client';

import { useState } from 'react';

export interface PendingTransaction {
  id: string;
  date: number;
  month: number;
  year: number;
  amount: number;
  category: string | null;
  payment_type: string;
  detail: string;
  status: string;
}

export function formatTxnDate(date: number, month: number, year: number): string {
  return new Date(year, month - 1, date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function usePending(initialTransactions: PendingTransaction[]) {
  const [transactions, setTransactions] = useState<PendingTransaction[]>(initialTransactions);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        initialTransactions
          .filter((t) => t.category)
          .map((t) => [t.id, t.category as string]),
      ),
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [commitAllLoading, setCommitAllLoading] = useState(false);

  const addLoading = (id: string) =>
    setLoadingIds((prev) => new Set(prev).add(id));
  const removeLoading = (id: string) =>
    setLoadingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  const removeTransaction = (id: string) =>
    setTransactions((prev) => prev.filter((t) => t.id !== id));

  const setCategory = (id: string, category: string) =>
    setSelectedCategories((prev) => ({ ...prev, [id]: category }));

  async function commit(id: string) {
    const category = selectedCategories[id];
    if (!category) return;
    addLoading(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, status: 'committed' }),
      });
      if (res.ok) removeTransaction(id);
    } finally {
      removeLoading(id);
    }
  }

  async function discard(id: string, opts: { confirm?: boolean } = {}) {
    const { confirm = true } = opts;
    if (confirm && !window.confirm('Discard this transaction?')) return;
    addLoading(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) removeTransaction(id);
    } finally {
      removeLoading(id);
    }
  }

  async function commitAll() {
    const eligible = transactions.filter((t) => selectedCategories[t.id]);
    if (eligible.length === 0) return;
    setCommitAllLoading(true);
    for (const t of eligible) {
      const category = selectedCategories[t.id];
      addLoading(t.id);
      try {
        const res = await fetch(`/api/transactions/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, status: 'committed' }),
        });
        if (res.ok) removeTransaction(t.id);
      } finally {
        removeLoading(t.id);
      }
    }
    setCommitAllLoading(false);
  }

  const eligibleCount = transactions.filter((t) => selectedCategories[t.id]).length;

  return {
    transactions,
    selectedCategories,
    setCategory,
    loadingIds,
    commitAllLoading,
    commit,
    discard,
    commitAll,
    eligibleCount,
  };
}
