"use client";

import { Notice } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4">
      <Notice tone="error">This page failed to load. Your data has not been affected.</Notice>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
      >
        Try again
      </button>
    </div>
  );
}
