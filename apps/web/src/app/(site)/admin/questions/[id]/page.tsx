"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QuestionEditor } from "@/components/question-editor";
import { RequireUser } from "@/components/require-user";
import { PageHeader } from "@/components/ui";

function EditorPage({ id, canWrite }: { id: string; canWrite: boolean }) {
  const router = useRouter();
  return (
    <QuestionEditor
      id={id}
      canWrite={canWrite}
      onDeleted={() => router.replace("/admin/questions")}
      header={(question) => (
        <>
          <Link href="/admin/questions" className="mb-3 inline-block text-sm font-bold text-brand-500 hover:underline">
            ← Question bank
          </Link>
          <PageHeader title={`Question #${question.sourceQuestionId}`} subtitle={question.paperTitle ?? undefined} />
        </>
      )}
    />
  );
}

export default function AdminQuestionPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser permission="questions:read">{(user) => <EditorPage id={id} canWrite={user.permissions.includes("questions:write")} />}</RequireUser>;
}
