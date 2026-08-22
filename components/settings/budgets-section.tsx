'use client';

import { useEffect, useState } from 'react';
import { BrutalCard, ShoutLabel, inputBrutal } from '@/components/pop-ui';

interface Budget {
  id: string;
  category: string;
  monthly_amount: number;
}

const actionBtn = 'text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-40';
const smallInput = `${inputBrutal} px-2 py-1 text-sm shadow-[2px_2px_0_var(--ink)]`;

export default function BudgetsSection() {
  const [rows, setRows] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/settings/budgets');
    const body = await res.json();
    if (!res.ok) {
      setErrors({ load: body.error ?? 'Failed to load budgets.' });
      setRows([]);
      return;
    }
    setErrors({});
    setRows(body);
  }

  async function loadCategories() {
    const res = await fetch('/api/settings/categories');
    if (!res.ok) return;
    const body = await res.json();
    setCategories(body.map((c: { name: string }) => c.name));
  }

  useEffect(() => { load(); loadCategories(); }, []);

  async function saveEdit(id: string) {
    setBusy(true);
    const res = await fetch(`/api/settings/budgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_amount: Number(editAmount) }),
    });
    if (res.ok) { setEditingId(null); await load(); }
    else setErrors({ [id]: (await res.json()).error });
    setBusy(false);
  }

  async function deleteRow(id: string) {
    setBusy(true);
    const res = await fetch(`/api/settings/budgets/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else setErrors({ [id]: (await res.json()).error });
    setBusy(false);
  }

  async function addRow() {
    if (!newCategory || newAmount.trim() === '') {
      setErrors({ new: 'Pick a category and an amount.' });
      return;
    }
    setBusy(true);
    const res = await fetch('/api/settings/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCategory, monthly_amount: Number(newAmount) }),
    });
    if (res.ok) { setAdding(false); setNewCategory(''); setNewAmount(''); await load(); }
    else setErrors({ new: (await res.json()).error });
    setBusy(false);
  }

  const unbudgeted = categories.filter(c => !rows.some(r => r.category === c));

  return (
    <BrutalCard>
      <div className="mb-4 flex items-center justify-between">
        <ShoutLabel>Budgets</ShoutLabel>
        {!adding && unbudgeted.length > 0 && (
          <button
            onClick={() => { setAdding(true); setNewCategory(unbudgeted[0]); setNewAmount(''); setErrors({}); }}
            className={`${actionBtn} text-(--primary) hover:opacity-70`}
          >
            + Add
          </button>
        )}
      </div>

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-(--ink)/50">
        A monthly spend target per category. Each one gets a meter on the Overview,
        measured over the calendar month across every card.
      </p>

      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.id}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-block border-2 border-(--ink) bg-(--secondary) px-2.5 py-1 text-sm font-bold text-(--on-accent) shadow-[2px_2px_0_var(--ink)]">
                {row.category}
              </span>
              {editingId === row.id ? (
                <>
                  <span className="font-bold text-(--ink)/50">$</span>
                  <input
                    type="number"
                    min={0}
                    step="10"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(row.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    className={`${smallInput} w-28`}
                  />
                  <button onClick={() => saveEdit(row.id)} disabled={busy} className={`${actionBtn} text-(--primary)`}>✓ Save</button>
                  <button onClick={() => setEditingId(null)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-lg font-black text-(--ink)">
                    ${Math.round(row.monthly_amount).toLocaleString('en-SG')}
                    <span className="text-sm font-bold text-(--ink)/40"> / month</span>
                  </span>
                  <button
                    onClick={() => { setEditingId(row.id); setEditAmount(String(row.monthly_amount)); setErrors({}); }}
                    className={`${actionBtn} text-(--ink)/50 hover:text-(--primary)`}
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteRow(row.id)} disabled={busy} className={`${actionBtn} text-(--ink)/50 hover:text-(--danger)`}>
                    Delete
                  </button>
                </>
              )}
            </div>
            {errors[row.id] && <p className="mt-1 text-xs font-black uppercase text-(--danger)">{errors[row.id]}</p>}
          </div>
        ))}

        {rows.length === 0 && !adding && !errors.load && (
          <p className="text-sm font-bold uppercase text-(--ink)/40">No budgets set.</p>
        )}

        {adding && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className={`${smallInput} w-44`}
            >
              {unbudgeted.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="font-bold text-(--ink)/50">$</span>
            <input
              type="number"
              min={0}
              step="10"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRow(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="700"
              autoFocus
              className={`${smallInput} w-28`}
            />
            <button onClick={addRow} disabled={busy} className={`${actionBtn} text-(--primary)`}>✓ Add</button>
            <button onClick={() => setAdding(false)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>Cancel</button>
          </div>
        )}
      </div>

      {errors.load && <p className="mt-3 text-sm font-black uppercase text-(--danger)">{errors.load}</p>}
      {errors.new && <p className="mt-3 text-sm font-black uppercase text-(--danger)">{errors.new}</p>}
    </BrutalCard>
  );
}
