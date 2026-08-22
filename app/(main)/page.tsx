export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getOverviewData } from '@/lib/overview-data';
import Overview from '@/components/overview/overview';

export const metadata: Metadata = { title: 'Overview — Mooolah Tracker' };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; card?: string; period?: string }>;
}) {
  const data = await getOverviewData(await searchParams);
  return <Overview data={data} />;
}
