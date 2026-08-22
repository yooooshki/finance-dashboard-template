// Pop Ledger colourways: Classic (light) and Arcade (dark).
// Chart styles are module-level consts so chart useEffect deps stay stable.
// Client-safe: plain data only.
import type { RoughChartStyle } from '@/components/charts/rough-charts';

interface PopColours {
  bg: string;
  ink: string;
  primary: string;
  secondary: string;
  tertiary: string;
  extra: string[];
  /** Budget meter states. `danger` mirrors the --danger token in globals.css. */
  ok: string;
  warn: string;
  danger: string;
}

export interface PopChartTheme {
  chart: RoughChartStyle;
  allocation: RoughChartStyle;
  budget: RoughChartStyle;
}

function makeTheme(c: PopColours): PopChartTheme {
  const chart: RoughChartStyle = {
    stroke: c.ink,
    fill: c.primary,
    fillStyle: 'solid',
    roughness: 1,
    strokeWidth: 2.5,
    fontFamily: 'var(--font-grotesk), sans-serif',
    fontSize: 13,
    textColor: c.ink,
    accentColors: [c.primary, c.tertiary, c.extra[0]],
    formatAmount: (n) => `$${Math.round(n).toLocaleString('en-SG')}`,
  };
  return {
    chart,
    allocation: {
      ...chart,
      accentColors: [c.primary, c.secondary, c.tertiary, ...c.extra],
    },
    // Index order is meaningful: [ok, warn, over] — see RoughBudgetMeter.
    budget: {
      ...chart,
      accentColors: [c.ok, c.warn, c.danger],
    },
  };
}

export const CLASSIC = makeTheme({
  bg: '#FFFDF5',
  ink: '#101010',
  primary: '#2E5BFF',
  secondary: '#E8FF3C',
  tertiary: '#FF90C2',
  extra: ['#00C48C', '#FF7A2E', '#9C6BFF'],
  ok: '#00C48C',
  warn: '#FF7A2E',
  danger: '#E5484D',
});

export const ARCADE = makeTheme({
  bg: '#15161E',
  ink: '#F4F2EC',
  primary: '#FF477E',
  secondary: '#04E762',
  tertiary: '#FFD23F',
  extra: ['#00C4FF', '#B9FF3C', '#9C6BFF'],
  ok: '#04E762',
  warn: '#FFD23F',
  danger: '#FF6B6B',
});
