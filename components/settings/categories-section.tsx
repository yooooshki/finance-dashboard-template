'use client';

import { useEffect, useState } from 'react';
import { BrutalCard, ShoutLabel, inputBrutal } from '@/components/pop-ui';

interface Category {
  id: string;
  name: string;
}

const actionBtn = 'text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-40';
const smallInput = `${inputBrutal} w-32 px-2 py-1 text-sm shadow-[2px_2px_0_var(--ink)]`;

export default function CategoriesSection() {
  const [rows, setRows] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/settings/categories');
    setRows(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/settings/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) { setEditingId(null); await load(); }
    else setErrors({ [id]: (await res.json()).error });
    setBusy(false);
  }

  async function deleteRow(id: string) {
    setBusy(true);
    const res = await fetch(`/api/settings/categories/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else setErrors({ [id]: (await res.json()).error });
    setBusy(false);
  }

  async function addRow() {
    if (!newName.trim()) { setErrors({ new: 'Name is required.' }); return; }
    setBusy(true);
    const res = await fetch('/api/settings/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) { setAdding(false); setNewName(''); await load(); }
    else setErrors({ new: (await res.json()).error });
    setBusy(false);
  }

  return (
    <BrutalCard>
      <div className="mb-4 flex items-center justify-between">
        <ShoutLabel>Categories</ShoutLabel>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setNewName(''); setErrors({}); }}
            className={`${actionBtn} text-(--primary) hover:opacity-70`}
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {rows.map(row => (
          <div key={row.id}>
            {editingId === row.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(row.id); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  className={smallInput}
                />
                <button onClick={() => saveEdit(row.id)} disabled={busy} className={`${actionBtn} text-(--primary)`}>✓</button>
                <button onClick={() => setEditingId(null)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>✕</button>
              </div>
            ) : (
              <div className="group flex items-center gap-1.5 border-2 border-(--ink) bg-(--secondary) px-2.5 py-1 text-sm font-bold text-(--on-accent) shadow-[2px_2px_0_var(--ink)]">
                <span>{row.name}</span>
                <button
                  onClick={() => { setEditingId(row.id); setEditName(row.name); setErrors({}); }}
                  className="text-xs opacity-0 transition-opacity hover:!opacity-100 group-hover:opacity-60"
                  aria-label={`Edit ${row.name}`}
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteRow(row.id)}
                  disabled={busy}
                  className="text-xs opacity-0 transition-opacity hover:!opacity-100 hover:text-(--danger) group-hover:opacity-40 disabled:opacity-20"
                  aria-label={`Delete ${row.name}`}
                >
                  ✕
                </button>
              </div>
            )}
            {errors[row.id] && <p className="mt-1 text-xs font-black uppercase text-(--danger)">{errors[row.id]}</p>}
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRow(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="New category"
              autoFocus
              className={smallInput}
            />
            <button onClick={addRow} disabled={busy} className={`${actionBtn} text-(--primary)`}>✓ Add</button>
            <button onClick={() => setAdding(false)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>✕</button>
          </div>
        )}
      </div>

      {errors.new && <p className="mt-3 text-sm font-black uppercase text-(--danger)">{errors.new}</p>}
    </BrutalCard>
  );
}
