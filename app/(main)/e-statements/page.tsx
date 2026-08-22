'use client';

import { useRef, useState } from 'react';
import { BrutalCard, ShoutLabel, displayFont, btnGhost } from '@/components/pop-ui';

interface FlaggedItem {
  card_name: string;
  date: string;
  merchant: string;
  raw_merchant: string;
  amount: number;
}

interface StatementResult {
  filename: string;
  cards: string[];
  flagged: FlaggedItem[];
  total_parsed: number;
  total_flagged: number;
}

export default function EStatementsPage() {
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [sessions, setSessions] = useState<StatementResult[]>([]);
  const [activeResult, setActiveResult] = useState<StatementResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/statement', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to process statement.');
        return;
      }
      const result: StatementResult = {
        filename: file.name,
        cards: data.cards,
        flagged: data.flagged,
        total_parsed: data.total_parsed,
        total_flagged: data.total_flagged,
      };
      setSessions((prev) => [result, ...prev]);
      setActiveResult(result);
      setView('results');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (view === 'results' && activeResult) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-6">
        <button onClick={() => setView('upload')} className={`${btnGhost} mb-6 px-4 py-1.5 text-sm`}>
          ← Back to statements
        </button>

        <h1 className="truncate text-3xl uppercase tracking-tight text-(--ink) md:text-5xl" style={displayFont}>
          {activeResult.filename}
        </h1>
        <p className="mb-6 mt-2 text-sm font-black uppercase tracking-wide text-(--ink)/50">
          Cards: {activeResult.cards.join(', ')}
        </p>

        <BrutalCard>
          {activeResult.total_flagged === 0 ? (
            <p className="py-8 text-center font-black uppercase text-(--ink)/40">
              No new card–merchant combos found
            </p>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="border-[3px] border-(--ink) bg-(--tertiary) px-3 py-1 text-base font-black text-(--on-accent)" style={displayFont}>
                  {activeResult.total_flagged} new
                </span>
                <p className="text-sm font-bold text-(--ink)/70">
                  card–merchant relationship{activeResult.total_flagged !== 1 ? 's' : ''} across{' '}
                  {activeResult.total_parsed} transaction{activeResult.total_parsed !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-sm text-(--ink)">
                  <thead>
                    <tr className="border-b-[3px] border-(--ink)">
                      {['Date', 'Merchant', 'Raw', 'Card', 'Amount'].map((h) => (
                        <th key={h} className={`px-3 py-2 text-xs font-black uppercase tracking-wider text-(--ink)/60 ${h === 'Amount' ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeResult.flagged.map((item, i) => (
                      <tr key={i} className="border-b-2 border-(--ink)/10 last:border-b-0 hover:bg-(--secondary)/10">
                        <td className="whitespace-nowrap px-3 py-2.5 font-bold text-(--ink)/60">{item.date}</td>
                        <td className="px-3 py-2.5 font-black">{item.merchant}</td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-xs font-bold text-(--ink)/50">{item.raw_merchant}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs font-bold text-(--ink)/70">{item.card_name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-black tabular-nums">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-4 md:hidden">
                {activeResult.flagged.map((item, i) => (
                  <div key={i} className="border-[3px] border-(--ink) bg-(--bg) p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-black text-(--ink)">{item.merchant}</p>
                      <p className="font-black tabular-nums">${item.amount.toFixed(2)}</p>
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase text-(--ink)/50">
                      {item.date} · {item.card_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-bold text-(--ink)/40">{item.raw_merchant}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </BrutalCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-24 md:px-6">
      <h1 className="text-4xl uppercase tracking-tight text-(--ink) md:text-6xl" style={displayFont}>
        E-Statements
      </h1>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center border-[3px] border-dashed border-(--ink) px-6 py-16 text-center transition-all
          ${dragging ? 'bg-(--secondary)/40 -translate-y-1' : 'bg-(--card) hover:bg-(--secondary)/20'}
          ${uploading ? 'cursor-not-allowed opacity-60' : ''} shadow-[6px_6px_0_var(--ink)]`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onInputChange}
          disabled={uploading}
        />
        <span className="mb-4 border-[3px] border-(--ink) bg-(--primary) px-3 py-1 text-lg font-black text-(--on-primary)" style={displayFont}>
          PDF
        </span>
        {uploading ? (
          <p className="text-lg font-black uppercase text-(--ink)/60">Crunching numbers…</p>
        ) : (
          <>
            <p className="text-lg font-black uppercase text-(--ink)" style={displayFont}>
              Drop a statement here
            </p>
            <p className="mt-2 text-sm font-bold uppercase text-(--ink)/50">
              or tap to browse · UOB · Citibank · DBS · OCBC
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="border-[3px] border-(--ink) bg-(--tertiary) px-4 py-2 text-sm font-black uppercase text-(--on-accent)">
          {error}
        </p>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <BrutalCard>
          <ShoutLabel>This session</ShoutLabel>
          <ul className="mt-4 space-y-3">
            {sessions.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-4">
                <span className="truncate font-bold text-(--ink)">{s.filename}</span>
                <button
                  onClick={() => { setActiveResult(s); setView('results'); }}
                  className="whitespace-nowrap text-xs font-black uppercase text-(--primary) underline decoration-2 underline-offset-4 transition-opacity hover:opacity-70"
                >
                  View results →
                </button>
              </li>
            ))}
          </ul>
        </BrutalCard>
      )}
    </div>
  );
}
