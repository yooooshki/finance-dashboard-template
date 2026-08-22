'use client';

import { useEffect, useState, useCallback } from 'react';
import { MONTH_NAMES } from '@/lib/months';
import { btnGhost, inputBrutal } from '@/components/pop-ui';

interface Transaction {
  id: string;
  date: number;
  month: number;
  year: number;
  amount: number;
  category: string | null;
  payment_type: string | null;
  detail: string | null;
  source: string;
  status: string;
}

interface HistoryTableProps {
  categories: string[];
  paymentTypes: string[];
}

const LIMIT = 50;

function buildMonthOptions() {
  const now = new Date();
  const opts: Array<{ label: string; month: number; year: number }> = [];
  for (let i = 0; i < 24; i++) {
    let m = now.getMonth() + 1 - i;
    let y = now.getFullYear();
    while (m <= 0) { m += 12; y -= 1; }
    opts.push({ label: `${MONTH_NAMES[m - 1]} ${y}`, month: m, year: y });
  }
  return opts;
}

const filterChip =
  'cursor-pointer border-[3px] border-(--ink) bg-(--card) px-3 py-1.5 text-sm font-bold uppercase text-(--ink) shadow-[3px_3px_0_var(--ink)] select-none list-none transition-all hover:bg-(--secondary) hover:text-(--on-accent)';

const chip =
  'inline-block border-2 border-(--ink) bg-(--secondary) px-2 py-0.5 text-xs font-bold uppercase text-(--on-accent)';

const actionBtn =
  'text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-40';

export default function HistoryTable({ categories, paymentTypes }: HistoryTableProps) {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selPaymentTypes, setSelPaymentTypes] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editDetail, setEditDetail] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthOptions = buildMonthOptions();

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'committed');
      params.set('page', String(p));
      params.set('limit', String(LIMIT));
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-');
        params.set('year', y);
        params.set('month', m);
      }
      selCategories.forEach((c) => params.append('category', c));
      selPaymentTypes.forEach((pt) => params.append('payment_type', pt));

      const res = await fetch(`/api/transactions?${params}`);
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selCategories, selPaymentTypes]);

  useEffect(() => {
    setPage(1);
  }, [selectedMonth, selCategories, selPaymentTypes]);

  useEffect(() => {
    fetchRows(page);
  }, [fetchRows, page]);

  function toggleCategory(cat: string) {
    setSelCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function togglePaymentType(pt: string) {
    setSelPaymentTypes((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt],
    );
  }

  function startEdit(row: Transaction) {
    setEditingId(row.id);
    setEditCategory(row.category ?? '');
    setEditDetail(row.detail ?? '');
    setConfirmDeleteId(null);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editCategory, detail: editDetail }),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, category: editCategory, detail: editDetail } : r,
        ),
      );
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const fmtDate = (r: Transaction) => `${r.date} ${MONTH_NAMES[r.month - 1]} ${r.year}`;

  const editControls = (row: Transaction) => (
    <div className="flex flex-col gap-2">
      <select
        value={editCategory}
        onChange={(e) => setEditCategory(e.target.value)}
        className={`${inputBrutal} w-full py-1 text-sm`}
      >
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        type="text"
        value={editDetail}
        onChange={(e) => setEditDetail(e.target.value)}
        className={`${inputBrutal} w-full py-1 text-sm`}
      />
      <div className="flex gap-3">
        <button onClick={() => saveEdit(row.id)} disabled={saving} className={`${actionBtn} text-(--primary)`}>
          {saving ? 'Saving…' : '✓ Save'}
        </button>
        <button onClick={() => setEditingId(null)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>
          Cancel
        </button>
      </div>
    </div>
  );

  const deleteControls = (row: Transaction) => (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-bold text-(--ink)/70">
        Delete &ldquo;{row.detail}&rdquo; (${Number(row.amount).toFixed(2)})?
      </span>
      <button onClick={() => confirmDelete(row.id)} disabled={deleting} className={`${actionBtn} text-(--danger)`}>
        {deleting ? 'Deleting…' : '✓ Confirm'}
      </button>
      <button onClick={() => setConfirmDeleteId(null)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>
        Cancel
      </button>
    </div>
  );

  const rowActions = (row: Transaction) => (
    <>
      <button onClick={() => startEdit(row)} className={`${actionBtn} mr-3 text-(--ink)/50 hover:text-(--primary)`}>
        Edit
      </button>
      <button
        onClick={() => { setConfirmDeleteId(row.id); setEditingId(null); }}
        className={`${actionBtn} text-(--ink)/50 hover:text-(--danger)`}
      >
        Delete
      </button>
    </>
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={`${inputBrutal} py-1.5 text-sm uppercase`}
        >
          <option value="">All time</option>
          {monthOptions.map((o) => (
            <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
              {o.label}
            </option>
          ))}
        </select>

        <details className="relative">
          <summary className={filterChip}>
            {selCategories.length === 0
              ? 'All categories'
              : `${selCategories.length} categor${selCategories.length === 1 ? 'y' : 'ies'}`} ▾
          </summary>
          <div className="absolute z-10 mt-2 max-h-60 min-w-[200px] overflow-y-auto border-[3px] border-(--ink) bg-(--card) p-2 shadow-[4px_4px_0_var(--ink)]">
            {categories.map((cat) => (
              <label key={cat} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm font-bold text-(--ink) hover:bg-(--secondary)/30">
                <input
                  type="checkbox"
                  checked={selCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="h-4 w-4 accent-(--primary)"
                />
                {cat}
              </label>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary className={filterChip}>
            {selPaymentTypes.length === 0
              ? 'All cards'
              : `${selPaymentTypes.length} card${selPaymentTypes.length === 1 ? '' : 's'}`} ▾
          </summary>
          <div className="absolute z-10 mt-2 max-h-60 min-w-[240px] overflow-y-auto border-[3px] border-(--ink) bg-(--card) p-2 shadow-[4px_4px_0_var(--ink)]">
            {paymentTypes.map((pt) => (
              <label key={pt} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm font-bold text-(--ink) hover:bg-(--secondary)/30">
                <input
                  type="checkbox"
                  checked={selPaymentTypes.includes(pt)}
                  onChange={() => togglePaymentType(pt)}
                  className="h-4 w-4 accent-(--primary)"
                />
                {pt}
              </label>
            ))}
          </div>
        </details>

        {(selCategories.length > 0 || selPaymentTypes.length > 0 || selectedMonth) && (
          <button
            onClick={() => { setSelCategories([]); setSelPaymentTypes([]); setSelectedMonth(''); }}
            className="text-sm font-black uppercase text-(--ink)/40 underline decoration-2 underline-offset-4 transition-colors hover:text-(--danger)"
          >
            Clear
          </button>
        )}
      </div>

      {/* Count */}
      <p className="mb-4 text-sm font-black uppercase tracking-wide text-(--ink)/40">
        {loading ? 'Loading…' : `${total} transaction${total !== 1 ? 's' : ''}`}
      </p>

      {!loading && rows.length === 0 ? (
        <div className="border-[3px] border-dashed border-(--ink) py-16 text-center">
          <p className="font-black uppercase text-(--ink)/40">No transactions found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden border-[3px] border-(--ink) bg-(--card) shadow-[6px_6px_0_var(--ink)] md:block">
            <table className="w-full border-collapse text-sm text-(--ink)">
              <thead>
                <tr className="border-b-[3px] border-(--ink)">
                  {['Date', 'Amount', 'Category', 'Card', 'Detail', 'Source', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`px-3 py-2.5 text-xs font-black uppercase tracking-wider text-(--ink)/60 ${h === 'Amount' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b-2 border-(--ink)/10 last:border-b-0 hover:bg-(--secondary)/10">
                    {editingId === row.id ? (
                      <>
                        <td className="whitespace-nowrap px-3 py-2 font-bold text-(--ink)/60">{fmtDate(row)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">
                          ${Number(row.amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-2" colSpan={4}>{editControls(row)}</td>
                        <td />
                      </>
                    ) : confirmDeleteId === row.id ? (
                      <td colSpan={7} className="px-3 py-3">{deleteControls(row)}</td>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-3 py-2.5 font-bold text-(--ink)/60">{fmtDate(row)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-black tabular-nums">
                          ${Number(row.amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={chip}>{row.category ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-(--ink)/70">{row.payment_type ?? '—'}</td>
                        <td className="max-w-[200px] truncate px-3 py-2.5 font-bold">{row.detail ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-bold uppercase text-(--ink)/40">{row.source}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">{rowActions(row)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-6 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="relative border-[3px] border-(--ink) bg-(--card) p-4 shadow-[5px_5px_0_var(--ink)]"
              >
                <span className="absolute -right-2.5 -top-2.5 border-[3px] border-(--ink) bg-(--primary) px-2 py-0.5 text-sm font-black text-(--on-primary)">
                  ${Number(row.amount).toFixed(2)}
                </span>
                {confirmDeleteId === row.id ? (
                  deleteControls(row)
                ) : (
                  <>
                    <p className="pr-16 text-base font-bold text-(--ink)">{row.detail ?? '—'}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-(--ink)/50">
                      {fmtDate(row)} · {row.payment_type ?? '—'} · {row.source}
                    </p>
                    {editingId === row.id ? (
                      <div className="mt-3">{editControls(row)}</div>
                    ) : (
                      <div className="mt-3 flex items-center justify-between">
                        <span className={chip}>{row.category ?? '—'}</span>
                        <span>{rowActions(row)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className={`${btnGhost} px-4 py-1.5 text-sm`}
          >
            ← Prev
          </button>
          <span className="text-sm font-black uppercase text-(--ink)/50">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            className={`${btnGhost} px-4 py-1.5 text-sm`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
