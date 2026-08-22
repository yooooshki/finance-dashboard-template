// Client-safe period maths — keep free of server-only imports (supabase, env).
// See lib/months.ts: anything a 'use client' file imports must stay server-free.
import { MONTH_NAMES } from '@/lib/months';

export type PeriodMode = 'month' | 'cycle';

export interface DayPoint {
  day: number;
  month: number;
  year: number;
}

export interface Period {
  mode: PeriodMode;
  start: DayPoint;
  end: DayPoint;
  /** yyyymmdd ordinals — transactions store date/month/year separately, so
      every range comparison in this app goes through these keys. */
  startKey: number;
  endKey: number;
  /** Full label for the hero, e.g. "August 2026" or "16 Jul – 15 Aug 2026" */
  label: string;
  /** Compact label for chart axes, e.g. "Aug" */
  shortLabel: string;
  /** Compact date span, e.g. "16 Jul – 15 Aug" or "1 – 31 Aug" */
  shortRange: string;
  /** The calendar month a period is filed under (a cycle ends in this month) */
  anchorMonth: number;
  anchorYear: number;
}

export function dayKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function shiftMonth(month: number, year: number, delta: number): { month: number; year: number } {
  let m = month + delta;
  let y = year;
  while (m <= 0) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return { month: m, year: y };
}

/**
 * Build the spend window filed under (anchorMonth, anchorYear).
 *
 * A cycle is named after the month it ENDS in — the way a statement is: with a
 * start day of 16, the cycle filed under August runs 16 Jul → 15 Aug. A start
 * day of 1 (or none) is just the calendar month, so the two modes agree at the
 * boundary rather than drifting a month apart.
 */
export function buildPeriod(
  anchorMonth: number,
  anchorYear: number,
  cycleStartDay: number | null,
): Period {
  const useCycle = cycleStartDay !== null && cycleStartDay > 1;

  if (!useCycle) {
    const last = daysInMonth(anchorYear, anchorMonth);
    return {
      mode: 'month',
      start: { day: 1, month: anchorMonth, year: anchorYear },
      end: { day: last, month: anchorMonth, year: anchorYear },
      startKey: dayKey(anchorYear, anchorMonth, 1),
      endKey: dayKey(anchorYear, anchorMonth, last),
      label: `${MONTH_NAMES[anchorMonth - 1]} ${anchorYear}`,
      shortLabel: MONTH_NAMES[anchorMonth - 1],
      shortRange: `1 – ${last} ${MONTH_NAMES[anchorMonth - 1]}`,
      anchorMonth,
      anchorYear,
    };
  }

  const startDay = cycleStartDay as number;
  const prev = shiftMonth(anchorMonth, anchorYear, -1);
  const endDay = startDay - 1;

  return {
    mode: 'cycle',
    start: { day: startDay, month: prev.month, year: prev.year },
    end: { day: endDay, month: anchorMonth, year: anchorYear },
    startKey: dayKey(prev.year, prev.month, startDay),
    endKey: dayKey(anchorYear, anchorMonth, endDay),
    label:
      `${startDay} ${MONTH_NAMES[prev.month - 1]} – ${endDay} ${MONTH_NAMES[anchorMonth - 1]} ${anchorYear}`,
    shortLabel: MONTH_NAMES[anchorMonth - 1],
    shortRange:
      `${startDay} ${MONTH_NAMES[prev.month - 1]} – ${endDay} ${MONTH_NAMES[anchorMonth - 1]}`,
    anchorMonth,
    anchorYear,
  };
}

/** The period immediately before `p`, on the same cycle. */
export function previousPeriod(p: Period, cycleStartDay: number | null): Period {
  const prev = shiftMonth(p.anchorMonth, p.anchorYear, -1);
  return buildPeriod(prev.month, prev.year, cycleStartDay);
}

/** Does a transaction's (year, month, date) fall inside the window? */
export function inPeriod(
  p: Period,
  row: { year: number; month: number; date: number },
): boolean {
  const k = dayKey(row.year, row.month, row.date);
  return k >= p.startKey && k <= p.endKey;
}

/** Clamp a user-supplied cycle start day to the range the schema allows. */
export function normaliseCycleDay(value: unknown): number | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 1 || i > 28) return null;
  return i;
}
