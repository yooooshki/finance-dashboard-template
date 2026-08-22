import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const [categoriesResult, paymentTypesResult] = await Promise.all([
    supabase.from('categories').select('name').order('name'),
    supabase.from('payment_types').select('name').order('name'),
  ]);

  if (categoriesResult.error) {
    console.error('config: categories error', categoriesResult.error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
  if (paymentTypesResult.error) {
    console.error('config: payment_types error', paymentTypesResult.error);
    return NextResponse.json({ error: 'Failed to fetch payment types' }, { status: 500 });
  }

  return NextResponse.json({
    categories: categoriesResult.data.map((r) => r.name),
    payment_types: paymentTypesResult.data.map((r) => r.name),
  });
}
