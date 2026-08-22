export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getPendingData } from '@/lib/pending-data';
import PendingList from '@/components/pending-list';

export const metadata: Metadata = { title: 'Pending — Mooolah Tracker' };

export default async function PendingPage() {
  const { transactions, categories } = await getPendingData();

  return <PendingList initialTransactions={transactions} categories={categories} />;
}
