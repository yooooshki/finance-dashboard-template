'use client';

import { useEffect, useRef } from 'react';
import rough from 'roughjs';
import type { LabelAmount } from '@/lib/overview-data';

const NS = 'http://www.w3.org/2000/svg';

export interface RoughChartStyle {
  stroke: string;
  fill?: string;
  fillStyle?: 'hachure' | 'solid' | 'cross-hatch' | 'zigzag' | 'dots';
  fillWeight?: number;
  roughness: number;
  bowing?: number;
  strokeWidth?: number;
  fontFamily: string;
  fontSize?: number;
  textColor: string;
  mutedTextColor?: string;
  /** Per-row/series colors. Falls back to fill/stroke. */
  accentColors?: string[];
  formatAmount?: (n: number) => string;
}

function muted(style: RoughChartStyle): string {
  return style.mutedTextColor ?? style.textColor;
}

function mutedOpacity(style: RoughChartStyle): string | undefined {
  return style.mutedTextColor ? undefined : '0.6';
}

function fmt(style: RoughChartStyle, n: number): string {
  return style.formatAmount ? style.formatAmount(n) : `$${n.toFixed(0)}`;
}

function makeText(
  x: number,
  y: number,
  text: string,
  color: string,
  fontFamily: string,
  opts: { anchor?: string; size?: number; opacity?: string; weight?: string } = {},
): SVGTextElement {
  const el = document.createElementNS(NS, 'text');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('text-anchor', opts.anchor ?? 'middle');
  el.setAttribute('font-size', String(opts.size ?? 13));
  el.setAttribute('fill', color);
  el.setAttribute('font-family', fontFamily);
  if (opts.opacity) el.setAttribute('opacity', opts.opacity);
  if (opts.weight) el.setAttribute('font-weight', opts.weight);
  el.textContent = text;
  return el;
}

/* ------------------------------------------------------------------ */
/* Horizontal bar chart (labels left, bars right)                      */
/* ------------------------------------------------------------------ */

const BAR_LABEL_END_X = 136;
const BAR_START_X = 148;
const BAR_MAX_WIDTH = 312;
const BAR_ROW_H = 36;
const BAR_TOP_PAD = 12;
const BAR_H = 18;

export function RoughBarChart({
  data,
  style,
  emptyLabel = 'No spend this month',
  emptyClassName = 'py-4 text-center opacity-50',
}: {
  data: LabelAmount[];
  style: RoughChartStyle;
  emptyLabel?: string;
  emptyClassName?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (data.length === 0) return;

    const fillOpts = {
      stroke: style.stroke,
      fill: style.fill,
      fillStyle: style.fillStyle ?? 'hachure',
      fillWeight: style.fillWeight ?? 1,
      roughness: style.roughness,
      bowing: style.bowing ?? 1,
      strokeWidth: style.strokeWidth ?? 1.5,
    };

    const rc = rough.svg(svg);
    const maxAmount = data[0].amount;
    const baseSize = style.fontSize ?? 14;

    data.forEach((item, i) => {
      const rowY = BAR_TOP_PAD + i * BAR_ROW_H;
      const barY = rowY + (BAR_ROW_H - BAR_H) / 2;
      const centrY = rowY + BAR_ROW_H / 2;
      const barWidth = Math.max(4, (item.amount / maxAmount) * BAR_MAX_WIDTH);

      svg.appendChild(rc.rectangle(BAR_START_X, barY, barWidth, BAR_H, fillOpts));

      svg.appendChild(
        makeText(BAR_LABEL_END_X, centrY + 4, item.label, style.textColor, style.fontFamily, {
          anchor: 'end',
          size: baseSize,
        }),
      );
      svg.appendChild(
        makeText(BAR_START_X + barWidth + 8, centrY + 4, fmt(style, item.amount), muted(style), style.fontFamily, {
          anchor: 'start',
          size: baseSize - 1,
          opacity: mutedOpacity(style),
        }),
      );
    });
  }, [data, style]);

  if (data.length === 0) {
    return <p className={emptyClassName}>{emptyLabel}</p>;
  }

  const svgHeight = data.length * BAR_ROW_H + BAR_TOP_PAD * 2;

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 560 ${svgHeight}`}
      style={{ display: 'block' }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Allocation chart: one full-width row per item — name on its own     */
/* line with amount + share %, and a proportional bar underneath.      */
/* Labels never clip, so it handles long payment-type names.           */
/* ------------------------------------------------------------------ */

const ALLOC_W = 560;
const ALLOC_ROW_H = 58;
/** Rows carrying a sublabel need a second text line. */
const ALLOC_ROW_H_SUB = 72;
const ALLOC_TOP_PAD = 6;
const ALLOC_BAR_H = 20;
const ALLOC_MAX_LABEL_CHARS = 40;

export function RoughAllocationChart({
  data,
  style,
  emptyLabel = 'No spend this month',
  emptyClassName = 'py-4 text-center opacity-50',
}: {
  data: LabelAmount[];
  style: RoughChartStyle;
  emptyLabel?: string;
  emptyClassName?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (data.length === 0) return;

    const rc = rough.svg(svg);
    const total = data.reduce((s, d) => s + d.amount, 0);
    const maxAmount = Math.max(...data.map((d) => d.amount), 1);
    const baseSize = style.fontSize ?? 14;
    const accents = style.accentColors && style.accentColors.length > 0
      ? style.accentColors
      : [style.fill ?? style.stroke];

    // When rows span different periods a share-of-total is meaningless, so the
    // percentage is dropped wherever a sublabel says which period a row covers.
    const hasSub = data.some((d) => d.sublabel);
    const rowH = hasSub ? ALLOC_ROW_H_SUB : ALLOC_ROW_H;

    data.forEach((item, i) => {
      const rowY = ALLOC_TOP_PAD + i * rowH;
      const textY = rowY + 16;
      const barY = rowY + (hasSub ? 40 : 26);
      const barWidth = Math.max(6, (item.amount / maxAmount) * ALLOC_W);
      const pct = total > 0 ? (item.amount / total) * 100 : 0;

      const label =
        item.label.length > ALLOC_MAX_LABEL_CHARS
          ? `${item.label.slice(0, ALLOC_MAX_LABEL_CHARS - 1)}…`
          : item.label;

      svg.appendChild(
        makeText(0, textY, label, style.textColor, style.fontFamily, {
          anchor: 'start',
          size: baseSize,
          weight: 'bold',
        }),
      );
      if (item.sublabel) {
        svg.appendChild(
          makeText(0, textY + 16, item.sublabel, muted(style), style.fontFamily, {
            anchor: 'start',
            size: baseSize - 3,
            opacity: mutedOpacity(style) ?? '0.7',
          }),
        );
      }
      svg.appendChild(
        makeText(
          ALLOC_W,
          textY,
          hasSub
            ? fmt(style, item.amount)
            : `${fmt(style, item.amount)} · ${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`,
          muted(style),
          style.fontFamily,
          { anchor: 'end', size: baseSize - 1, opacity: mutedOpacity(style) },
        ),
      );
      svg.appendChild(
        rc.rectangle(0, barY, barWidth, ALLOC_BAR_H, {
          stroke: style.stroke,
          fill: accents[i % accents.length],
          fillStyle: style.fillStyle ?? 'solid',
          fillWeight: style.fillWeight ?? 1,
          roughness: style.roughness,
          bowing: style.bowing ?? 1,
          strokeWidth: style.strokeWidth ?? 1.5,
        }),
      );
    });
  }, [data, style]);

  if (data.length === 0) {
    return <p className={emptyClassName}>{emptyLabel}</p>;
  }

  const svgHeight =
    data.length * (data.some((d) => d.sublabel) ? ALLOC_ROW_H_SUB : ALLOC_ROW_H) +
    ALLOC_TOP_PAD * 2;

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${ALLOC_W} ${svgHeight}`}
      style={{ display: 'block' }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Trend line chart: a single series with dots, value labels, and a    */
/* dashed average reference line.                                      */
/* ------------------------------------------------------------------ */

const PLOT_LEFT = 56;
const PLOT_RIGHT = 544;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 200;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

function yPos(value: number, nm: number): number {
  return PLOT_BOTTOM - (value / nm) * PLOT_HEIGHT;
}

function xPos(index: number, total: number): number {
  if (total <= 1) return PLOT_LEFT + PLOT_WIDTH / 2;
  return PLOT_LEFT + (index / (total - 1)) * PLOT_WIDTH;
}

function niceMax(maxY: number): number {
  if (maxY <= 0) return 100;
  return Math.ceil(maxY / 100) * 100;
}

export function RoughTrendChart({
  data,
  style,
  emptyLabel = 'Nothing to plot',
  emptyClassName = 'py-4 text-center opacity-50',
}: {
  data: Array<{ label: string; total: number }>;
  style: RoughChartStyle;
  emptyLabel?: string;
  emptyClassName?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (data.length === 0) return;

    const rc = rough.svg(svg);
    const maxY = Math.max(...data.map((d) => d.total), 1);
    const nm = niceMax(maxY);
    const sw = style.strokeWidth ?? 1.5;
    const lineColor = style.accentColors?.[0] ?? style.stroke;

    // Y-axis ticks
    [0, 0.25, 0.5, 0.75, 1.0].forEach((f) => {
      const tick = Math.round(f * nm);
      const y = yPos(tick, nm);
      svg.appendChild(
        rc.line(PLOT_LEFT - 4, y, PLOT_LEFT, y, {
          stroke: style.textColor,
          strokeWidth: 0.8,
          roughness: 0,
        }),
      );
      const label = tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : String(tick);
      svg.appendChild(
        makeText(PLOT_LEFT - 8, y + 4, label, muted(style), style.fontFamily, {
          anchor: 'end',
          size: 11,
          opacity: mutedOpacity(style),
        }),
      );
    });

    // The single trend line
    for (let i = 0; i < data.length - 1; i++) {
      svg.appendChild(
        rc.line(
          xPos(i, data.length),
          yPos(data[i].total, nm),
          xPos(i + 1, data.length),
          yPos(data[i + 1].total, nm),
          { stroke: lineColor, strokeWidth: sw + 0.5, roughness: style.roughness, bowing: style.bowing ?? 1 },
        ),
      );
    }

    // Data point dots + value labels
    data.forEach((d, i) => {
      const px = xPos(i, data.length);
      const py = yPos(d.total, nm);
      svg.appendChild(
        rc.circle(px, py, 7, {
          stroke: style.stroke,
          fill: lineColor,
          fillStyle: 'solid',
          roughness: Math.min(style.roughness, 0.5),
          strokeWidth: 1,
        }),
      );
      const valueLabel =
        d.total >= 1000
          ? `${fmt(style, 0).replace(/[\d.,]+/, '')}${(d.total / 1000).toFixed(1)}k`
          : fmt(style, Math.round(d.total));
      svg.appendChild(
        makeText(px, py - 12, valueLabel, style.textColor, style.fontFamily, {
          size: 11,
          weight: 'bold',
        }),
      );
    });

    // Average reference line
    const avg = data.reduce((s, d) => s + d.total, 0) / data.length;
    const avgY = yPos(avg, nm);
    svg.appendChild(
      rc.line(PLOT_LEFT, avgY, PLOT_RIGHT, avgY, {
        stroke: muted(style),
        strokeWidth: 1,
        strokeLineDash: [6, 6],
        roughness: 0.3,
      }),
    );
    svg.appendChild(
      makeText(PLOT_RIGHT + 4, avgY + 4, 'avg', muted(style), style.fontFamily, {
        anchor: 'start',
        size: 11,
        opacity: mutedOpacity(style) ?? '0.5',
      }),
    );

    // X-axis labels
    data.forEach((d, i) => {
      svg.appendChild(
        makeText(xPos(i, data.length), 225, d.label, muted(style), style.fontFamily, {
          size: 13,
          opacity: mutedOpacity(style) ?? '0.7',
        }),
      );
    });
  }, [data, style]);

  if (data.length === 0) {
    return <p className={emptyClassName}>{emptyLabel}</p>;
  }

  return <svg ref={svgRef} width="100%" viewBox="0 0 616 240" style={{ display: 'block' }} />;
}

/* ------------------------------------------------------------------ */
/* Budget meter: a track, a fill for what's been spent, and a dashed   */
/* pace marker showing where the month has got to. The gap between     */
/* fill edge and pace marker is the whole story — fill behind the      */
/* marker means on track, fill past it means burning too fast.         */
/* ------------------------------------------------------------------ */

const METER_W = 560;
const METER_TRACK_Y = 26;
const METER_TRACK_H = 36;
const METER_H = 96;

export type BudgetState = 'ok' | 'warn' | 'over';

export function RoughBudgetMeter({
  spent,
  limit,
  /** 0–1: how far through the month we are. Omit to hide the pace marker. */
  paceFraction,
  state = 'ok',
  style,
}: {
  spent: number;
  limit: number;
  paceFraction?: number;
  state?: BudgetState;
  style: RoughChartStyle;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (limit <= 0) return;

    const rc = rough.svg(svg);
    const accents = style.accentColors ?? [];
    const stateIndex = state === 'over' ? 2 : state === 'warn' ? 1 : 0;
    const fillColor = accents[stateIndex] ?? style.fill ?? style.stroke;

    const ratio = Math.max(0, spent / limit);
    const fillWidth = Math.min(ratio, 1) * METER_W;

    // One fill, one outline — the same construction as RoughBarChart.
    //
    // This used to draw three rectangles at identical coordinates: the track
    // outline, the fill WITH its own outline, and (when overspent) a
    // cross-hatch overlay with a third. Rough.js jitters every shape
    // independently, so the outlines never coincided and the bar came out as
    // a mess of broken edges. The fill is now drawn without a stroke and the
    // track outline goes on top, so there is exactly one edge.
    if (fillWidth > 2) {
      svg.appendChild(
        rc.rectangle(0, METER_TRACK_Y, fillWidth, METER_TRACK_H, {
          stroke: 'none',
          fill: fillColor,
          fillStyle: style.fillStyle ?? 'solid',
          fillWeight: style.fillWeight ?? 1,
          roughness: style.roughness,
          bowing: style.bowing ?? 1,
        }),
      );
    }

    svg.appendChild(
      rc.rectangle(0, METER_TRACK_Y, METER_W, METER_TRACK_H, {
        stroke: style.stroke,
        roughness: style.roughness,
        bowing: style.bowing ?? 1,
        strokeWidth: style.strokeWidth ?? 1.5,
      }),
    );

    // Pace marker — where spending "should" have reached by today.
    if (paceFraction !== undefined && paceFraction > 0 && paceFraction < 1) {
      const paceX = paceFraction * METER_W;
      svg.appendChild(
        rc.line(paceX, METER_TRACK_Y - 10, paceX, METER_TRACK_Y + METER_TRACK_H + 10, {
          stroke: style.textColor,
          strokeWidth: 1.5,
          strokeLineDash: [5, 5],
          roughness: 0.4,
        }),
      );
      svg.appendChild(
        makeText(paceX, METER_TRACK_Y - 15, 'TODAY', muted(style), style.fontFamily, {
          anchor: paceFraction > 0.9 ? 'end' : 'middle',
          size: 10,
          weight: 'bold',
          opacity: mutedOpacity(style) ?? '0.7',
        }),
      );
    }

    // Scale ends.
    svg.appendChild(
      makeText(0, METER_H - 8, fmt(style, 0), muted(style), style.fontFamily, {
        anchor: 'start',
        size: 11,
        opacity: mutedOpacity(style),
      }),
    );
    svg.appendChild(
      makeText(METER_W, METER_H - 8, fmt(style, limit), muted(style), style.fontFamily, {
        anchor: 'end',
        size: 11,
        weight: 'bold',
        opacity: mutedOpacity(style),
      }),
    );
  }, [spent, limit, paceFraction, state, style]);

  return <svg ref={svgRef} width="100%" viewBox={`0 0 ${METER_W} ${METER_H}`} style={{ display: 'block' }} />;
}
