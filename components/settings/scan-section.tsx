'use client';

import { useState } from 'react';
import { BrutalCard, ShoutLabel, btnAccent } from '@/components/pop-ui';

interface ScanResult {
  imported: number;
  skipped: number;
}

export default function ScanSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/settings/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Scan failed.');
      else setResult(data);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <BrutalCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <ShoutLabel>Email scan</ShoutLabel>
          <p className="mt-3 max-w-md text-sm font-bold text-(--ink)/70">
            Manually trigger the Gmail scan outside the daily 8 AM window.
          </p>

          {result && (
            <p className="mt-3 inline-block border-[3px] border-(--ink) bg-(--tertiary) px-3 py-1 text-sm font-black text-(--on-accent)">
              {result.imported} imported · {result.skipped} skipped
            </p>
          )}
          {error && <p className="mt-3 text-sm font-black uppercase text-(--danger)">{error}</p>}
        </div>

        <button
          onClick={runScan}
          disabled={running}
          className={`${btnAccent} shrink-0 px-5 py-2 text-sm`}
        >
          {running ? 'Scanning…' : 'Run scan now'}
        </button>
      </div>
    </BrutalCard>
  );
}
