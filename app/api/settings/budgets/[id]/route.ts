import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/require-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const amount = Number(body.monthly_amount);

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'monthly_amount must be zero or more' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('budgets')
    .update({ monthly_amount: amount, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, category, monthly_amount')
    .single();
  if (error) return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  return NextResponse.json({ success: true });
}
