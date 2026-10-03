"use client";

import { useId, useState } from "react";
import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportReason, type ReportStatus } from "@satsharks/types";
import { api } from "@/lib/api";
import { Button, Modal, Notice } from "./ui";

export const STATUS_BADGE: Record<ReportStatus, { tone: "amber" | "green"; label: string }> = {
  pending: { tone: "amber", label: "Pending" },
  resolved: { tone: "green", label: "Resolved" },
};

// "Report a problem" for one question of an attempt. The server works out which question is meant
// from the attempt and position, so no question ID is ever sent to the browser.
export function ReportProblemDialog({ attemptId, position, questionLabel, onClose }: { attemptId: string; position: number; questionLabel: string; onClose: () => void }) {
  const groupId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    try {
      await api(`/api/practice/attempts/${attemptId}/questions/${position}/report`, { method: "POST", body: { reason, details: details.trim() } });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be sent");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title={`Report a problem: ${questionLabel}`} onClose={() => !sending && onClose()}>
      {sent ? (
        <div className="space-y-4">
          <Notice tone="info">Thank you. Your report has been sent to our team, who will check this question.</Notice>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-bold">What is wrong with this question?</legend>
            <div className="mt-2 space-y-2">
              {REPORT_REASONS.map((entry) => (
                <label
                  key={entry}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${reason === entry ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:bg-slate-50"}`}
                >
                  <input type="radio" name={groupId} value={entry} checked={reason === entry} onChange={() => setReason(entry)} className="h-4 w-4 accent-brand-500" />
                  {REPORT_REASON_LABELS[entry]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-bold">
            Details <span className="font-normal text-slate-500">(optional{reason === "other" ? ", but please describe it" : ""})</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="e.g. Choice C should be correct because…"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-500">{details.length}/1000</span>
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={sending} onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!reason || sending || (reason === "other" && details.trim() === "")} onClick={send}>
              {sending ? "Sending…" : "Send report"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
