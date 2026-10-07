"use client";

import { useEffect, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from "react";
import { Button, Modal } from "./ui";

// Text fields for question content. Math text uses LaTeX between dollar signs ($x^2$); these fields
// add a row of common symbols and a visual equation editor (MathLive) that writes the LaTeX for the
// admin, so nobody has to remember the syntax.

// What each button inserts. "$" marks where the selection (or the cursor) goes.
const SYMBOLS: { label: string; latex: string }[] = [
  { label: "\\frac{a}{b}", latex: "\\frac{$}{}" },
  { label: "x^2", latex: "^{$}" },
  { label: "x_n", latex: "_{$}" },
  { label: "\\sqrt{x}", latex: "\\sqrt{$}" },
  { label: "\\sqrt[n]{x}", latex: "\\sqrt[$]{}" },
  { label: "\\pi", latex: "\\pi$" },
  { label: "\\theta", latex: "\\theta$" },
  { label: "\\pm", latex: "\\pm$" },
  { label: "\\neq", latex: "\\neq$" },
  { label: "\\ge", latex: "\\ge$" },
  { label: "\\le", latex: "\\le$" },
  { label: "\\times", latex: "\\times$" },
  { label: "\\$", latex: "\\$$" },
];

// Whether the cursor sits inside a $…$ formula.
function insideFormula(text: string, position: number): boolean {
  let open = false;
  for (let index = 0; index < position; index += 1) {
    if (text[index] === "\\") index += 1;
    else if (text[index] === "$") open = !open;
  }
  return open;
}

type Field = HTMLTextAreaElement | HTMLInputElement;

// Puts `latex` at the cursor, wrapped in $…$ unless the cursor is already inside a formula. A symbol
// button keeps the selected text at its "$" placeholder (x selected + x^2 gives x^{…}); the visual
// editor replaces the selection with its formula.
function insertAtCursor(field: Field, value: string, latex: string, onChange: (value: string) => void, replaceSelection = false): number {
  const start = field.selectionStart ?? value.length;
  const end = field.selectionEnd ?? value.length;
  const selected = replaceSelection ? "" : value.slice(start, end);
  const marker = latex.search(/(?<!\\)\$/);
  const before = marker < 0 ? latex : latex.slice(0, marker);
  const after = marker < 0 ? "" : latex.slice(marker + 1);
  const wrap = !insideFormula(value, start);
  const inserted = `${wrap ? "$" : ""}${before}${selected}${after}${wrap ? "$" : ""}`;
  const caret = replaceSelection ? start + inserted.length : start + (wrap ? 1 : 0) + before.length + selected.length;
  onChange(value.slice(0, start) + inserted + value.slice(end));
  return caret;
}

// ---------- visual editor ----------

type MathfieldElement = HTMLElement & { value: string; getValue(format?: string): string; focus(): void };

let mathliveReady: Promise<void> | null = null;

// MathLive is only downloaded the first time the visual editor opens.
function loadMathlive(): Promise<void> {
  mathliveReady ??= import("mathlive").then(({ MathfieldElement }) => {
    MathfieldElement.fontsDirectory = "/mathlive/fonts";
    MathfieldElement.soundsDirectory = null;
  });
  return mathliveReady;
}

export function VisualMathEditor({ initial, onInsert, onClose }: { initial: string; onInsert: (latex: string) => void; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    loadMathlive()
      .then(() => {
        if (cancelled || !host.current) return;
        const element = document.createElement("math-field") as MathfieldElement;
        element.value = initial;
        element.setAttribute("math-virtual-keyboard-policy", "manual");
        element.className = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl";
        host.current.replaceChildren(element);
        field.current = element;
        setStatus("ready");
        requestAnimationFrame(() => element.focus());
      })
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, [initial]);

  return (
    <Modal title="Visual equation editor" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">Type or build the formula. Use the keyboard icon for fractions, roots and symbols. It is inserted as LaTeX.</p>
      {status === "loading" && <p className="text-sm text-slate-500">Loading the editor…</p>}
      {status === "failed" && <p className="text-sm text-red-700">The editor could not be loaded. Use the symbol buttons instead.</p>}
      <div ref={host} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={status !== "ready"}
          onClick={() => {
            const latex = field.current?.getValue("latex-expanded").trim() ?? "";
            if (latex) onInsert(latex);
            onClose();
          }}
        >
          Insert
        </Button>
      </div>
    </Modal>
  );
}

// ---------- the field ----------

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

export function MathTextField({
  value,
  onChange,
  math,
  multiline = true,
  invalid = false,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  // Math text: show the symbol bar and the visual editor.
  math: boolean;
  multiline?: boolean;
  invalid?: boolean;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<Field | null>(null);
  const [visual, setVisual] = useState(false);
  // Where the cursor goes after an insertion: set in the same render as the new text, so a key
  // typed straight after a symbol button lands inside it.
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current === null || !ref.current) return;
    ref.current.focus();
    ref.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);
  const insert = (latex: string, replaceSelection = false) => {
    if (ref.current) caret.current = insertAtCursor(ref.current, value, latex, onChange, replaceSelection);
  };
  const className = `${fieldClass} ${multiline ? "font-mono" : ""} ${invalid ? "border-red-500" : ""}`;

  const toolbar = math ? (
    <div className={`flex-wrap items-center gap-1 ${multiline ? "mb-1.5 flex" : "mt-1.5 hidden group-focus-within:flex"}`} role="toolbar" aria-label="Math symbols">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisual(true)}
        className="flex h-7 cursor-pointer items-center gap-1 rounded-md bg-brand-500 px-2.5 text-[11px] font-bold text-white hover:bg-brand-600"
      >
        <span aria-hidden className="text-sm leading-none">∑</span> Visual editor
      </button>
      {SYMBOLS.map((symbol) => (
        <button
          key={symbol.label}
          type="button"
          title={`Insert ${symbol.label}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insert(symbol.latex)}
          className="h-7 cursor-pointer rounded-md border border-slate-300 bg-white px-2 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100"
        >
          {symbol.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    // A one-line field (an answer choice) shows its symbol bar only while it is being edited, and
    // below the field so the field does not move as it is clicked.
    <div className="group">
      {multiline && toolbar}
      {multiline ? (
        <textarea ref={(node) => void (ref.current = node)} value={value} onChange={(event) => onChange(event.target.value)} className={className} {...props} />
      ) : (
        <input
          ref={(node) => void (ref.current = node)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} h-10`}
          aria-label={props["aria-label"]}
          placeholder={props.placeholder}
          disabled={props.disabled}
        />
      )}
      {!multiline && toolbar}
      {visual && (
        <VisualMathEditor
          initial={selectedFormula(ref.current, value)}
          onClose={() => setVisual(false)}
          onInsert={(latex) => insert(latex, true)}
        />
      )}
    </div>
  );
}

// The selected text, when it is a formula, opens in the visual editor for editing.
function selectedFormula(field: Field | null, value: string): string {
  if (!field || field.selectionStart === null || field.selectionEnd === null) return "";
  const selected = value.slice(field.selectionStart, field.selectionEnd).trim();
  return /^\$[^$]+\$$/.test(selected) ? selected.slice(1, -1) : "";
}
