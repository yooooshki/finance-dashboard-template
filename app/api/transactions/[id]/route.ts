import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/require-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.category === 'string') updates.category = body.category;
  if (typeof body.status === 'string') updates.status = body.status;
  if (typeof body.detail === 'string' && body.detail.trim()) updates.detail = body.detail.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select('detail, category')
    .single();

  if (txError) {
    console.error(`transactions PATCH: update failed for ${id}`, txError);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }

  // Upsert merchant_categories when committing
  if (updates.status === 'committed' && typeof tx.category === 'string' && tx.category) {
    const { error: mcError } = await supabase
      .from('merchant_categories')
      .upsert(
        { detail_key: tx.detail, category: tx.category, updated_at: new Date().toISOString() },
        { onConflict: 'detail_key' },
      );
    if (mcError) {
      console.error(`transactions PATCH: merchant_categories upsert failed for ${id}`, mcError);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const { id } = await params;

  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) {
    console.error(`transactions DELETE: failed for ${id}`, error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
