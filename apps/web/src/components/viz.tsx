import { InlineText, toPlainText } from "@/lib/rich-text";

// Draws the structured figures stored with a question: tables, bar charts, line charts and
// right triangles. The data comes from the question bank; nothing here is fetched.

type Series = { label: string; values: number[] };

interface ChartViz {
  type: "bar" | "line";
  data: Series[];
  legend?: string[];
  yMin?: number;
  yMax: number;
  yTickStep: number;
  titleLines?: string[];
  xAxisLines?: string[];
  xAxisLabel?: string;
  yAxisLines?: string[];
  xTickLabels?: string[];
}

interface TableViz {
  type: "table";
  headers: string[];
  rows: string[][];
  title?: string | null;
  titleLines?: string[];
  caption?: string | null;
  footnote?: string | null;
}

interface TriangleViz {
  type: "triangle";
  orientation?: string;
  verticalVal?: string;
  horizontalVal?: string;
  hypotenuseVal?: string;
  vertexTop?: string;
  vertexRightAngle?: string;
  vertexAcute?: string;
  angleTop?: string;
  angleBottom?: string;
  caption?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const SHADES = ["#1e293b", "#94a3b8", "#cbd5e1", "#475569", "#e2e8f0"];
const MARKERS = ["circle", "square", "triangle", "diamond"] as const;

function Title({ lines, math }: { lines: string[]; math: boolean }) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-2 text-center text-sm font-semibold leading-snug">
      {lines.map((line, index) => (
        <div key={index}>
          <InlineText text={line} math={math} />
        </div>
      ))}
    </div>
  );
}

function Table({ viz, math }: { viz: TableViz; math: boolean }) {
  const title = viz.titleLines ?? (viz.title ? [viz.title] : []);
  return (
    <figure className="my-3">
      <Title lines={title} math={math} />
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-sm">
          <thead>
            <tr>
              {viz.headers.map((header, index) => (
                <th key={index} className="border border-slate-800 px-3 py-1.5 text-center font-semibold">
                  <InlineText text={header} math={math} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viz.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-slate-800 px-3 py-1.5 text-center">
                    <InlineText text={String(cell)} math={math} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(viz.footnote || viz.caption) && (
        <figcaption className="mt-1.5 text-center text-xs text-slate-600">
          <InlineText text={(viz.footnote || viz.caption)!} math={math} />
        </figcaption>
      )}
    </figure>
  );
}

function Marker({ shape, x, y, color }: { shape: (typeof MARKERS)[number]; x: number; y: number; color: string }) {
  if (shape === "square") return <rect x={x - 4} y={y - 4} width={8} height={8} fill={color} />;
  if (shape === "triangle") return <polygon points={`${x},${y - 5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill={color} />;
  if (shape === "diamond") return <polygon points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`} fill={color} />;
  return <circle cx={x} cy={y} r={4} fill={color} />;
}

function Chart({ viz, math }: { viz: ChartViz; math: boolean }) {
  const width = 460;
  const height = 280;
  const margin = { top: 12, right: 14, bottom: 62, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const yMin = viz.yMin ?? 0;
  const yMax = viz.yMax > yMin ? viz.yMax : yMin + 1;
  const step = viz.yTickStep > 0 ? viz.yTickStep : (yMax - yMin) / 5;
  const ticks: number[] = [];
  for (let value = yMin; value <= yMax + step / 1000 && ticks.length < 60; value += step) ticks.push(Number(value.toFixed(6)));
  const y = (value: number) => margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const isBar = viz.type === "bar";
  // Bar: one group per data entry, one bar per legend series. Line: one line per data entry.
  const categories = isBar ? viz.data.map((entry) => entry.label) : (viz.xTickLabels ?? []);
  const seriesNames = isBar ? (viz.legend ?? []) : viz.data.map((entry) => entry.label);
  const seriesCount = isBar ? Math.max(1, ...viz.data.map((entry) => entry.values.length)) : viz.data.length;
  const slot = plotWidth / Math.max(1, categories.length);
  const xAxis = [...(viz.xAxisLines ?? []), ...(viz.xAxisLabel ? [viz.xAxisLabel] : [])].map(toPlainText).filter(Boolean);
  const yAxis = (viz.yAxisLines ?? []).map(toPlainText).filter(Boolean);
  const showLegend = seriesNames.length > 1;

  return (
    <figure className="my-3">
      <Title lines={viz.titleLines ?? []} math={math} />
      <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto w-full max-w-[460px]" role="img" aria-label={toPlainText((viz.titleLines ?? []).join(" ")) || "Chart"}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke="#cbd5e1" strokeWidth={tick === yMin ? 0 : 1} />
            <text x={margin.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="#0f172a">
              {tick}
            </text>
          </g>
        ))}
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="#0f172a" />
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="#0f172a" />

        {isBar &&
          viz.data.map((entry, groupIndex) => {
            const groupWidth = slot * 0.7;
            const barWidth = groupWidth / seriesCount;
            const start = margin.left + groupIndex * slot + (slot - groupWidth) / 2;
            return entry.values.map((value, seriesIndex) => (
              <rect
                key={`${groupIndex}-${seriesIndex}`}
                x={start + seriesIndex * barWidth}
                y={y(Math.max(value, yMin))}
                width={Math.max(1, barWidth - 1)}
                height={Math.max(0, y(yMin) - y(Math.max(value, yMin)))}
                fill={SHADES[seriesIndex % SHADES.length]}
                stroke="#0f172a"
                strokeWidth={0.6}
              />
            ));
          })}

        {!isBar &&
          viz.data.map((entry, seriesIndex) => {
            const color = SHADES[seriesIndex % 2 === 0 ? 0 : 3]!;
            const points = entry.values.map((value, index) => ({ x: margin.left + slot * (index + 0.5), y: y(value) }));
            return (
              <g key={seriesIndex}>
                <polyline
                  points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeDasharray={seriesIndex % 2 === 1 ? "5 3" : undefined}
                />
                {points.map((point, index) => (
                  <Marker key={index} shape={MARKERS[seriesIndex % MARKERS.length]!} x={point.x} y={point.y} color={color} />
                ))}
              </g>
            );
          })}

        {categories.map((label, index) => (
          <text key={index} x={margin.left + slot * (index + 0.5)} y={margin.top + plotHeight + 15} textAnchor="middle" fontSize={categories.length > 8 ? 9 : 11} fill="#0f172a">
            {toPlainText(label)}
          </text>
        ))}
        {xAxis.map((line, index) => (
          <text key={index} x={margin.left + plotWidth / 2} y={margin.top + plotHeight + 34 + index * 13} textAnchor="middle" fontSize={11.5} fill="#0f172a">
            {line}
          </text>
        ))}
        {yAxis.map((line, index) => (
          <text
            key={index}
            transform={`translate(${14 + index * 13}, ${margin.top + plotHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={11.5}
            fill="#0f172a"
          >
            {line}
          </text>
        ))}
      </svg>
      {showLegend && (
        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {seriesNames.map((name, index) => (
            <span key={index} className="inline-flex items-center gap-1.5">
              {isBar ? (
                <span className="inline-block h-3 w-3 border border-slate-900" style={{ background: SHADES[index % SHADES.length] }} />
              ) : (
                <svg width="22" height="10" aria-hidden>
                  <line x1="0" x2="22" y1="5" y2="5" stroke={SHADES[index % 2 === 0 ? 0 : 3]} strokeWidth="1.6" strokeDasharray={index % 2 === 1 ? "5 3" : undefined} />
                  <Marker shape={MARKERS[index % MARKERS.length]!} x={11} y={5} color={SHADES[index % 2 === 0 ? 0 : 3]!} />
                </svg>
              )}
              {toPlainText(name)}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

function Triangle({ viz }: { viz: TriangleViz }) {
  // The right angle sits at the bottom, on the side named by `orientation`; the acute vertex is opposite.
  const right = viz.orientation !== "left";
  const corner = { x: right ? 230 : 50, y: 170 };
  const top = { x: corner.x, y: 30 };
  const acute = { x: right ? 50 : 230, y: 170 };
  const side = right ? 1 : -1;
  const label = (value: string | undefined) => (value ? toPlainText(value) : "");
  const text = (x: number, y: number, value: string | undefined, anchor: "start" | "middle" | "end" = "middle") =>
    label(value) ? (
      <text x={x} y={y} textAnchor={anchor} fontSize={14} fontFamily="Georgia, serif" fill="#0f172a">
        {label(value)}
      </text>
    ) : null;

  return (
    <figure className="my-3">
      <svg viewBox="0 0 280 205" className="mx-auto w-full max-w-[280px]" role="img" aria-label="Right triangle">
        <polygon points={`${top.x},${top.y} ${corner.x},${corner.y} ${acute.x},${acute.y}`} fill="none" stroke="#0f172a" strokeWidth={1.5} />
        <polyline
          points={`${corner.x - side * 12},${corner.y} ${corner.x - side * 12},${corner.y - 12} ${corner.x},${corner.y - 12}`}
          fill="none"
          stroke="#0f172a"
          strokeWidth={1}
        />
        {text(top.x + side * 8, top.y - 6, viz.vertexTop, right ? "start" : "end")}
        {text(corner.x + side * 10, corner.y + 16, viz.vertexRightAngle, right ? "start" : "end")}
        {text(acute.x - side * 10, acute.y + 16, viz.vertexAcute, right ? "end" : "start")}
        {text(corner.x + side * 10, (top.y + corner.y) / 2 + 5, viz.verticalVal, right ? "start" : "end")}
        {text((corner.x + acute.x) / 2, corner.y + 18, viz.horizontalVal)}
        {text((top.x + acute.x) / 2 - side * 14, (top.y + acute.y) / 2 - 8, viz.hypotenuseVal, right ? "end" : "start")}
        {text(top.x - side * 10, top.y + 34, viz.angleTop, right ? "end" : "start")}
        {text(acute.x + side * 34, acute.y - 6, viz.angleBottom, right ? "start" : "end")}
      </svg>
      {viz.caption && <figcaption className="text-center text-xs text-slate-600">{toPlainText(viz.caption)}</figcaption>}
    </figure>
  );
}

export function Viz({ viz, math = false }: { viz: unknown; math?: boolean }) {
  if (!isRecord(viz)) return null;
  if (viz.type === "table" && Array.isArray(viz.headers) && Array.isArray(viz.rows)) return <Table viz={viz as unknown as TableViz} math={math} />;
  if ((viz.type === "bar" || viz.type === "line") && Array.isArray(viz.data)) return <Chart viz={viz as unknown as ChartViz} math={math} />;
  if (viz.type === "triangle") return <Triangle viz={viz as unknown as TriangleViz} />;
  return <p className="my-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">This question has a figure that cannot be displayed yet.</p>;
}
