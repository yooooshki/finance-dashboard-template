import { NextRequest, NextResponse } from 'next/server';
import { runEmailScan } from '@/lib/email-scan-logic';

async function handler(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const result = await runEmailScan();
    return NextResponse.json(result);
  } catch (err) {
    console.error('email-scan: error', err);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
