import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import HistoryTable from '@/components/history/history-table';
import { displayFont } from '@/components/pop-ui';

export const metadata: Metadata = { title: 'History — Mooolah Tracker' };

export default async function HistoryPage() {
  const [catResult, ptResult] = await Promise.all([
    supabase.from('categories').select('name').order('name'),
    supabase.from('payment_types').select('name').order('name'),
  ]);

  const categories = (catResult.data ?? []).map((r) => r.name as string);
  const paymentTypes = (ptResult.data ?? []).map((r) => r.name as string);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24 md:px-6">
      <h1 className="mb-6 text-4xl uppercase tracking-tight text-(--ink) md:text-6xl" style={displayFont}>
        The receipts
      </h1>
      <HistoryTable categories={categories} paymentTypes={paymentTypes} />
    </div>
  );
}
