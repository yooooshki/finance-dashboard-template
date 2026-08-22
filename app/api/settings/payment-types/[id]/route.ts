import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normaliseCycleDay } from '@/lib/period';
import { parseLastFour } from '@/lib/last-four';
import { requireAuth } from '@/lib/require-auth';

// last_four is selected only to be collapsed to a boolean — see the collection
// route. It is never part of a response body.
const SAFE_COLUMNS = 'id, name, bank, type, cycle_start_day, last_four';

function redact(row: Record<string, unknown> & { last_four?: string | null }) {
  const { last_four, ...rest } = row;
  return { ...rest, has_last_four: Boolean(last_four) };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  // Only touch the fields the caller actually sent. last_four is write-only:
  // the form cannot read the current value back, so it omits the key unless
  // the user typed new digits or asked to clear them. Blanket-writing it would
  // wipe the digits the email parsers use to resolve a card.
  const patch: Record<string, unknown> = {};
  if ('name' in body) patch.name = body.name;
  if ('bank' in body) patch.bank = body.bank;
  if ('type' in body) patch.type = body.type;
  if ('cycle_start_day' in body) patch.cycle_start_day = normaliseCycleDay(body.cycle_start_day);
  if ('last_four' in body) {
    const lastFour = parseLastFour(body.last_four);
    if (!lastFour.ok) return NextResponse.json({ error: lastFour.error }, { status: 400 });
    patch.last_four = lastFour.value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('payment_types')
    .update(patch)
    .eq('id', id)
    .select(SAFE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: 'Failed to update payment type' }, { status: 500 });
  return NextResponse.json(redact(data));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const { id } = await params;

  // Fetch the name first so we can check for associated transactions
  const { data: pt } = await supabase
    .from('payment_types')
    .select('name')
    .eq('id', id)
    .single();

  if (pt?.name) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_type', pt.name);
    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} transaction(s) use this payment type.` },
        { status: 409 },
      );
    }
  }

  const { error } = await supabase.from('payment_types').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
