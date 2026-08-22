'use client';

import { useEffect, useState } from 'react';
import { BrutalCard, ShoutLabel } from '@/components/pop-ui';

interface MerchantDefault {
  id: string;
  detail_key: string;
  category: string;
  updated_at: string;
}

const actionBtn = 'text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-40';

export default function MerchantDefaultsSection() {
  const [rows, setRows] = useState<MerchantDefault[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/settings/merchant-defaults');
    setRows(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function deleteRow(id: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/settings/merchant-defaults/${id}`, { method: 'DELETE' });
    if (res.ok) { setConfirmId(null); await load(); }
    else setError((await res.json()).error);
    setBusy(false);
  }

  return (
    <BrutalCard>
      <ShoutLabel>Merchant defaults</ShoutLabel>

      {rows.length === 0 ? (
        <p className="mt-4 font-black uppercase text-(--ink)/40">Nothing learned yet</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm text-(--ink)">
            <thead>
              <tr className="border-b-[3px] border-(--ink)">
                <th className="px-2 py-2 text-left text-xs font-black uppercase tracking-wider text-(--ink)/60">Merchant</th>
                <th className="px-2 py-2 text-left text-xs font-black uppercase tracking-wider text-(--ink)/60">Default category</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b-2 border-(--ink)/10 last:border-b-0 hover:bg-(--secondary)/10">
                  {confirmId === row.id ? (
                    <>
                      <td colSpan={2} className="px-2 py-2.5 text-sm font-bold text-(--ink)/70">
                        Clear default for &ldquo;{row.detail_key}&rdquo;?
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right">
                        <button onClick={() => deleteRow(row.id)} disabled={busy} className={`${actionBtn} mr-3 text-(--danger)`}>
                          {busy ? 'Deleting…' : '✓ Confirm'}
                        </button>
                        <button onClick={() => setConfirmId(null)} className={`${actionBtn} text-(--ink)/50 hover:text-(--ink)`}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2.5 font-mono text-xs font-bold">{row.detail_key}</td>
                      <td className="px-2 py-2.5">
                        <span className="inline-block border-2 border-(--ink) bg-(--secondary) px-2 py-0.5 text-xs font-bold uppercase text-(--on-accent)">
                          {row.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right">
                        <button onClick={() => setConfirmId(row.id)} className={`${actionBtn} text-(--ink)/50 hover:text-(--danger)`}>
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-black uppercase text-(--danger)">{error}</p>}
    </BrutalCard>
  );
}
