import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const denied = await requireAuth(req.headers);
  if (denied) return denied;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const categories = searchParams.getAll('category');
  const paymentTypes = searchParams.getAll('payment_type');
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '50')));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('date', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (month) query = query.eq('month', Number(month));
  if (year) query = query.eq('year', Number(year));
  if (categories.length > 0) query = query.in('category', categories);
  if (paymentTypes.length > 0) query = query.in('payment_type', paymentTypes);

  const { data, error, count } = await query;

  if (error) {
    console.error('transactions: fetch error', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
