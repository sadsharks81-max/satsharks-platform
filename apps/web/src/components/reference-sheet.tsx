// SAT Math reference sheet: formulas with their figures.
// Text and drawings come from the reference sheet in docs/references/reference sheet/ReferenceSheet.tsx,
// drawn in black. Labels use a serif italic for variables, like printed maths. Changes from the
// original drawings: square roots are drawn (radical sign with a bar) instead of the "√" character,
// the top 30° and 45° labels sit lower so they clear the slanted side, and the cylinder's "r" sits
// above the rim. SVGs are overflow-visible so labels at a drawing's edge are not cut off.
import type { ReactNode } from "react";

const MathFraction = ({ num, den }: { num: ReactNode; den: ReactNode }) => (
  <span className="mx-1 inline-flex flex-col items-center justify-center align-middle text-[10px] leading-none">
    <span className="border-b border-current px-0.5 pb-0.5">{num}</span>
    <span className="px-0.5 pt-0.5">{den}</span>
  </span>
);

const card = "flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-3.5";
const heading = "mb-2 text-sm font-bold text-black";
const lines = "stroke-black stroke-[1.25]";
const svgClass = "fill-none overflow-visible";

// A variable or number label inside a figure.
function Label({ x, y, children, size = 12, italic = true }: { x: number; y: number; children: ReactNode; size?: number; italic?: boolean }) {
  return (
    <text x={x} y={y} fontSize={size} className={`fill-black stroke-none font-serif ${italic ? "italic" : ""}`}>
      {children}
    </text>
  );
}

// "base√radicand" drawn with a real radical sign: a hook, a rising stroke and a bar over the number.
// (x, y) is the baseline start, as for a text label.
function Radical({ x, y, base, radicand, size = 12 }: { x: number; y: number; base: string; radicand: string; size?: number }) {
  const baseWidth = base.length * size * 0.5;
  const start = x + baseWidth + size * 0.08;
  const top = y - size * 0.86;
  const barEnd = start + size * 0.5 + radicand.length * size * 0.56;
  return (
    <g>
      <text x={x} y={y} fontSize={size} className="fill-black stroke-none font-serif italic">
        {base}
      </text>
      <path
        d={`M ${start} ${y - size * 0.36} L ${start + size * 0.12} ${y - size * 0.42} L ${start + size * 0.3} ${y + size * 0.05} L ${start + size * 0.5} ${top} L ${barEnd} ${top}`}
        className="fill-none stroke-black"
        strokeWidth={size * 0.07}
        strokeLinejoin="round"
      />
      <text x={start + size * 0.55} y={y} fontSize={size} className="fill-black stroke-none font-serif">
        {radicand}
      </text>
    </g>
  );
}

export function ReferenceSheet() {
  return (
    <div className="w-full space-y-6 bg-white">
      <div className="grid grid-cols-2 gap-3">
        {/* Circle */}
        <div className={card}>
          <div>
            <h4 className={heading}>Circle</h4>
            <div className="space-y-1 text-xs text-slate-700">
              <p>
                Area: A = πr<sup>2</sup>
              </p>
              <p>Circumference: C = 2πr</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 100" className={`h-24 w-24 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <circle cx="50" cy="50" r="40" />
                <line x1="50" y1="50" x2="90" y2="50" strokeDasharray="3" />
                <circle cx="50" cy="50" r="2" className="fill-black stroke-none" />
              </g>
              <Label x={68} y={40}>r</Label>
            </svg>
          </div>
        </div>

        {/* Rectangle */}
        <div className={card}>
          <div>
            <h4 className={heading}>Rectangle</h4>
            <div className="text-xs text-slate-700">
              <p>Area: A = lw</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 70" className={`h-20 w-28 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <rect x="10" y="10" width="80" height="50" />
              </g>
              <Label x={50} y={69}>l</Label>
              <Label x={95} y={38}>w</Label>
            </svg>
          </div>
        </div>

        {/* Triangle */}
        <div className={card}>
          <div>
            <h4 className={heading}>Triangle</h4>
            <div className="text-xs text-slate-700">
              <p>
                Area: A = <MathFraction num="1" den="2" />
                bh
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className={`h-20 w-26 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <polygon points="50,10 10,70 90,70" />
                <line x1="50" y1="10" x2="50" y2="70" strokeDasharray="3" />
              </g>
              <Label x={50} y={79}>b</Label>
              <Label x={55} y={45}>h</Label>
            </svg>
          </div>
        </div>

        {/* Right Triangle */}
        <div className={card}>
          <div>
            <h4 className={heading}>Right Triangle</h4>
            <div className="space-y-1 text-xs text-slate-700">
              <p className="font-semibold">Pythagorean Theorem:</p>
              <p>
                c<sup>2</sup> = a<sup>2</sup> + b<sup>2</sup>
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className={`h-20 w-26 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <polygon points="20,10 20,70 80,70" />
                <rect x="20" y="62" width="8" height="8" />
              </g>
              <Label x={10} y={45}>a</Label>
              <Label x={50} y={79}>b</Label>
              <Label x={54} y={40}>c</Label>
            </svg>
          </div>
        </div>

        {/* Special Right Triangles */}
        <div className={`${card} col-span-2`}>
          <div>
            <h4 className={heading}>Special Right Triangles</h4>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 240 120" className={`h-36 w-full max-w-[420px] ${svgClass}`} aria-hidden>
              <g className={lines}>
                {/* 30-60-90 */}
                <polygon points="30,15 30,105 100,105" />
                <rect x="30" y="93" width="12" height="12" />

                {/* 45-45-90 */}
                <polygon points="150,30 150,105 225,105" />
                <rect x="150" y="93" width="12" height="12" />
              </g>

              {/* Side lengths */}
              <Label x={15} y={65}>x</Label>
              <Radical x={54} y={120} base="x" radicand="3" />
              <Label x={72} y={58}>2x</Label>
              <Label x={135} y={72}>s</Label>
              <Label x={182} y={120}>s</Label>
              <Radical x={195} y={64} base="s" radicand="2" />

              {/* Angles. The top labels sit low enough to clear the slanted side. */}
              <Label x={79} y={99} size={10} italic={false}>60°</Label>
              <Label x={32.5} y={47} size={10} italic={false}>30°</Label>
              <Label x={198} y={99} size={10} italic={false}>45°</Label>
              <Label x={154} y={61} size={10} italic={false}>45°</Label>
            </svg>
          </div>
        </div>

        {/* Rectangular Solid */}
        <div className={card}>
          <div>
            <h4 className={heading}>Rectangular Solid</h4>
            <div className="text-xs text-slate-700">
              <p>Volume: V = lwh</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className={`h-24 w-28 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <rect x="10" y="30" width="55" height="35" />
                <polygon points="10,30 25,15 80,15 65,30" />
                <polygon points="65,30 80,15 80,50 65,65" />
                <line x1="10" y1="65" x2="25" y2="50" strokeDasharray="3" />
                <line x1="25" y1="50" x2="80" y2="50" strokeDasharray="3" />
                <line x1="25" y1="50" x2="25" y2="15" strokeDasharray="3" />
              </g>
              <Label x={35} y={76}>l</Label>
              <Label x={78} y={60}>w</Label>
              <Label x={85} y={35}>h</Label>
            </svg>
          </div>
        </div>

        {/* Cylinder */}
        <div className={card}>
          <div>
            <h4 className={heading}>Cylinder</h4>
            <div className="text-xs text-slate-700">
              <p>
                Volume: V = πr<sup>2</sup>h
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 90" className={`h-24 w-26 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <ellipse cx="50" cy="20" rx="30" ry="10" />
                <path d="M 20 20 L 20 70 A 30 10 0 0 0 80 70 L 80 20" />
                <path d="M 20 70 A 30 10 0 0 1 80 70" strokeDasharray="3" />
                <line x1="50" y1="20" x2="80" y2="20" strokeDasharray="3" />
              </g>
              {/* Above the rim, clear of the top ellipse. */}
              <Label x={63} y={7}>r</Label>
              <Label x={86} y={50}>h</Label>
            </svg>
          </div>
        </div>

        {/* Sphere */}
        <div className={card}>
          <div>
            <h4 className={heading}>Sphere</h4>
            <div className="text-xs text-slate-700">
              <p>
                Volume: V = <MathFraction num="4" den="3" />
                πr<sup>3</sup>
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 100" className={`h-24 w-24 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <circle cx="50" cy="50" r="40" />
                <ellipse cx="50" cy="50" rx="40" ry="12" strokeDasharray="3" />
                <line x1="50" y1="50" x2="90" y2="50" strokeDasharray="3" />
              </g>
              <Label x={70} y={40}>r</Label>
            </svg>
          </div>
        </div>

        {/* Cone */}
        <div className={card}>
          <div>
            <h4 className={heading}>Cone</h4>
            <div className="text-xs text-slate-700">
              <p>
                Volume: V = <MathFraction num="1" den="3" />
                πr<sup>2</sup>h
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 90" className={`h-24 w-26 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <ellipse cx="50" cy="80" rx="30" ry="10" />
                <line x1="50" y1="10" x2="20" y2="80" />
                <line x1="50" y1="10" x2="80" y2="80" />
                <line x1="50" y1="10" x2="50" y2="80" strokeDasharray="3" />
                <line x1="50" y1="80" x2="80" y2="80" strokeDasharray="3" />
              </g>
              <Label x={65} y={89}>r</Label>
              <Label x={42} y={45}>h</Label>
            </svg>
          </div>
        </div>

        {/* Pyramid */}
        <div className={card}>
          <div>
            <h4 className={heading}>Pyramid</h4>
            <div className="text-xs text-slate-700">
              <p>
                Volume: V = <MathFraction num="1" den="3" />
                lwh
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className={`h-24 w-26 ${svgClass}`} aria-hidden>
              <g className={lines}>
                <polygon points="50,10 15,65 65,65" />
                <polygon points="50,10 65,65 85,50" />
                <line x1="15" y1="65" x2="35" y2="50" strokeDasharray="3" />
                <line x1="35" y1="50" x2="85" y2="50" strokeDasharray="3" />
                <line x1="50" y1="10" x2="35" y2="50" strokeDasharray="3" />
                <line x1="50" y1="10" x2="50" y2="58" strokeDasharray="3" />
              </g>
              <Label x={38} y={74}>l</Label>
              <Label x={81} y={61}>w</Label>
              <Label x={60} y={42}>h</Label>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-300 pt-4 text-xs font-semibold text-slate-800">
        <p>• The number of degrees of arc in a circle is 360.</p>
        <p>• The number of radians of arc in a circle is 2π.</p>
        <p>• The sum of the measures in degrees of the angles of a triangle is 180.</p>
      </div>
    </div>
  );
}
