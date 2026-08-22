'use client';

import { useRouter } from 'next/navigation';
import { MONTH_NAMES } from '@/lib/months';

export interface MonthOption {
  month: number;
  year: number;
  label: string;
  isCurrent: boolean;
}

export function getMonthOptions(currentMonth: number, currentYear: number): MonthOption[] {
  const options: MonthOption[] = [];
  for (let i = 0; i < 24; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) { m += 12; y--; }
    options.push({
      month: m,
      year: y,
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      isCurrent: m === currentMonth && y === currentYear,
    });
  }
  return options;
}

/**
 * Returns a navigate(month, year) callback that stays on `basePath`,
 * dropping query params when the current month is selected.
 */
export function useMonthNavigate(basePath: string, currentMonth: number, currentYear: number) {
  const router = useRouter();
  return (month: number, year: number) => {
    if (month === currentMonth && year === currentYear) {
      router.push(basePath);
    } else {
      router.push(`${basePath}?month=${month}&year=${year}`);
    }
  };
}

/**
 * Overview navigation: month/year plus the card filter and period mode.
 * Defaults are omitted from the URL so the plain "/" stays clean —
 * current month, all cards, and (for a card with a cycle) cycle view.
 */
export function useOverviewNavigate(basePath: string, currentMonth: number, currentYear: number) {
  const router = useRouter();
  return (next: {
    month: number;
    year: number;
    card: string | null;
    period: 'month' | 'cycle' | null;
  }) => {
    const params = new URLSearchParams();
    if (!(next.month === currentMonth && next.year === currentYear)) {
      params.set('month', String(next.month));
      params.set('year', String(next.year));
    }
    if (next.card) params.set('card', next.card);
    if (next.card && next.period === 'month') params.set('period', 'month');
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };
}
