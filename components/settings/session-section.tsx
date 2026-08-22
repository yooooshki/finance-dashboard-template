'use client';

import { useState } from 'react';
import { BrutalCard, ShoutLabel, btnGhost } from '@/components/pop-ui';

export default function SessionSection() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <BrutalCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <ShoutLabel>Session</ShoutLabel>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-(--ink)/50">
            Signing out clears this device only. Changing APP_PASSPHRASE signs out everything.
          </p>
        </div>
        <button onClick={signOut} disabled={busy} className={`${btnGhost} px-4 py-2`}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </BrutalCard>
  );
}
