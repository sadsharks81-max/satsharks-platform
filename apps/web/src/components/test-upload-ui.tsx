"use client";

import { useState } from "react";
import { MOCK_FORMAT, MOCK_MODULE_LABELS, MOCK_MODULES, type Section, type TestUploadSection, type TestUploadSummary } from "@satsharks/types";
import { Badge } from "./ui";

// Pieces shared by the uploaded-test list and the test page.

export const SECTION_FILE_LABELS: Record<Section, string> = { reading_writing: "English (Reading & Writing)", math: "Math" };
export const sectionOf = (upload: TestUploadSummary, section: Section) => (section === "math" ? upload.math : upload.readingWriting);

export function TestStatusBadge({ upload }: { upload: TestUploadSummary }) {
  if (upload.status === "draft") return <Badge tone="amber">Draft</Badge>;
  return upload.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>;
}

export function SectionBadge({ section }: { section: TestUploadSection | null }) {
  if (!section) return <Badge tone="neutral">Not uploaded</Badge>;
  if (section.status === "failed") return <Badge tone="red">Failed</Badge>;
  if (section.status === "reviewed") return <Badge tone="green">Reviewed</Badge>;
  return <Badge tone="brand">Needs review</Badge>;
}

// Questions per module; a count that is not the official module size is marked.
export function ModuleCounts({ section, kind }: { section: TestUploadSection; kind: Section }) {
  const expected = MOCK_FORMAT[kind].questionsPerModule;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
      {MOCK_MODULES.map((module) => {
        const count = section.moduleCounts[module];
        return (
          <li key={module} className={count !== expected ? "font-bold text-amber-700" : ""} title={count !== expected ? `An official module has ${expected}` : undefined}>
            {MOCK_MODULE_LABELS[module]}: {count}
          </li>
        );
      })}
    </ul>
  );
}

// Why a section failed, folded by default because the list can be long.
export function FailureDetails({ message, open: startOpen = false }: { message: string; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const lines = message.split("\n");
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <button type="button" className="cursor-pointer font-bold underline-offset-2 hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Why it failed"} ({Math.max(1, lines.length - 1)} problem{lines.length - 1 === 1 ? "" : "s"})
      </button>
      {open && <p className="mt-2 whitespace-pre-line leading-6">{message}</p>}
    </div>
  );
}

export function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      {warnings.map((warning) => (
        <li key={warning}>⚠ {warning}</li>
      ))}
    </ul>
  );
}
