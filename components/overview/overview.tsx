'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { BudgetProgress, OverviewData } from '@/lib/overview-data';
import {
  RoughBarChart,
  RoughAllocationChart,
  RoughTrendChart,
  RoughBudgetMeter,
  type BudgetState,
} from '@/components/charts/rough-charts';
import { getMonthOptions, useOverviewNavigate } from '@/components/charts/month-nav';
import { useTheme } from '@/lib/hooks/use-theme';
import { CLASSIC, ARCADE } from '@/lib/pop-theme';
import { BrutalCard, ShoutLabel, displayFont, inputBrutal } from '@/components/pop-ui';

const springIn = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

const money = (n: number) =>
  n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const money0 = (n: number) => Math.round(n).toLocaleString('en-SG');

/** Pressed/unpressed toggle button, matching the monthly/weekly pills. */
function toggleClass(active: boolean): string {
  return `border-[3px] border-(--ink) px-3 py-1 text-xs font-bold uppercase transition-all ${
    active
      ? 'translate-x-[3px] translate-y-[3px] bg-(--ink) text-(--bg) shadow-none'
      : 'bg-(--card) text-(--ink) shadow-[3px_3px_0_var(--ink)] hover:bg-(--secondary) hover:text-(--on-accent) active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
  }`;
}

function budgetState(b: BudgetProgress): BudgetState {
  if (b.spent > b.limit) return 'over';
  if (b.isCurrentMonth && b.projected > b.limit) return 'warn';
  return 'ok';
}

const STATE_CHIP: Record<BudgetState, string> = {
  ok: 'bg-(--secondary) text-(--on-accent)',
  warn: 'bg-(--tertiary) text-(--on-accent)',
  over: 'bg-(--danger) text-(--on-primary)',
};

function BudgetCard({
  budget,
  style,
}: {
  budget: BudgetProgress;
  style: React.ComponentProps<typeof RoughBudgetMeter>['style'];
}) {
  const state = budgetState(budget);
  const daysLeft = Math.max(0, budget.daysTotal - budget.daysElapsed);
  const pace = budget.daysTotal > 0 ? budget.daysElapsed / budget.daysTotal : 1;

  const verdict =
    state === 'over'
      ? `$${money0(Math.abs(budget.remaining))} over`
      : state === 'warn'
        ? `On track for $${money0(budget.projected)}`
        : budget.isCurrentMonth
          ? `$${money0(budget.remaining)} left`
          : `$${money0(budget.remaining)} under`;

  return (
    <BrutalCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShoutLabel>{budget.category} budget</ShoutLabel>
        <span
          className={`inline-block border-[3px] border-(--ink) px-3 py-1 text-sm shadow-[3px_3px_0_var(--ink)] ${STATE_CHIP[state]}`}
          style={displayFont}
        >
          {verdict}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-4xl leading-none tracking-tight md:text-5xl" style={displayFont}>
          ${money(budget.spent)}
        </span>
        <span className="text-lg font-bold uppercase text-(--ink)/50">
          of ${money0(budget.limit)} · {budget.monthLabel}
        </span>
      </div>

      <div className="mt-4">
        <RoughBudgetMeter
          spent={budget.spent}
          limit={budget.limit}
          paceFraction={budget.isCurrentMonth ? pace : undefined}
          state={state}
          style={style}
        />
      </div>

      <p className="mt-2 text-sm font-bold uppercase text-(--ink)/60">
        {Math.round(budget.percent)}% used
        {!budget.isCurrentMonth
          ? ' · month closed'
          : state === 'over'
            ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left · already over`
            : daysLeft > 0
              ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left · $${money0(
                  budget.remaining / daysLeft,
                )}/day to stay under`
              : ' · last day of the month'}
      </p>
    </BrutalCard>
  );
}

export default function Overview({ data }: { data: OverviewData }) {
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const [trendCategory, setTrendCategory] = useState('');
  const { isDark } = useTheme();
  const theme = isDark ? ARCADE : CLASSIC;
  const navigate = useOverviewNavigate('/', data.currentMonth, data.currentYear);
  const options = getMonthOptions(data.currentMonth, data.currentYear);
  const mom = data.momPercent;

  const go = (patch: Partial<{ month: number; year: number; card: string | null; period: 'month' | 'cycle' }>) =>
    navigate({
      month: data.selectedMonth,
      year: data.selectedYear,
      card: data.selectedCard,
      period: data.periodMode,
      ...patch,
    });

  const trendSource = view === 'monthly' ? data.trendData : data.weeklyData;
  const trendSeries = trendSource.map((d) => ({
    label: d.label,
    total: trendCategory ? d.byCategory[trendCategory] ?? 0 : d.total,
  }));

  const cycleAvailable = data.cycleStartDay !== null;
  const periodNoun = data.periodMode === 'cycle' ? 'cycle' : 'month';

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-24 md:px-6">
      {/* Hero */}
      <motion.section
        {...springIn}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      >
        <BrutalCard bg="bg-(--primary)" className="relative text-(--on-primary)">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-wide" style={displayFont}>
              Damage report · {data.heroLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={data.selectedCard ?? ''}
                onChange={(e) => go({ card: e.target.value || null })}
                aria-label="Filter by card"
                className={`${inputBrutal} py-1 text-sm`}
              >
                <option value="">All cards</option>
                {data.cards.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={`${data.selectedMonth}-${data.selectedYear}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-').map(Number);
                  go({ month: m, year: y });
                }}
                aria-label="Select month"
                className={`${inputBrutal} py-1 text-sm`}
              >
                {options.map((o) => (
                  <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>
                    {o.label}{o.isCurrent ? ' ★' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p
            className="mt-4 break-all text-5xl leading-none tracking-tight sm:text-6xl md:text-8xl"
            style={displayFont}
          >
            ${money(data.total)}
          </p>

          {/* Period control — only a card has a statement cycle to follow */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {cycleAvailable ? (
              <>
                <button
                  onClick={() => go({ period: 'cycle' })}
                  className={toggleClass(data.periodMode === 'cycle')}
                >
                  Card cycle
                </button>
                <button
                  onClick={() => go({ period: 'month' })}
                  className={toggleClass(data.periodMode === 'month')}
                >
                  Calendar month
                </button>
                <span className="text-xs font-bold uppercase text-(--on-primary)/70">
                  {data.periodMode === 'cycle'
                    ? `${data.periodLabel} · starts day ${data.cycleStartDay}`
                    : data.periodLabel}
                </span>
              </>
            ) : (
              <span className="text-xs font-bold uppercase text-(--on-primary)/70">
                {data.selectedCard
                  ? `${data.periodLabel} · set a cycle start day in Settings to bill this card by its statement period`
                  : `${data.periodLabel} · pick a card to use its statement cycle`}
              </span>
            )}
          </div>

          {mom !== null && (
            <span
              className={`absolute -bottom-5 right-4 border-[3px] border-(--ink) px-3 py-1.5 text-base font-black text-(--on-accent) shadow-[4px_4px_0_var(--ink)] md:right-8 md:px-4 md:py-2 md:text-lg ${
                mom > 0 ? 'bg-(--tertiary)' : 'bg-(--secondary)'
              }`}
              style={displayFont}
            >
              {mom >= 0 ? '+' : ''}{mom.toFixed(1)}% vs {data.priorLabel}
            </span>
          )}
        </BrutalCard>
      </motion.section>

      {/* Budgets */}
      {data.budgets.length > 0 && (
        <div className="space-y-8 pt-4">
          {data.budgets.map((b, i) => (
            <motion.div
              key={b.category}
              {...springIn}
              transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.08 + i * 0.04 }}
            >
              <BudgetCard budget={b} style={theme.budget} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 pt-4 md:grid-cols-2">
        <motion.div
          {...springIn}
          transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.16 }}
        >
          <BrutalCard>
            <ShoutLabel>Where it went</ShoutLabel>
            <div className="mt-4">
              <RoughBarChart
                data={data.byCategory}
                style={theme.chart}
                emptyLabel="NOTHING. ZERO. ZILCH."
                emptyClassName="py-8 text-center font-black uppercase text-(--ink)/40"
              />
            </div>
          </BrutalCard>
        </motion.div>
        <motion.div
          {...springIn}
          transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.24 }}
        >
          <BrutalCard>
            <ShoutLabel>Which card ate it</ShoutLabel>
            <div className="mt-4">
              <RoughAllocationChart
                data={data.byPaymentType}
                style={theme.allocation}
                emptyLabel="NOTHING. ZERO. ZILCH."
                emptyClassName="py-8 text-center font-black uppercase text-(--ink)/40"
              />
            </div>
          </BrutalCard>
        </motion.div>
      </div>

      {/* Trend */}
      <motion.div
        {...springIn}
        transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.32 }}
      >
        <BrutalCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ShoutLabel>The trend line</ShoutLabel>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={trendCategory}
                onChange={(e) => setTrendCategory(e.target.value)}
                aria-label="Filter trend by category"
                className={`${inputBrutal} py-1 text-sm ${trendCategory ? 'bg-(--secondary) text-(--on-accent)' : ''}`}
              >
                <option value="">All categories</option>
                {data.trendCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {(['monthly', 'weekly'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`border-[3px] border-(--ink) px-4 py-1 text-sm font-bold uppercase transition-all ${
                    view === v
                      ? 'translate-x-[3px] translate-y-[3px] bg-(--ink) text-(--bg) shadow-none'
                      : 'bg-(--card) text-(--ink) shadow-[3px_3px_0_var(--ink)] hover:bg-(--secondary) hover:text-(--on-accent) active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <RoughTrendChart
              data={trendSeries}
              style={theme.chart}
              emptyLabel="NOTHING TO PLOT YET"
              emptyClassName="py-8 text-center font-black uppercase text-(--ink)/40"
            />
          </div>
          <p className="mt-3 text-sm font-bold uppercase text-(--ink)/60">
            {trendCategory ? `${trendCategory} spend` : 'Total spend'} per{' '}
            {view === 'monthly' ? periodNoun : 'week'} · dashed = average
          </p>
        </BrutalCard>
      </motion.div>
    </div>
  );
}
