import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normaliseCycleDay } from '@/lib/period';
import { parseLastFour } from '@/lib/last-four';
import { requireAuth } from '@/lib/require-auth';

// last_four must never reach the browser (see commit ecfee10). It is selected
// only so it can be collapsed to a boolean by redact() below, and it is never
// part of a response body.
const SAFE_COLUMNS = 'id, name, bank, type, cycle_start_day, last_four';
const LEGACY_COLUMNS = 'id, name, bank, type, last_four';

type Row = Record<string, unknown> & { last_four?: string | null };

/** Replace last_four with has_last_four. Every response goes through this. */
function redact<T extends Row>(row: T) {
  const { last_four, ...rest } = row;
  return { ...rest, has_last_four: Boolean(last_four) };
}

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const { data, error } = await supabase
    .from('payment_types')
    .select(SAFE_COLUMNS)
    .order('name');

  if (!error) return NextResponse.json((data ?? []).map(redact));

  // Database predates migration 001 — serve the rest rather than failing.
  const legacy = await supabase.from('payment_types').select(LEGACY_COLUMNS).order('name');
  if (legacy.error) {
    return NextResponse.json({ error: 'Failed to fetch payment types' }, { status: 500 });
  }
  return NextResponse.json((legacy.data ?? []).map(redact));
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const body = await req.json();
  const { name, bank, type } = body;
  if (!name || !bank || !type) {
    return NextResponse.json({ error: 'name, bank, and type are required' }, { status: 400 });
  }
  const lastFour = parseLastFour(body.last_four);
  if (!lastFour.ok) {
    return NextResponse.json({ error: lastFour.error }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('payment_types')
    .insert({
      name,
      bank,
      last_four: lastFour.value,
      type,
      cycle_start_day: normaliseCycleDay(body.cycle_start_day),
    })
    .select(SAFE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: 'Failed to insert payment type' }, { status: 500 });
  return NextResponse.json(redact(data), { status: 201 });
}
