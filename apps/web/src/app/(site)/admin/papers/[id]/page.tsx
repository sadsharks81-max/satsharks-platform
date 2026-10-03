"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MODULE_TYPE_LABELS,
  SECTION_LABELS,
  type PaperSummary,
  type QuestionListItem,
} from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

function PaperDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "papers", id],
    queryFn: () => api<{ paper: PaperSummary; questions: QuestionListItem[] }>(`/api/admin/papers/${id}`),
  });

  if (isLoading) return <Spinner label="Loading paper" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (!data) return null;
  const { paper, questions } = data;

  return (
    <>
      <PageHeader title={paper.title} subtitle={paper.description ?? undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <Badge>{paper.status}</Badge>
            </dd>
            <dt className="text-slate-500">Questions</dt>
            <dd>{paper.questionCount}</dd>
            <dt className="text-slate-500">Sections</dt>
            <dd>{paper.sections.map((section) => SECTION_LABELS[section]).join(", ")}</dd>
            <dt className="text-slate-500">Source</dt>
            <dd className="break-all">
              {paper.source} · {paper.sourcePaperId}
            </dd>
            <dt className="text-slate-500">Adaptive route seen</dt>
            <dd>{paper.adaptive.observedRoute ? MODULE_TYPE_LABELS[paper.adaptive.observedRoute] : "Not observed"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="font-semibold">Modules</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {paper.modules.map((module) => (
              <li key={module.key} className="flex justify-between gap-4">
                <span>
                  {SECTION_LABELS[module.section]} — {MODULE_TYPE_LABELS[module.moduleType]}
                </span>
                <span className="text-slate-600">{module.questionCount} questions</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold">Questions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Module</th>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Answer</th>
                <th className="py-2">Prompt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="py-2 pr-4 whitespace-nowrap">{MODULE_TYPE_LABELS[question.moduleType]}</td>
                  <td className="py-2 pr-4">{question.questionNumber}</td>
                  <td className="py-2 pr-4 uppercase">{question.questionType}</td>
                  <td className="py-2 pr-4">{question.hasCorrectAnswer ? "Yes" : "Missing"}</td>
                  <td className="max-w-md truncate py-2" title={question.prompt}>
                    {question.prompt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function AdminPaperPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireUser permission="papers:read">
      {() => (
        <>
          <Link href="/admin/papers" className="mb-4 inline-block text-sm font-bold text-brand-500 hover:underline">
            ← Papers
          </Link>
          <PaperDetail id={id} />
        </>
      )}
    </RequireUser>
  );
}
