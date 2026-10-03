"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DIFFICULTIES, PAPER_STATUSES, SECTION_LABELS, SECTIONS, type AdminQuestion, type CatalogTopic, type Section } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { toPlainText } from "@/lib/rich-text";

const selectClass = "h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-brand-500";
const STATUS_TONE = { draft: "amber", published: "green", hidden: "neutral" } as const;

interface Filters {
  section: Section | "";
  topic: string;
  skill: string;
  difficulty: string;
  status: string;
  search: string;
}

function QuestionBank() {
  const [filters, setFilters] = useState<Filters>({ section: "", topic: "", skill: "", difficulty: "", status: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  // Search runs shortly after typing stops, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.search === searchInput.trim() ? current : { ...current, search: searchInput.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const facets = useQuery({ queryKey: ["admin", "facets"], queryFn: () => api<{ topics: Record<Section, CatalogTopic[]> }>("/api/admin/questions/facets") });
  const params = new URLSearchParams({ ...filters, page: String(page), pageSize: "25" });
  const list = useQuery({
    queryKey: ["admin", "questions", params.toString()],
    queryFn: () => api<{ questions: AdminQuestion[]; total: number; page: number; pageSize: number }>(`/api/admin/questions?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  const update = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const topics = filters.section ? (facets.data?.topics[filters.section] ?? []) : [];
  // A skill can be listed under two topics (mis-tagged source questions), so remove repeats.
  const skills = [...new Set(topics.filter((entry) => !filters.topic || entry.topic === filters.topic).flatMap((entry) => entry.skills))];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <>
      <PageHeader title="Question bank" subtitle={list.data ? `${total.toLocaleString()} question${total === 1 ? "" : "s"} match` : undefined} />

      <Card className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold">
          Section
          <select className={selectClass} value={filters.section} onChange={(event) => update({ section: event.target.value as Section | "", topic: "", skill: "" })}>
            <option value="">All sections</option>
            {SECTIONS.map((section) => (
              <option key={section} value={section}>
                {SECTION_LABELS[section]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Topic
          <select className={selectClass} value={filters.topic} disabled={!filters.section} onChange={(event) => update({ topic: event.target.value, skill: "" })}>
            <option value="">{filters.section ? "All topics" : "Choose a section first"}</option>
            {topics.map((entry) => (
              <option key={entry.topic} value={entry.topic}>
                {entry.topic}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Skill
          <select className={`${selectClass} max-w-[16rem]`} value={filters.skill} disabled={!filters.section} onChange={(event) => update({ skill: event.target.value })}>
            <option value="">All skills</option>
            {skills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Difficulty
          <select className={selectClass} value={filters.difficulty} onChange={(event) => update({ difficulty: event.target.value })}>
            <option value="">Any</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty} className="capitalize">
                {difficulty}
              </option>
            ))}
            <option value="none">Not set</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Status
          <select className={selectClass} value={filters.status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">Any</option>
            {PAPER_STATUSES.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-bold">
          Search
          <input className={`${selectClass} px-3`} value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} placeholder="Words in the question or passage, or a source ID" />
        </label>
      </Card>

      {list.error && (
        <div className="mt-4">
          <Notice tone="error">{list.error.message}</Notice>
        </div>
      )}

      <Card className={`mt-4 p-0 ${list.isFetching ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-900 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-3 py-3">Section</th>
                <th className="px-3 py-3">Topic / skill</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Difficulty</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.data?.questions.map((question) => (
                <tr key={question.id} className="hover:bg-slate-50">
                  <td className="max-w-md px-4 py-2.5">
                    <Link href={`/admin/questions/${question.id}`} className="line-clamp-2 font-medium text-brand-600 hover:underline">
                      {toPlainText(question.prompt)}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      #{question.sourceQuestionId} · {question.paperTitle?.split(" — ")[0] ?? "No paper"}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{SECTION_LABELS[question.section]}</td>
                  <td className="px-3 py-2.5">
                    <div>{question.topic ?? "—"}</div>
                    <div className="text-xs text-slate-500">{question.skill ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 uppercase">{question.questionType}</td>
                  <td className="px-3 py-2.5 capitalize">{question.difficulty ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={STATUS_TONE[question.status]}>{question.status}</Badge>
                  </td>
                </tr>
              ))}
              {list.data && list.data.questions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No questions match these filters.
                  </td>
                </tr>
              )}
              {list.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading questions…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-900 px-4 py-3 text-sm">
          <span>
            Page <b>{page}</b> of <b>{pages.toLocaleString()}</b>
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </span>
        </div>
      </Card>
    </>
  );
}

export default function AdminQuestionsPage() {
  return <RequireUser permission="questions:read">{() => <QuestionBank />}</RequireUser>;
}
