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
    console.error('settings/scan: error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
