'use client';
// Title metadata lives in the nearest server layout; this page is a client component.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrutalCard, displayFont, btnPrimary, btnGhost, inputBrutal } from '@/components/pop-ui';

interface Config {
  categories: string[];
  payment_types: string[];
}

function todaySGT() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-wider text-(--ink)/60';

export default function AddPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);

  const [dateStr, setDateStr] = useState(todaySGT());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [detail, setDetail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: Config) => {
        setConfig(data);
        if (data.categories.length) setCategory(data.categories[0]);
        if (data.payment_types.length) setPaymentType(data.payment_types[0]);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!dateStr || isNaN(parsedAmount) || parsedAmount <= 0 || !category || !paymentType || !detail.trim()) {
      setError('All fields are required. Amount must be greater than 0.');
      return;
    }

    const [y, m, d] = dateStr.split('-').map(Number);

    setSubmitting(true);
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: d,
          month: m,
          year: y,
          amount: parsedAmount,
          category,
          payment_type: paymentType,
          detail: detail.trim(),
          source: 'manual',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save expense.');
        setSubmitting(false);
        return;
      }
      router.push('/');
    } catch {
      setError('An unexpected error occurred.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24 md:px-6">
      <h1 className="mb-6 text-4xl uppercase tracking-tight text-(--ink) md:text-5xl" style={displayFont}>
        Log the damage
      </h1>

      <BrutalCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                required
                className={`${inputBrutal} w-full`}
              />
            </div>
            <div>
              <label className={labelClass}>Amount (SGD)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                className={`${inputBrutal} w-full`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
              className={`${inputBrutal} w-full`}
              disabled={!config}
            >
              {config?.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Payment type</label>
            <select
              value={paymentType}
              onChange={e => setPaymentType(e.target.value)}
              required
              className={`${inputBrutal} w-full`}
              disabled={!config}
            >
              {config?.payment_types.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Detail / merchant</label>
            <input
              type="text"
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="e.g. Grab Food"
              required
              className={`${inputBrutal} w-full`}
            />
          </div>

          {error && (
            <p className="border-[3px] border-(--ink) bg-(--tertiary) px-3 py-2 text-sm font-black uppercase text-(--on-accent)">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || !config}
              className={`${btnPrimary} flex-1 py-2.5 text-base`}
            >
              {submitting ? 'Saving…' : 'Save it ✓'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className={`${btnGhost} px-5 py-2.5 text-base`}
            >
              Cancel
            </button>
          </div>
        </form>
      </BrutalCard>
    </div>
  );
}
