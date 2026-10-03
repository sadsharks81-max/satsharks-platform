// SAT Math Reference Sheet — extracted from my-daily-compass
// Source: frontend/src/routes/dashboard/sat-runner.$attemptId.tsx (lines 17-22 and 514-758)
//
// Styling uses Tailwind + Material-3-style color tokens from the source project:
//   bg-surface-container-low, bg-surface-container-lowest, border-outline-variant,
//   text-on-surface, text-on-surface-variant, stroke-primary, fill-primary
// If the target project doesn't define these, map them to its own theme colors.

import type { ReactNode } from "react";

const MathFraction = ({ num, den }: { num: ReactNode; den: ReactNode }) => (
  <span className="inline-flex flex-col items-center justify-center align-middle mx-1 text-[10px] leading-none">
    <span className="border-b border-current pb-0.5 px-0.5">{num}</span>
    <span className="pt-0.5 px-0.5">{den}</span>
  </span>
);

export function ReferenceSheet() {
  return (
    <div className="w-full h-full overflow-y-auto p-5 scroll-smooth bg-surface-container-lowest space-y-6">
      {/* Formula Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Circle */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Circle</h4>
            <div className="text-xs text-on-surface-variant space-y-1">
              <p>Area: A = πr<sup>2</sup></p>
              <p>Circumference: C = 2πr</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 100" className="w-24 h-24 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <circle cx="50" cy="50" r="40" />
                <line x1="50" y1="50" x2="90" y2="50" strokeDasharray="3" />
                <circle cx="50" cy="50" r="2" className="fill-primary stroke-none" />
              </g>
              <text x="68" y="40" className="fill-primary stroke-none text-xs font-sans font-normal">r</text>
            </svg>
          </div>
        </div>

        {/* Rectangle */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Rectangle</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Area: A = lw</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 70" className="w-28 h-20 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <rect x="10" y="10" width="80" height="50" />
              </g>
              <text x="50" y="69" className="fill-primary stroke-none text-xs font-sans font-normal">l</text>
              <text x="95" y="38" className="fill-primary stroke-none text-xs font-sans font-normal">w</text>
            </svg>
          </div>
        </div>

        {/* Triangle */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Triangle</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Area: A = <MathFraction num="1" den="2" />bh</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className="w-26 h-20 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <polygon points="50,10 10,70 90,70" />
                <line x1="50" y1="10" x2="50" y2="70" strokeDasharray="3" />
              </g>
              <text x="50" y="79" className="fill-primary stroke-none text-xs font-sans font-normal">b</text>
              <text x="55" y="45" className="fill-primary stroke-none text-xs font-sans font-normal">h</text>
            </svg>
          </div>
        </div>

        {/* Right Triangle */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Right Triangle</h4>
            <div className="text-xs text-on-surface-variant space-y-1">
              <p className="font-semibold">Pythagorean Theorem:</p>
              <p>c<sup>2</sup> = a<sup>2</sup> + b<sup>2</sup></p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className="w-26 h-20 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <polygon points="20,10 20,70 80,70" />
                <rect x="20" y="62" width="8" height="8" className="stroke-primary/50" />
              </g>
              <text x="10" y="45" className="fill-primary stroke-none text-xs font-sans font-normal">a</text>
              <text x="50" y="79" className="fill-primary stroke-none text-xs font-sans font-normal">b</text>
              <text x="54" y="40" className="fill-primary stroke-none text-xs font-sans font-normal">c</text>
            </svg>
          </div>
        </div>

        {/* Special Right Triangles */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between col-span-2">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Special Right Triangles</h4>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 240 120" className="w-full max-w-[420px] h-36 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                {/* 30-60-90 */}
                <polygon points="30,15 30,105 100,105" />
                <rect x="30" y="93" width="12" height="12" className="stroke-primary/50" />

                {/* 45-45-90 */}
                <polygon points="150,30 150,105 225,105" />
                <rect x="150" y="93" width="12" height="12" className="stroke-primary/50" />
              </g>

              {/* Parameter Texts */}
              <g className="fill-primary stroke-none text-[11px] font-sans font-normal">
                <text x="15" y="65">x</text>
                <text x="54" y="120">x√3</text>
                <text x="72" y="58">2x</text>
                <text x="135" y="72">s</text>
                <text x="182" y="120">s</text>
                <text x="195" y="64">s√2</text>
              </g>

              {/* Angle Texts */}
              <g className="fill-primary stroke-none text-[9.5px] font-sans font-normal">
                <text x="79" y="99">60°</text>
                <text x="32.5" y="38">30°</text>
                <text x="198" y="99">45°</text>
                <text x="154" y="52">45°</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Rectangular Solid */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Rectangular Solid</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Volume: V = lwh</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className="w-28 h-24 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <rect x="10" y="30" width="55" height="35" />
                <polygon points="10,30 25,15 80,15 65,30" />
                <polygon points="65,30 80,15 80,50 65,65" />
                <line x1="10" y1="65" x2="25" y2="50" strokeDasharray="3" />
                <line x1="25" y1="50" x2="80" y2="50" strokeDasharray="3" />
                <line x1="25" y1="50" x2="25" y2="15" strokeDasharray="3" />
              </g>
              <text x="35" y="76" className="fill-primary stroke-none text-xs font-sans font-normal">l</text>
              <text x="78" y="60" className="fill-primary stroke-none text-xs font-sans font-normal">w</text>
              <text x="85" y="35" className="fill-primary stroke-none text-xs font-sans font-normal">h</text>
            </svg>
          </div>
        </div>

        {/* Cylinder */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Cylinder</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Volume: V = πr<sup>2</sup>h</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 90" className="w-26 h-24 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <ellipse cx="50" cy="20" rx="30" ry="10" />
                <path d="M 20 20 L 20 70 A 30 10 0 0 0 80 70 L 80 20" />
                <path d="M 20 70 A 30 10 0 0 1 80 70" strokeDasharray="3" />
                <line x1="50" y1="20" x2="80" y2="20" strokeDasharray="3" />
              </g>
              <text x="65" y="14" className="fill-primary stroke-none text-xs font-sans font-normal">r</text>
              <text x="86" y="50" className="fill-primary stroke-none text-xs font-sans font-normal">h</text>
            </svg>
          </div>
        </div>

        {/* Sphere */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Sphere</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Volume: V = <MathFraction num="4" den="3" />πr<sup>3</sup></p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 100" className="w-24 h-24 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <circle cx="50" cy="50" r="40" />
                <ellipse cx="50" cy="50" rx="40" ry="12" strokeDasharray="3" />
                <line x1="50" y1="50" x2="90" y2="50" strokeDasharray="3" />
              </g>
              <text x="70" y="40" className="fill-primary stroke-none text-xs font-sans font-normal">r</text>
            </svg>
          </div>
        </div>

        {/* Cone */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Cone</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Volume: V = <MathFraction num="1" den="3" />πr<sup>2</sup>h</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 90" className="w-26 h-24 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <ellipse cx="50" cy="80" rx="30" ry="10" />
                <line x1="50" y1="10" x2="20" y2="80" />
                <line x1="50" y1="10" x2="80" y2="80" />
                <line x1="50" y1="10" x2="50" y2="80" strokeDasharray="3" />
                <line x1="50" y1="80" x2="80" y2="80" strokeDasharray="3" />
              </g>
              <text x="65" y="89" className="fill-primary stroke-none text-xs font-sans font-normal">r</text>
              <text x="42" y="45" className="fill-primary stroke-none text-xs font-sans font-normal">h</text>
            </svg>
          </div>
        </div>

        {/* Pyramid */}
        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface mb-2">Pyramid</h4>
            <div className="text-xs text-on-surface-variant">
              <p>Volume: V = <MathFraction num="1" den="3" />lwh</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center py-2">
            <svg viewBox="0 0 100 80" className="w-26 h-24 fill-none">
              <g className="stroke-primary stroke-[1.25]">
                <polygon points="50,10 15,65 65,65" />
                <polygon points="50,10 65,65 85,50" />
                <line x1="15" y1="65" x2="35" y2="50" strokeDasharray="3" />
                <line x1="35" y1="50" x2="85" y2="50" strokeDasharray="3" />
                <line x1="50" y1="10" x2="35" y2="50" strokeDasharray="3" />
                <line x1="50" y1="10" x2="50" y2="58" strokeDasharray="3" />
              </g>
              <text x="38" y="74" className="fill-primary stroke-none text-xs font-sans font-normal">l</text>
              <text x="81" y="61" className="fill-primary stroke-none text-xs font-sans font-normal">w</text>
              <text x="60" y="42" className="fill-primary stroke-none text-xs font-sans font-normal">h</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Instructions Panel */}
      <div className="border-t border-outline-variant/40 pt-4 text-xs text-on-surface-variant space-y-2 font-semibold">
        <p>• The number of degrees of arc in a circle is 360.</p>
        <p>• The number of radians of arc in a circle is 2π.</p>
        <p>• The sum of the measures in degrees of the angles of a triangle is 180.</p>
      </div>
    </div>
  );
}
