"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Small single-series charts (score over time, predicted-score trend, pace, daily practice).
// One series each, so the title names it and there is no legend. Marks follow one spec: 2px lines,
// 8px end dots with a 2px surface ring, columns at most 24px wide with a 4px rounded end, hairline
// grid. Every chart has a hover tooltip and a table view.

const BRAND = "#324dc7";
const GRID = "#e2e8f0";
const AXIS_TEXT = "#64748b";

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(element);
    setWidth(Math.floor(element.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Clean tick values between min and max.
function ticks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ?? raw;
  const first = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let value = first; value <= max + 1e-9; value += step) values.push(Math.round(value * 100) / 100);
  return values;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  // Kept inside the chart: flips to the left of the point near the right edge.
  const left = x > width - 170 ? x - 162 : x + 12;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-[150px] rounded-lg border border-slate-900 bg-white px-3 py-2 text-xs text-slate-700 shadow-md"
      style={{ left, top: Math.max(0, y - 20) }}
    >
      {children}
    </div>
  );
}

function TableView({ caption, headers, rows }: { caption: string; headers: [string, string]; rows: [string, string][] }) {
  return (
    <details className="mt-2 text-xs text-slate-600">
      <summary className="cursor-pointer font-semibold hover:text-brand-600">Show as table</summary>
      <table className="mt-2 w-full max-w-md text-left tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-300">
            <th className="py-1 font-semibold">{headers[0]}</th>
            <th className="py-1 text-right font-semibold">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], index) => (
            <tr key={index} className="border-b border-slate-100">
              <td className="py-1">{label}</td>
              <td className="py-1 text-right">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export interface LinePoint {
  label: string;
  value: number;
  // Extra tooltip line, e.g. the test name.
  detail?: string;
}

export function LineChart({
  points,
  min,
  max,
  height = 200,
  caption,
  valueLabel,
}: {
  points: LinePoint[];
  min: number;
  max: number;
  height?: number;
  caption: string;
  valueLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 44, bottom: 24, left: 40 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length <= 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value: number) => pad.top + plotH - ((value - min) / (max - min || 1)) * plotH;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`).join(" ");
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${pad.top + plotH} L${x(0)},${pad.top + plotH} Z` : "";
  const last = points[points.length - 1];

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    let best = 0;
    points.forEach((_, index) => {
      if (Math.abs(x(index) - px) < Math.abs(x(best) - px)) best = index;
    });
    setHover(best);
  }

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={caption} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="touch-none">
            {ticks(min, max).map((tick) => (
              <g key={tick}>
                <line x1={pad.left} x2={pad.left + plotW} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
                <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular-nums">
                  {tick}
                </text>
              </g>
            ))}
            {points.length > 0 && (
              <>
                <text x={pad.left} y={height - 6} fontSize={11} fill={AXIS_TEXT}>
                  {points[0]!.label}
                </text>
                {points.length > 1 && (
                  <text x={pad.left + plotW} y={height - 6} fontSize={11} fill={AXIS_TEXT} textAnchor="end">
                    {last!.label}
                  </text>
                )}
              </>
            )}
            {area && <path d={area} fill={BRAND} opacity={0.1} />}
            {points.length > 1 && <path d={path} fill="none" stroke={BRAND} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke={AXIS_TEXT} strokeWidth={1} />}
            {/* The latest value: end dot and its label. */}
            {last && (
              <>
                <circle cx={x(points.length - 1)} cy={y(last.value)} r={5} fill={BRAND} stroke="#fff" strokeWidth={2} />
                <text x={x(points.length - 1) + 9} y={y(last.value)} dy="0.32em" fontSize={12} fontWeight={700} fill="#0f172a" className="tabular-nums">
                  {last.value}
                </text>
              </>
            )}
            {hover !== null && hover !== points.length - 1 && (
              <circle cx={x(hover)} cy={y(points[hover]!.value)} r={5} fill={BRAND} stroke="#fff" strokeWidth={2} />
            )}
          </svg>
        )}
        {hover !== null && points[hover] && (
          <Tooltip x={x(hover)} y={y(points[hover]!.value)} width={width}>
            <div className="font-semibold text-slate-900">
              {valueLabel}: {points[hover]!.value}
            </div>
            <div>{points[hover]!.label}</div>
            {points[hover]!.detail && <div className="truncate">{points[hover]!.detail}</div>}
          </Tooltip>
        )}
      </div>
      <TableView caption={caption} headers={["Date", valueLabel]} rows={points.map((point) => [point.detail ? `${point.label} · ${point.detail}` : point.label, String(point.value)])} />
    </div>
  );
}

export interface Column {
  label: string;
  value: number;
  detail?: string;
  // Drawn in the brand colour; others in a lighter step (e.g. days the goal was not met).
  strong?: boolean;
}

export function ColumnChart({
  columns,
  height = 160,
  reference,
  caption,
  valueLabel,
  format = (value: number) => String(value),
  showLabels = true,
}: {
  columns: Column[];
  height?: number;
  // A horizontal line, e.g. the official pace or the daily goal.
  reference?: { value: number; label: string };
  caption: string;
  valueLabel: string;
  format?: (value: number) => string;
  showLabels?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 16, right: 8, bottom: showLabels ? 22 : 8, left: 36 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...columns.map((column) => column.value), reference?.value ?? 0) * 1.1;
  const band = columns.length ? plotW / columns.length : 0;
  // At most 24px wide, with at least a 2px surface gap between neighbours.
  const barW = Math.max(1, Math.min(24, band - 2));
  const y = (value: number) => pad.top + plotH - (value / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(columns.length / Math.max(1, Math.floor(plotW / 44))));

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={caption} onPointerLeave={() => setHover(null)}>
            {ticks(0, max, 3).map((tick) => (
              <g key={tick}>
                <line x1={pad.left} x2={pad.left + plotW} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
                <text x={pad.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular-nums">
                  {format(tick)}
                </text>
              </g>
            ))}
            {columns.map((column, index) => {
              const cx = pad.left + band * index + band / 2;
              const top = y(column.value);
              const h = pad.top + plotH - top;
              const r = Math.min(4, h, barW / 2);
              const x0 = cx - barW / 2;
              // Rounded data end, square at the baseline.
              const d =
                h <= 0
                  ? ""
                  : `M${x0},${pad.top + plotH} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${pad.top + plotH} Z`;
              return (
                <g key={index} onPointerEnter={() => setHover(index)}>
                  {/* Hit target: the whole band, taller than the bar. */}
                  <rect x={pad.left + band * index} y={pad.top} width={band} height={plotH} fill="transparent" />
                  {d && <path d={d} fill={BRAND} opacity={column.strong === false ? 0.35 : hover === index ? 0.85 : 1} />}
                  {showLabels && index % labelEvery === 0 && (
                    <text x={cx} y={height - 6} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                      {column.label}
                    </text>
                  )}
                </g>
              );
            })}
            {reference && (
              <g>
                <line x1={pad.left} x2={pad.left + plotW} y1={y(reference.value)} y2={y(reference.value)} stroke="#0f172a" strokeWidth={1} />
                <text x={pad.left + plotW} y={y(reference.value) - 4} textAnchor="end" fontSize={11} fontWeight={600} fill="#0f172a">
                  {reference.label}
                </text>
              </g>
            )}
          </svg>
        )}
        {hover !== null && columns[hover] && (
          <Tooltip x={pad.left + band * hover + band / 2} y={y(columns[hover]!.value)} width={width}>
            <div className="font-semibold text-slate-900">
              {valueLabel}: {format(columns[hover]!.value)}
            </div>
            <div>{columns[hover]!.label}</div>
            {columns[hover]!.detail && <div>{columns[hover]!.detail}</div>}
          </Tooltip>
        )}
      </div>
      <TableView caption={caption} headers={["", valueLabel]} rows={columns.map((column) => [column.detail ? `${column.label} · ${column.detail}` : column.label, format(column.value)])} />
    </div>
  );
}

// A horizontal meter (e.g. accuracy, goal progress): filled track on a lighter step of the same hue.
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}
