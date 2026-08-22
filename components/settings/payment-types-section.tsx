'use client';

import { useEffect, useState } from 'react';
import { BrutalCard, ShoutLabel, inputBrutal } from '@/components/pop-ui';

interface PaymentType {
  id: string;
  name: string;
  bank: string;
  type: string;
  /** Day of month the statement cycle starts (1–28); null = calendar month */
  cycle_start_day: number | null;
  /** The digits themselves are never sent to the browser — only whether they exist. */
  has_last_four: boolean;
}

type Fields = Omit<PaymentType, 'id' | 'has_last_four'>;

const EMPTY: Fields = { name: '', bank: '', type: 'credit', cycle_start_day: null };

const actionBtn = 'text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-40';
const smallInput = `${inputBrutal} w-full px-2 py-1 text-sm shadow-[2px_2px_0_var(--ink)]`;

/**
 * last_four is write-only: the form cannot read the stored digits back, so a
 * blank box means "leave whatever is there alone". Clearing is explicit.
 */
type LastFourEdit = { digits: string; clear: boolean };
const NO_LAST_FOUR_EDIT: LastFourEdit = { digits: '', clear: false };

/** Empty input clears the cycle; anything outside 1–28 is rejected by the API. */
function parseCycleDay(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export default function PaymentTypesSection() {
  const [rows, setRows] = useState<PaymentType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Fields>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [newFields, setNewFields] = useState<Fields>(EMPTY);
  const [editLastFour, setEditLastFour] = useState<LastFourEdit>(NO_LAST_FOUR_EDIT);
  const [newLastFour, setNewLastFour] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/settings/payment-types');
    setRows(await res.json());
  }

  useEffect(() => { load(); }, []);

  function startEdit(row: PaymentType) {
    setEditingId(row.id);
    setEditFields({
      name: row.name,
      bank: row.bank,
      type: row.type,
      cycle_start_day: row.cycle_start_day ?? null,
    });
    setEditLastFour(NO_LAST_FOUR_EDIT);
    setErrors({});
  }

  async function saveEdit(id: string) {
    setBusy(true);
    // Send last_four only when the user actually changed it; omitting the key
    // tells the API to leave the stored digits untouched.
    const payload: Record<string, unknown> = { ...editFields };
    if (editLastFour.clear) payload.last_four = null;
    else if (editLastFour.digits.trim() !== '') payload.last_four = editLastFour.digits.trim();

    const res = await fetch(`/api/settings/payment-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setEditingId(null); setEditLastFour(NO_LAST_FOUR_EDIT); await load(); }
    else setErrors({ [id]: (await res.json()).error });
    setBusy(false);
  }

  async function deleteRow(id: string) {
    setBusy(true);
    const res = await fetch(`/api/settings/payment-types/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else setErrors({ [id]: (await res.json()).error });
    setBusy(false);
  }

  async function addRow() {
    if (!newFields.name.trim() || !newFields.bank.trim() || !newFields.type) {
      setErrors({ new: 'Name, bank, and type are required.' });
      return;
    }
    setBusy(true);
    const res = await fetch('/api/settings/payment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newFields, last_four: newLastFour.trim() }),
    });
    if (res.ok) { setAdding(false); setNewFields(EMPTY); setNewLastFour(''); await load(); }
    else setErrors({ new: (await res.json()).error });
    setBusy(false);
  }

  const cycleInput = (value: number | null, onChange: (v: number | null) => void) => (
    <input
      type="number"
      min={1}
      max={28}
      value={value ?? ''}
      onChange={e => onChange(parseCycleDay(e.target.value))}
      placeholder="—"
      aria-label="Statement cycle start day"
      className={`${smallInput} w-20`}
    />
  );

  return (
    <BrutalCard>
      <div className="mb-4 flex items-center justify-between">
        <ShoutLabel>Payment types</ShoutLabel>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setNewFields(EMPTY); setNewLastFour(''); setErrors({}); }}
            className={`${actionBtn} text-(--primary) hover:opacity-70`}
          >
            + Add
          </button>
        )}
      </div>

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-(--ink)/50">
        Cycle day = the day of the month each statement period begins (1–28).
        Set it and the Overview can total that card by its billing cycle instead of the calendar month.
        Last 4 = the card&rsquo;s last four digits, used to match bank alert emails to this card.
        They are stored but never sent back to your browser, so the box shows only whether they are set.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm text-(--ink)">
          <thead>
            <tr className="border-b-[3px] border-(--ink)">
              {['Name', 'Bank', 'Type', 'Cycle day', 'Last 4', ''].map((h, i) => (
                <th key={i} className="px-2 py-2 text-left text-xs font-black uppercase tracking-wider text-(--ink)/60">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b-2 border-(--ink)/10 last:border-b-0">
                {editingId === row.id ? (
                  <>
                    <td className="px-2 py-2">
                      <input value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))} className={smallInput} />
                    </td>
                    <td className="px-2 py-2">
                      <input value={editFields.bank} onChange={e => setEditFields(f => ({ ...f, bank: e.target.value }))} className={`${smallInput} w-24`} />
                    </td>
                    <td className="px-2 py-2">
                      <select value={editFields.type} onChange={e => setEditFields(f => ({ ...f, type: e.target.value }))} className={`${smallInput} w-auto`}>
                        <option value="credit">credit</option>
                        <option value="debit">debit</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      {cycleInput(editFields.cycle_start_day, v => setEditFields(f => ({ ...f, cycle_start_day: v })))}
                    </td>
                    <td className="px-2 py-2">
                      {editLastFour.clear ? (
                        <button
                          onClick={() => setEditLastFour(NO_LAST_FOUR_EDIT)}
                          className={`${actionBtn} text-(--danger)`}
                        >
                          Will clear — undo
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            inputMode="numeric"
                            maxLength={4}
                            value={editLastFour.digits}
                            onChange={e => setEditLastFour({ digits: e.target.value.replace(/\D/g, ''), clear: false })}
                            placeholder={row.has_last_four ? '•••• set' : 'not set'}
                            aria-label="New last four digits"
                            className={`${smallInput} w-24`}
                          />
                          {row.has_last_four && (
                            <button
                              onClick={() => setEditLastFour({ digits: '', clear: true })}
                              className={`${actionBtn} text-(--ink)/50 hover:text-(--danger)`}
                              aria-label="Clear the stored digits"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <button onClick={() => saveEdit(row.id)} disabled={busy} className={`${actionBtn} mr-3 text-(--primary)`}>✓ Save</button>
                      <button onClick={() => setEditingId(null)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-2.5 font-bold">{row.name}</td>
                    <td className="px-2 py-2.5 font-bold text-(--ink)/60">{row.bank}</td>
                    <td className="px-2 py-2.5">
                      <span className="inline-block border-2 border-(--ink) bg-(--secondary) px-2 py-0.5 text-xs font-bold uppercase text-(--on-accent)">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      {row.cycle_start_day ? (
                        <span className="inline-block border-2 border-(--ink) bg-(--tertiary) px-2 py-0.5 text-xs font-bold uppercase text-(--on-accent)">
                          Day {row.cycle_start_day}
                        </span>
                      ) : (
                        <span className="text-xs font-bold uppercase text-(--ink)/40">Calendar</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      {row.has_last_four ? (
                        <span className="inline-block border-2 border-(--ink) bg-(--card) px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-(--ink)">
                          ••••
                        </span>
                      ) : (
                        <span className="text-xs font-bold uppercase text-(--ink)/40">Not set</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <button onClick={() => startEdit(row)} className={`${actionBtn} mr-3 text-(--ink)/50 hover:text-(--primary)`}>Edit</button>
                      <button onClick={() => deleteRow(row.id)} disabled={busy} className={`${actionBtn} text-(--ink)/50 hover:text-(--danger)`}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {adding && (
              <tr className="border-b-2 border-(--ink)/10 bg-(--secondary)/10">
                <td className="px-2 py-2">
                  <input value={newFields.name} onChange={e => setNewFields(f => ({ ...f, name: e.target.value }))} placeholder="Name" className={smallInput} />
                </td>
                <td className="px-2 py-2">
                  <input value={newFields.bank} onChange={e => setNewFields(f => ({ ...f, bank: e.target.value }))} placeholder="Bank" className={`${smallInput} w-24`} />
                </td>
                <td className="px-2 py-2">
                  <select value={newFields.type} onChange={e => setNewFields(f => ({ ...f, type: e.target.value }))} className={`${smallInput} w-auto`}>
                    <option value="credit">credit</option>
                    <option value="debit">debit</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  {cycleInput(newFields.cycle_start_day, v => setNewFields(f => ({ ...f, cycle_start_day: v })))}
                </td>
                <td className="px-2 py-2">
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    value={newLastFour}
                    onChange={e => setNewLastFour(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    aria-label="Last four digits"
                    className={`${smallInput} w-24`}
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <button onClick={addRow} disabled={busy} className={`${actionBtn} mr-3 text-(--primary)`}>✓ Add</button>
                  <button onClick={() => setAdding(false)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {Object.entries(errors).map(([k, msg]) => (
        <p key={k} className="mt-3 text-sm font-black uppercase text-(--danger)">{msg}</p>
      ))}
    </BrutalCard>
  );
}
