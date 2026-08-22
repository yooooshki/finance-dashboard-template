'use client';

import { useState } from 'react';
import { BrutalCard, displayFont, btnPrimary, inputBrutal } from '@/components/pop-ui';

export default function LoginForm({ unconfigured = false }: { unconfigured?: boolean }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (res.ok) {
      // Full navigation, so the server re-reads the new cookie.
      window.location.href = '/';
      return;
    }
    setError((await res.json()).error ?? 'Could not sign in.');
    setPassphrase('');
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <div className="w-full">
        <h1
          className="mb-6 text-4xl uppercase leading-none tracking-tight text-(--ink) md:text-5xl"
          style={displayFont}
        >
          M<span className="text-(--primary)">ooo</span>lah Tracker
        </h1>

        <BrutalCard>
          {unconfigured ? (
            <p className="text-sm font-bold uppercase text-(--danger)">
              APP_PASSPHRASE is not set on this deployment. Add it in the Vercel project
              settings and redeploy.
            </p>
          ) : (
            <form onSubmit={submit}>
              <label
                htmlFor="passphrase"
                className="block text-sm uppercase tracking-wide text-(--ink)"
                style={displayFont}
              >
                Passphrase
              </label>
              <input
                id="passphrase"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className={`${inputBrutal} mt-3 w-full`}
              />
              <button
                type="submit"
                disabled={busy || !passphrase}
                className={`${btnPrimary} mt-4 w-full px-4 py-3`}
              >
                {busy ? 'Checking…' : 'Let me in'}
              </button>
              {error && (
                <p className="mt-3 text-sm font-black uppercase text-(--danger)">{error}</p>
              )}
            </form>
          )}
        </BrutalCard>
      </div>
    </main>
  );
}
