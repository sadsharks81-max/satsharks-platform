"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SECTION_LABELS, splitAcceptedValues, type AdminQuestion, type CatalogTopic, type QuestionAssetView, type Section } from "@satsharks/types";
import { api, apiUpload } from "@/lib/api";
import { emptyChoices, QuestionForm, QuestionPreview, type QuestionDraft } from "./question-form";
import { Badge, Button, Card, Notice, Spinner } from "./ui";

const toDraft = (question: AdminQuestion): QuestionDraft => ({
  questionType: question.questionType,
  difficulty: question.difficulty ?? "",
  topic: question.topic ?? "",
  skill: question.skill ?? "",
  prompt: question.prompt,
  passage: question.passage ?? "",
  // A figure drawn inside a choice (viz) is kept for the preview; the server keeps it on save.
  choices: question.choices.length > 0 ? question.choices.map((choice) => ({ key: choice.key, text: choice.text, viz: choice.viz })) : emptyChoices(),
  choiceKey: question.correctAnswer?.choiceKey ?? "",
  acceptedValues: question.correctAnswer?.acceptedValues.join(" or ") ?? "",
  explanation: question.explanation ?? "",
});

// Question images: drag and drop or browse, shown with a size control and a remove button.
function ImageField({ assets, onChange, disabled }: { assets: QuestionAssetView[]; onChange: (assets: QuestionAssetView[]) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("Use a PNG, JPEG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setError("The image must be 2 MB or smaller.");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const { url } = await apiUpload<{ url: string }>("/api/admin/assets", form);
      onChange([...assets.filter((asset) => asset.url !== url), { kind: "image", url, maxWidth: null }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload the image");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-600">Question image (optional)</span>
      {assets.length > 0 && (
        <ul className="mt-2 space-y-2">
          {assets.map((asset, index) => (
            <li key={asset.url} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own API */}
              <img src={asset.url} alt="" className="h-16 w-24 rounded object-contain" />
              <label className="text-xs font-bold">
                Width (px)
                <input
                  type="number"
                  min={40}
                  max={1200}
                  placeholder="400"
                  disabled={disabled}
                  value={asset.maxWidth ?? ""}
                  onChange={(event) => onChange(assets.map((entry, position) => (position === index ? { ...entry, maxWidth: event.target.value ? Number(event.target.value) : null } : entry)))}
                  className="ml-2 h-8 w-20 rounded-md border border-slate-300 px-2 text-sm font-normal"
                />
              </label>
              <Button size="sm" variant="outline" className="ml-auto" disabled={disabled} onClick={() => onChange(assets.filter((_, position) => position !== index))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) void upload(event.dataTransfer.files[0]);
        }}
        className={`mt-2 flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        {uploading ? "Uploading…" : "Drag and drop an image here or click to browse"}
        <span className="text-xs text-slate-500">PNG, JPEG or WebP, up to 2 MB. Shown above the question text, or where the text says {"{viz}"}.</span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

// The full question editor: preview beside the fields, save and delete. Used by the question bank
// and by the problem-report screen, so a reported question is fixed without leaving the report.
export function QuestionEditor({
  id,
  canWrite,
  onSaved,
  onDeleted,
  header,
}: {
  id: string;
  canWrite: boolean;
  onSaved?: (question: AdminQuestion) => void;
  onDeleted?: () => void;
  // Shown above the editor once the question has loaded (page title, back link).
  header?: (question: AdminQuestion) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "question", id], queryFn: () => api<{ question: AdminQuestion }>(`/api/admin/questions/${id}`) });
  const facets = useQuery({ queryKey: ["admin", "facets"], queryFn: () => api<{ topics: Record<Section, CatalogTopic[]> }>("/api/admin/questions/facets") });
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [assets, setAssets] = useState<QuestionAssetView[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const question = data?.question;
  useEffect(() => {
    if (question) {
      setDraft(toDraft(question));
      setAssets(question.assets);
    }
  }, [question]);

  if (isLoading) return <Spinner label="Loading question" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (!question || !draft) return null;

  const isMcq = draft.questionType === "mcq";
  const topics = facets.data?.topics[question.section] ?? [];
  const typeChanged = draft.questionType !== question.questionType;

  async function save() {
    if (!draft || !question) return;
    setSaving(true);
    setMessage(null);
    try {
      const accepted = splitAcceptedValues(draft.acceptedValues);
      const { question: saved } = await api<{ question: AdminQuestion }>(`/api/admin/questions/${id}`, {
        method: "PATCH",
        body: {
          difficulty: draft.difficulty || null,
          topic: draft.topic.trim() || null,
          skill: draft.skill.trim() || null,
          prompt: draft.prompt,
          passage: draft.passage.trim() ? draft.passage : null,
          explanation: draft.explanation.trim() ? draft.explanation : null,
          ...(question.questionType === "other" ? {} : { questionType: draft.questionType }),
          ...(isMcq ? { choices: draft.choices.map(({ key, text }) => ({ key, text })) } : {}),
          assets: assets.map((asset) => ({ url: asset.url, maxWidth: asset.maxWidth })),
          correctAnswer: isMcq ? (draft.choiceKey ? { choiceKey: draft.choiceKey, acceptedValues: [] } : null) : accepted.length > 0 ? { choiceKey: null, acceptedValues: accepted } : null,
        },
      });
      queryClient.setQueryData(["admin", "question", id], { question: saved });
      setDraft(toDraft(saved));
      setAssets(saved.assets);
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      setMessage({ tone: "info", text: "Saved to the question bank." });
      onSaved?.(saved);
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api(`/api/admin/questions/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onDeleted?.();
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not delete" });
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      {header?.(question)}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge>{SECTION_LABELS[question.section]}</Badge>
        <Badge>{isMcq ? "Multiple choice" : "Student-produced response"}</Badge>
        <Badge tone={question.status === "published" ? "green" : "amber"}>{question.status}</Badge>
        {question.testUploadId && (
          <Link href={`/admin/tests/${question.testUploadId}`} className="text-sm font-bold text-brand-500 hover:underline">
            Part of an uploaded practice test →
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-3 font-bold">Live preview</h2>
          <QuestionPreview section={question.section} draft={draft} assets={assets} viz={question.viz} />
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Edit question</h2>
          <fieldset disabled={!canWrite || saving} className="space-y-5">
            <ImageField assets={assets} onChange={setAssets} disabled={!canWrite || saving} />
            <QuestionForm section={question.section} draft={draft} onChange={setDraft} topics={topics} allowTypeChange={question.questionType !== "other"} />
            {typeChanged && <Notice tone="info">The question type changes when you save. Students who already answered keep their old result.</Notice>}

            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            {canWrite && (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={save} disabled={saving || draft.prompt.trim() === ""}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {confirmDelete ? (
                  <>
                    <span className="text-sm font-medium">Delete this question permanently?</span>
                    <Button variant="danger" onClick={remove}>
                      Yes, delete
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="ml-auto" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                )}
              </div>
            )}
          </fieldset>
          {!canWrite && <p className="mt-3 text-sm text-slate-600">Your account can view questions but not change them.</p>}
        </Card>
      </div>
    </>
  );
}
