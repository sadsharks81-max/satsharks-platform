"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { AttemptSummary, FullTestSummary } from "@satsharks/types";
import { AttemptCard, FullTestCard } from "@/components/attempt-card";
import { RequireUser } from "@/components/require-user";
import { Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

function Attempts() {
  const { data, isLoading, error } = useQuery({ queryKey: ["practice", "attempts"], queryFn: () => api<{ attempts: AttemptSummary[] }>("/api/practice/attempts") });
  const fullTests = useQuery({ queryKey: ["practice", "full-tests"], queryFn: () => api<{ fullTests: FullTestSummary[] }>("/api/practice/full-tests") });
  if (isLoading) return <Spinner label="Loading your drills" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  const attempts = data?.attempts ?? [];
  const finishedFullTests = fullTests.data?.fullTests.filter((fullTest) => fullTest.stage === "done") ?? [];
  const groups = [
    { title: "In progress", items: attempts.filter((attempt) => attempt.status === "active") },
    { title: "Completed", items: attempts.filter((attempt) => attempt.status === "done") },
  ];

  return (
    <>
      <PageHeader title="Review" subtitle="Every full test, mock and drill you have started." />
      {finishedFullTests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold">Full tests ({finishedFullTests.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finishedFullTests.map((fullTest) => (
              <FullTestCard key={fullTest.id} fullTest={fullTest} />
            ))}
          </div>
        </section>
      )}
      {attempts.length === 0 && (
        <Notice tone="info">
          You have not started a drill yet.{" "}
          <Link href="/dashboard" className="font-bold text-brand-500 hover:underline">
            Create one from Home.
          </Link>
        </Notice>
      )}
      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.title} className="mb-8">
              <h2 className="mb-3 text-xl font-bold">
                {group.title} ({group.items.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))}
              </div>
            </section>
          ),
      )}
    </>
  );
}

export default function PracticePage() {
  return <RequireUser studentOnly>{() => <Attempts />}</RequireUser>;
}
