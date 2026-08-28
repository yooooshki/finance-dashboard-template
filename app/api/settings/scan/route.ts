import { NextRequest, NextResponse } from 'next/server';
import { runEmailScan } from '@/lib/email-scan-logic';
import { requireAuth } from '@/lib/require-auth';

// Settings-only trigger — no CRON_SECRET required (internal app use).
export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const result = await runEmailScan();
    return NextResponse.json(result);
  } catch (err) {
    // Detail stays server-side. A scan failure carries Gmail and Supabase error
    // text — token states, project URLs, column names — and this route is
    // reachable from the browser, so the caller gets a generic message and the
    // operator reads the real one in the function logs (same rule as ecfee10).
    console.error('settings/scan: error', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
