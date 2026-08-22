import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/require-auth';

const VALID_SOURCES = ['shortcut', 'manual'] as const;
type Source = (typeof VALID_SOURCES)[number];

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { date, month, year, amount, category, payment_type, detail, source } = body;

  // Validate required fields
  if (
    typeof date !== 'number' || date < 1 || date > 31 ||
    typeof month !== 'number' || month < 1 || month > 12 ||
    typeof year !== 'number' || year < 2000 ||
    typeof amount !== 'number' || amount <= 0 ||
    typeof category !== 'string' || category.trim() === '' ||
    typeof payment_type !== 'string' || payment_type.trim() === '' ||
    typeof detail !== 'string' || detail.trim() === ''
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: date, month, year, amount, category, payment_type, detail are required' },
      { status: 400 }
    );
  }

  const resolvedSource: Source =
    typeof source === 'string' && VALID_SOURCES.includes(source as Source)
      ? (source as Source)
      : 'shortcut';

  // Rate limit: max 5 manual/shortcut inserts per second
  const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
  const { count: recentCount, error: rateError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneSecondAgo)
    .in('source', ['shortcut', 'manual']);
  if (rateError) {
    console.error('log: rate-limit check error', rateError);
    return NextResponse.json({ error: 'Failed to insert transaction' }, { status: 500 });
  }
  if ((recentCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Rate limit exceeded: max 5 transactions per second' },
      { status: 429 },
    );
  }

  // Insert transaction
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert({
      date,
      month,
      year,
      amount,
      category: category.trim(),
      payment_type: payment_type.trim(),
      detail: detail.trim(),
      source: resolvedSource,
      status: 'committed',
    })
    .select('id')
    .single();

  if (txError) {
    console.error('log: transaction insert error', txError);
    return NextResponse.json({ error: 'Failed to insert transaction' }, { status: 500 });
  }

  // Upsert merchant_categories so this category is suggested for future email transactions
  const { error: mcError } = await supabase
    .from('merchant_categories')
    .upsert(
      { detail_key: detail.trim(), category: category.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'detail_key' }
    );

  if (mcError) {
    // Non-fatal: log but don't fail the request
    console.error('log: merchant_categories upsert error', mcError);
  }

  return NextResponse.json({ success: true, id: txData.id });
}
