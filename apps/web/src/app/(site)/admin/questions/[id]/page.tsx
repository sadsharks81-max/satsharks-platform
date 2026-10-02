"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DIFFICULTIES, SECTION_LABELS, type AdminQuestion, type CatalogTopic, type Difficulty, type Section } from "@satsharks/types";
import { Choices, Passage, Prompt } from "@/components/question";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500";
const areaClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-brand-500";

interface Draft {
  difficulty: Difficulty | "";
  topic: string;
  skill: string;
  prompt: string;
  passage: string;
  explanation: string;
  choiceKey: string;
  acceptedValues: string;
}

const toDraft = (question: AdminQuestion): Draft => ({
  difficulty: question.difficulty ?? "",
  topic: question.topic ?? "",
  skill: question.skill ?? "",
  prompt: question.prompt,
  passage: question.passage ?? "",
  explanation: question.explanation ?? "",
  choiceKey: question.correctAnswer?.choiceKey ?? "",
  acceptedValues: question.correctAnswer?.acceptedValues.join(", ") ?? "",
});

function Editor({ id, canWrite }: { id: string; canWrite: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "question", id], queryFn: () => api<{ question: AdminQuestion }>(`/api/admin/questions/${id}`) });
  const facets = useQuery({ queryKey: ["admin", "facets"], queryFn: () => api<{ topics: Record<Section, CatalogTopic[]> }>("/api/admin/questions/facets") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const question = data?.question;
  useEffect(() => {
    if (question) setDraft(toDraft(question));
  }, [question]);

  if (isLoading) return <Spinner label="Loading question" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (!question || !draft) return null;

  const isMcq = question.questionType === "mcq";
  const topics = facets.data?.topics[question.section] ?? [];
  const skills = topics.find((entry) => entry.topic === draft.topic)?.skills ?? [...new Set(topics.flatMap((entry) => entry.skills))];
  // The preview shows the text as it is being edited.
  const preview = { ...question, prompt: draft.prompt, passage: draft.passage || null };
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const accepted = draft.acceptedValues.split(",").map((value) => value.trim()).filter(Boolean);
      const { question: saved } = await api<{ question: AdminQuestion }>(`/api/admin/questions/${id}`, {
        method: "PATCH",
        body: {
          difficulty: draft.difficulty || null,
          topic: draft.topic.trim() || null,
          skill: draft.skill.trim() || null,
          prompt: draft.prompt,
          passage: draft.passage.trim() ? draft.passage : null,
          explanation: draft.explanation.trim() ? draft.explanation : null,
          correctAnswer: isMcq ? (draft.choiceKey ? { choiceKey: draft.choiceKey, acceptedValues: [] } : null) : accepted.length > 0 ? { choiceKey: null, acceptedValues: accepted } : null,
        },
      });
      queryClient.setQueryData(["admin", "question", id], { question: saved });
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      setMessage({ tone: "info", text: "Saved." });
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
      router.replace("/admin/questions");
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not delete" });
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Link href="/admin/questions" className="mb-3 inline-block text-sm font-bold text-brand-500 hover:underline">
        ← Question bank
      </Link>
      <PageHeader title={`Question #${question.sourceQuestionId}`} subtitle={question.paperTitle ?? undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{SECTION_LABELS[question.section]}</Badge>
        <Badge>{isMcq ? "Multiple choice" : "Student-produced response"}</Badge>
        <Badge tone={question.status === "published" ? "green" : "amber"}>{question.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">Preview</h2>
          {question.section !== "math" && <Passage question={preview} />}
          <div className={question.section !== "math" ? "mt-4 border-t border-slate-300 pt-4" : ""}>
            <Prompt question={preview} />
          </div>
          {isMcq ? (
            <Choices question={preview} selected={null} correctAnswer={draft.choiceKey ? { choiceKey: draft.choiceKey, acceptedValues: [] } : null} disabled />
          ) : (
            <p className="mt-4 text-sm">
              <b>Accepted answers:</b> {draft.acceptedValues || "none set"}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Details</h2>
          <fieldset disabled={!canWrite || saving} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold">
                Difficulty
                <select className={`${inputClass} mt-1 capitalize`} value={draft.difficulty} onChange={(event) => set({ difficulty: event.target.value as Difficulty | "" })}>
                  <option value="">Not set</option>
                  {DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Topic
                <select className={`${inputClass} mt-1`} value={draft.topic} onChange={(event) => set({ topic: event.target.value, skill: "" })}>
                  <option value="">Not set</option>
                  {topics.map((entry) => (
                    <option key={entry.topic} value={entry.topic}>
                      {entry.topic}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Skill
                <select className={`${inputClass} mt-1`} value={draft.skill} onChange={(event) => set({ skill: event.target.value })}>
                  <option value="">Not set</option>
                  {skills.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isMcq ? (
              <label className="block text-xs font-bold">
                Correct answer
                <select className={`${inputClass} mt-1 sm:w-40`} value={draft.choiceKey} onChange={(event) => set({ choiceKey: event.target.value })}>
                  <option value="">Not set</option>
                  {question.choices.map((choice) => (
                    <option key={choice.key} value={choice.key}>
                      {choice.key}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block text-xs font-bold">
                Accepted answers (comma-separated, e.g. 7/2, 3.5)
                <input className={`${inputClass} mt-1`} value={draft.acceptedValues} onChange={(event) => set({ acceptedValues: event.target.value })} />
              </label>
            )}

            {question.section !== "math" && (
              <label className="block text-xs font-bold">
                Passage
                <textarea className={`${areaClass} mt-1`} rows={7} value={draft.passage} onChange={(event) => set({ passage: event.target.value })} />
              </label>
            )}
            <label className="block text-xs font-bold">
              Question text{question.section === "math" ? " (LaTeX between $ signs)" : ""}
              <textarea className={`${areaClass} mt-1`} rows={5} value={draft.prompt} onChange={(event) => set({ prompt: event.target.value })} />
            </label>
            <label className="block text-xs font-bold">
              Explanation
              <textarea className={`${areaClass} mt-1`} rows={3} value={draft.explanation} onChange={(event) => set({ explanation: event.target.value })} placeholder="Shown to students after they answer" />
            </label>

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

export default function AdminQuestionPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser permission="questions:read">{(user) => <Editor id={id} canWrite={user.permissions.includes("questions:write")} />}</RequireUser>;
}
