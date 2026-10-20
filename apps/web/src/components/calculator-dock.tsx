"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

// Desmos's own graphing calculator page for the College Board tests.
const DESMOS_URL = "https://www.desmos.com/testing/collegeboard/graphing";

// Like Bluebook: the calculator is docked on the left and the question moves over beside it, so it
// never covers the question. From 1024px it is a side panel whose width can be dragged or switched
// between normal and expanded; on smaller screens it sits above the question.
const NORMAL = 0.36; // share of the window width when opened
const EXPANDED = 0.6;
const MIN_WIDTH = 320;
const MIN_QUESTION = 420; // the question always keeps at least this much room

const clampWidth = (width: number) => Math.round(Math.max(MIN_WIDTH, Math.min(width, window.innerWidth - MIN_QUESTION)));

export function CalculatorDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [width, setWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; start: number } | null>(null);

  useEffect(() => {
    setWidth(clampWidth(window.innerWidth * NORMAL));
    const onResize = () => setWidth((current) => (current === null ? current : clampWidth(current)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const expanded = width !== null && width >= clampWidth(window.innerWidth * EXPANDED) - 1;

  function begin(event: ReactPointerEvent<HTMLElement>) {
    if (width === null) return;
    drag.current = { startX: event.clientX, start: width };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function move(event: ReactPointerEvent<HTMLElement>) {
    if (drag.current) setWidth(clampWidth(drag.current.start + event.clientX - drag.current.startX));
  }
  function end(event: ReactPointerEvent<HTMLElement>) {
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <aside
      aria-label="Calculator"
      // Hidden, not removed, when closed: the student's work stays until the test screen is left.
      className={`${open ? "flex" : "hidden"} relative h-[45vh] w-full flex-none flex-col border-b-4 border-slate-300 bg-white lg:h-auto lg:w-(--calc-width) lg:border-b-0 lg:border-r-4`}
      style={{ "--calc-width": `${width ?? 480}px` } as CSSProperties}
    >
      <div className="flex items-center gap-2 bg-black px-4 py-2 text-white">
        <span className="text-[15px] font-bold">Calculator</span>
        <button
          type="button"
          onClick={() => setWidth(clampWidth(window.innerWidth * (expanded ? NORMAL : EXPANDED)))}
          aria-label={expanded ? "Collapse calculator" : "Expand calculator"}
          title={expanded ? "Collapse" : "Expand"}
          className="ml-auto hidden cursor-pointer rounded p-1 hover:bg-white/15 lg:block"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {expanded ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
          </svg>
        </button>
        <button type="button" onClick={onClose} aria-label="Close calculator" className="ml-auto cursor-pointer rounded p-0.5 text-lg leading-none hover:bg-white/15 lg:ml-0">
          ✕
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <iframe
          src={DESMOS_URL}
          title="Desmos graphing calculator"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="h-full w-full border-0"
        />
        {/* While the edge is dragged the calculator page must not swallow the pointer. */}
        {dragging && <div aria-hidden className="absolute inset-0 cursor-col-resize" />}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize calculator"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute -right-[10px] top-1/2 z-20 hidden h-16 w-4 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center rounded-full border border-slate-400 bg-white shadow lg:flex"
      >
        <span aria-hidden className="h-8 w-[3px] rounded-full bg-slate-400" />
      </div>
    </aside>
  );
}
