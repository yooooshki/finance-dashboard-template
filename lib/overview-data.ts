import { supabase } from '@/lib/supabase';
import { MONTH_NAMES } from '@/lib/months';
import {
  buildPeriod,
  previousPeriod,
  inPeriod,
  dayKey,
  daysInMonth,
  normaliseCycleDay,
  type Period,
  type PeriodMode,
} from '@/lib/period';

export { MONTH_NAMES };

export interface LabelAmount {
  label: string;
  amount: number;
  /** Optional second line, e.g. the billing window this amount covers. */
  sublabel?: string;
}

export interface TrendMonth {
  label: string;
  total: number;
  byCategory: Record<string, number>;
}

/** A card the Overview can be filtered to, with its statement cycle. */
export interface CardOption {
  name: string;
  cycleStartDay: number | null;
}

export interface BudgetProgress {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  /** Share of the budget used, 0–100+ (can exceed 100 when overspent) */
  percent: number;
  daysElapsed: number;
  daysTotal: number;
  /** Spend projected to month end at the current daily pace */
  projected: number;
  monthLabel: string;
  isCurrentMonth: boolean;
}

export interface OverviewData {
  selectedMonth: number;
  selectedYear: number;
  currentMonth: number;
  currentYear: number;
  isCurrentMonth: boolean;
  heroLabel: string;
  /** 'month' = calendar month, 'cycle' = the selected card's statement cycle */
  periodMode: PeriodMode;
  periodLabel: string;
  /** Cycle start day of the selected card, if it has one */
  cycleStartDay: number | null;
  selectedCard: string | null;
  cards: CardOption[];
  total: number;
  priorTotal: number;
  priorLabel: string;
  momPercent: number | null;
  byCategory: LabelAmount[];
  byPaymentType: LabelAmount[];
  trendData: TrendMonth[];
  /** Categories with spend in the 6-period window, sorted by combined spend desc */
  trendCategories: string[];
  weeklyData: Array<{ label: string; total: number; byCategory: Record<string, number> }>;
  budgets: BudgetProgress[];
}

interface SpendRow {
  amount: number | string;
  category: string | null;
  payment_type: string | null;
  date: number;
  month: number;
  year: number;
}

function getISOWeek(year: number, month: number, day: number): number {
  const d = new Date(year, month - 1, day);
  const dow = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dow);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Card list with cycle days. Falls back to a cycle-less list when the
 * cycle_start_day column is absent, so a database that has not run
 * supabase/migrations/001_cycles_and_budgets.sql still renders the Overview.
 */
async function fetchCards(): Promise<CardOption[]> {
  const withCycle = await supabase
    .from('payment_types')
    .select('name, cycle_start_day')
    .order('name');

  if (!withCycle.error) {
    return (withCycle.data ?? []).map((r) => ({
      name: r.name as string,
      cycleStartDay: normaliseCycleDay(r.cycle_start_day),
    }));
  }

  const plain = await supabase.from('payment_types').select('name').order('name');
  return (plain.data ?? []).map((r) => ({ name: r.name as string, cycleStartDay: null }));
}

/** Budget targets. Empty when the budgets table does not exist yet. */
async function fetchBudgets(): Promise<Array<{ category: string; monthly_amount: number }>> {
  const { data, error } = await supabase
    .from('budgets')
    .select('category, monthly_amount')
    .order('category');
  if (error) return [];
  return (data ?? []).map((r) => ({
    category: r.category as string,
    monthly_amount: Number(r.monthly_amount),
  }));
}

export async function getOverviewData(sp: {
  month?: string;
  year?: string;
  card?: string;
  period?: string;
}): Promise<OverviewData> {
  const nowSGT = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }),
  );
  const currentYear = nowSGT.getFullYear();
  const currentMonth = nowSGT.getMonth() + 1;
  const currentDay = nowSGT.getDate();

  const selectedMonth = sp.month ? Math.max(1, Math.min(12, parseInt(sp.month, 10))) : currentMonth;
  const selectedYear  = sp.year  ? parseInt(sp.year, 10) : currentYear;
  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;

  const [cards, budgetTargets] = await Promise.all([fetchCards(), fetchBudgets()]);

  // Only honour a card filter that actually names a known card.
  const selectedCard = sp.card && cards.some((c) => c.name === sp.card) ? sp.card : null;
  const cardCycleDay = selectedCard
    ? cards.find((c) => c.name === selectedCard)?.cycleStartDay ?? null
    : null;

  // A card with a cycle day defaults to cycle view; ?period=month overrides it.
  // Without a card there is no cycle to follow, so calendar month always wins.
  const wantsCycle = sp.period !== 'month' && cardCycleDay !== null;
  const activeCycleDay = wantsCycle ? cardCycleDay : null;

  const period = buildPeriod(selectedMonth, selectedYear, activeCycleDay);
  const prior = previousPeriod(period, activeCycleDay);

  // Six consecutive periods ending at the selected one.
  const trendPeriods: Period[] = [];
  for (let i = 5; i >= 0; i--) {
    let m = selectedMonth - i;
    let y = selectedYear;
    while (m <= 0) { m += 12; y -= 1; }
    trendPeriods.push(buildPeriod(m, y, activeCycleDay));
  }

  // One fetch covers every window plus the anchor calendar month (budgets need
  // the whole month even when the spend view is on a cycle).
  const earliestKey = Math.min(
    trendPeriods[0].startKey,
    dayKey(selectedYear, selectedMonth, 1),
  );
  const earliestYear = Math.floor(earliestKey / 10000);

  const { data: rawRows } = await supabase
    .from('transactions')
    .select('amount, category, payment_type, date, month, year')
    .eq('status', 'committed')
    .not('category', 'in', '("Savings","Investments")')
    .gte('year', earliestYear)
    .order('year', { ascending: true })
    .order('month', { ascending: true })
    .order('date', { ascending: true });

  const allRows = ((rawRows ?? []) as SpendRow[]).filter(
    (r) => dayKey(r.year, r.month, r.date) >= earliestKey,
  );

  // The card filter shapes the spend views; budgets deliberately ignore it —
  // a food budget is a household total, not a per-card one.
  const rows = selectedCard
    ? allRows.filter((r) => r.payment_type === selectedCard)
    : allRows;

  const currentRows = rows.filter((r) => inPeriod(period, r));
  const priorRows = rows.filter((r) => inPeriod(prior, r));

  // --- Selected period aggregation ---
  const total = currentRows.reduce((s, r) => s + Number(r.amount), 0);

  const categoryMap: Record<string, number> = {};
  const paymentMap: Record<string, number> = {};
  for (const r of currentRows) {
    if (r.category) categoryMap[r.category] = (categoryMap[r.category] ?? 0) + Number(r.amount);
    if (r.payment_type) paymentMap[r.payment_type] = (paymentMap[r.payment_type] ?? 0) + Number(r.amount);
  }
  const byCategory = Object.entries(categoryMap)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
  const anyCycleConfigured = cards.some((c) => c.cycleStartDay !== null);

  // Spend per card.
  //
  // With a card selected the whole Overview is on one period, so the single
  // row simply follows it. With "All cards" there is no one period that could
  // apply — each card bills on its own cycle — so every card is totalled over
  // ITS OWN window and labelled with the dates. That answers "what will this
  // card charge me?", which is the question the card breakdown is for. The
  // rows then cover different spans, so they deliberately carry no percentage
  // share: it would be comparing unlike periods.
  const byPaymentType: LabelAmount[] = selectedCard
    ? Object.entries(paymentMap)
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount)
    : cards
        .map((c) => {
          const cardPeriod = buildPeriod(selectedMonth, selectedYear, c.cycleStartDay);
          const amount = allRows
            .filter((r) => r.payment_type === c.name && inPeriod(cardPeriod, r))
            .reduce((s, r) => s + Number(r.amount), 0);
          return {
            label: c.name,
            amount,
            // Dates only once at least one card has a cycle. Until then every
            // row spans the same calendar month and repeating it is just noise.
            ...(anyCycleConfigured ? { sublabel: cardPeriod.shortRange } : {}),
          };
        })
        .filter((r) => r.amount > 0)
        .sort((a, b) => b.amount - a.amount);

  // --- Prior period ---
  const priorTotal = priorRows.reduce((s, r) => s + Number(r.amount), 0);
  const priorLabel = prior.mode === 'cycle'
    ? `prev cycle`
    : MONTH_NAMES[prior.anchorMonth - 1];
  const momPercent = priorTotal === 0 ? null : ((total - priorTotal) / priorTotal) * 100;

  // --- Trend data ---
  const combinedTotals: Record<string, number> = {};
  const trendData: TrendMonth[] = trendPeriods.map((p) => {
    const bucket: Record<string, number> = {};
    let bucketTotal = 0;
    for (const r of rows) {
      if (!inPeriod(p, r)) continue;
      bucketTotal += Number(r.amount);
      if (r.category) {
        bucket[r.category] = (bucket[r.category] ?? 0) + Number(r.amount);
        combinedTotals[r.category] = (combinedTotals[r.category] ?? 0) + Number(r.amount);
      }
    }
    return { label: p.shortLabel, total: bucketTotal, byCategory: bucket };
  });
  const trendCategories = Object.entries(combinedTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  // --- Weekly data (within the selected period) ---
  const weeklyMap: Record<number, { total: number; byCategory: Record<string, number>; firstKey: number }> = {};
  for (const r of currentRows) {
    const w = getISOWeek(r.year, r.month, r.date);
    const key = dayKey(r.year, r.month, r.date);
    const bucket = (weeklyMap[w] ??= { total: 0, byCategory: {}, firstKey: key });
    bucket.firstKey = Math.min(bucket.firstKey, key);
    bucket.total += Number(r.amount);
    if (r.category) {
      bucket.byCategory[r.category] = (bucket.byCategory[r.category] ?? 0) + Number(r.amount);
    }
  }
  // Sort chronologically, not by week number — a cycle can straddle new year.
  const weeklyData = Object.entries(weeklyMap)
    .sort((a, b) => a[1].firstKey - b[1].firstKey)
    .map(([week, bucket]) => ({
      label: `W${week}`,
      total: bucket.total,
      byCategory: bucket.byCategory,
    }));

  // --- Budgets (calendar month, every card) ---
  const monthStart = dayKey(selectedYear, selectedMonth, 1);
  const daysTotal = daysInMonth(selectedYear, selectedMonth);
  const monthEnd = dayKey(selectedYear, selectedMonth, daysTotal);
  const monthRows = allRows.filter((r) => {
    const k = dayKey(r.year, r.month, r.date);
    return k >= monthStart && k <= monthEnd;
  });
  const daysElapsed = isCurrentMonth ? Math.min(currentDay, daysTotal) : daysTotal;
  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  const budgets: BudgetProgress[] = budgetTargets.map(({ category, monthly_amount }) => {
    const spent = monthRows
      .filter((r) => r.category === category)
      .reduce((s, r) => s + Number(r.amount), 0);
    return {
      category,
      limit: monthly_amount,
      spent,
      remaining: monthly_amount - spent,
      percent: monthly_amount > 0 ? (spent / monthly_amount) * 100 : 0,
      daysElapsed,
      daysTotal,
      projected: daysElapsed > 0 ? (spent / daysElapsed) * daysTotal : 0,
      monthLabel,
      isCurrentMonth,
    };
  });

  const heroLabel = period.mode === 'cycle'
    ? period.label
    : isCurrentMonth
      ? 'This month'
      : period.label;

  return {
    selectedMonth,
    selectedYear,
    currentMonth,
    currentYear,
    isCurrentMonth,
    heroLabel,
    periodMode: period.mode,
    periodLabel: period.label,
    cycleStartDay: cardCycleDay,
    selectedCard,
    cards,
    total,
    priorTotal,
    priorLabel,
    momPercent,
    byCategory,
    byPaymentType,
    trendData,
    trendCategories,
    weeklyData,
    budgets,
  };
}
