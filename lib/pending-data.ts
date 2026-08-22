import { supabase } from '@/lib/supabase';
import type { PendingTransaction } from '@/lib/hooks/use-pending';

export async function getPendingData(): Promise<{
  transactions: PendingTransaction[];
  categories: string[];
}> {
  const [txResult, catResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, date, month, year, amount, category, payment_type, detail, status')
      .eq('status', 'pending')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('date', { ascending: false }),
    supabase.from('categories').select('name').order('name'),
  ]);

  return {
    transactions: txResult.data ?? [],
    categories: (catResult.data ?? []).map((r) => r.name),
  };
}
