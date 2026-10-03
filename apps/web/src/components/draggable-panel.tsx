"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A floating tool window (calculator, reference sheet). It does not block the page: the question
// underneath stays usable. Drag it by its title bar; optionally resize it from the bottom-right
// corner. It is always kept inside the browser window.
export function DraggablePanel({
  title,
  onClose,
  children,
  width = 400,
  height = 560,
  // Where it opens. Omitted = top right, below the test header.
  initialX,
  initialY = 76,
  resizable = false,
  minWidth = 300,
  minHeight = 250,
  // No inner padding (for embedded pages such as the calculator).
  flush = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  height?: number;
  initialX?: number;
  initialY?: number;
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  flush?: boolean;
}) {
  const gesture = useRef<{ kind: "move" | "resize"; startX: number; startY: number; start: Rect } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  // While dragging or resizing, a transparent cover sits over the content, so an embedded page
  // (the calculator) cannot swallow the pointer and stall the gesture.
  const [active, setActive] = useState(false);

  const fit = useCallback(
    (next: Rect): Rect => {
      const maxWidth = window.innerWidth - 16;
      const maxHeight = window.innerHeight - 16;
      const w = Math.min(Math.max(next.width, Math.min(minWidth, maxWidth)), maxWidth);
      const h = Math.min(Math.max(next.height, Math.min(minHeight, maxHeight)), maxHeight);
      return {
        width: w,
        height: h,
        x: Math.min(Math.max(8, next.x), window.innerWidth - w - 8),
        y: Math.min(Math.max(8, next.y), window.innerHeight - h - 8),
      };
    },
    [minWidth, minHeight],
  );

  useEffect(() => {
    setRect(fit({ x: initialX ?? window.innerWidth - width - 24, y: initialY, width, height }));
    const onResize = () => setRect((current) => (current ? fit(current) : current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // Opens once at its starting place; later size changes come from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function begin(kind: "move" | "resize", event: ReactPointerEvent<HTMLElement>) {
    if (!rect || (kind === "move" && (event.target as HTMLElement).closest("button"))) return;
    gesture.current = { kind, startX: event.clientX, startY: event.clientY, start: rect };
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(true);
  }
  function update(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    setRect(
      fit(
        current.kind === "move"
          ? { ...current.start, x: current.start.x + dx, y: current.start.y + dy }
          : { ...current.start, width: current.start.width + dx, height: current.start.height + dy },
      ),
    );
  }
  function end(event: ReactPointerEvent<HTMLElement>) {
    gesture.current = null;
    setActive(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!rect) return null;
  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed z-50 flex flex-col overflow-hidden rounded-lg border border-black bg-white shadow-2xl"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      <div
        onPointerDown={(event) => begin("move", event)}
        onPointerMove={update}
        onPointerUp={end}
        onPointerCancel={end}
        className="grid cursor-move touch-none select-none grid-cols-[1fr_auto_1fr] items-center bg-black px-4 py-2.5 text-white"
      >
        <span className="text-[15px] font-bold">{title}</span>
        <span aria-hidden className="grid grid-cols-3 gap-[3px]" title="Drag to move">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-white/70" />
          ))}
        </span>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="cursor-pointer justify-self-end rounded p-0.5 text-lg leading-none hover:bg-white/15">
          ✕
        </button>
      </div>
      <div className={`relative min-h-0 flex-1 ${flush ? "" : "overflow-y-auto p-4"}`}>
        {children}
        {active && <div aria-hidden className="absolute inset-0 z-10 cursor-move" />}
      </div>
      {resizable && (
        <div
          role="separator"
          aria-label={`Resize ${title}`}
          onPointerDown={(event) => begin("resize", event)}
          onPointerMove={update}
          onPointerUp={end}
          onPointerCancel={end}
          className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-nwse-resize touch-none"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-slate-500" aria-hidden>
            <path d="M15 6 L6 15 M15 11 L11 15" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
