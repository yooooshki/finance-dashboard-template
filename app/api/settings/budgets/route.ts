import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/require-auth';

const MIGRATION_HINT =
  'Budgets table not found. Run supabase/migrations/001_cycles_and_budgets.sql in the Supabase SQL editor.';

export async function GET(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { data, error } = await supabase
    .from('budgets')
    .select('id, category, monthly_amount')
    .order('category');
  if (error) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const body = await req.json();
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const amount = Number(body.monthly_amount);

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'monthly_amount must be zero or more' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({ category, monthly_amount: amount })
    .select('id, category, monthly_amount')
    .single();
  if (error) {
    return NextResponse.json(
      { error: 'Failed to add budget. The category must exist and can only have one budget.' },
      { status: 500 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
