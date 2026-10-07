import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/common/Icon";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { api } from "../../services/api";
import { renderFormattedText } from "../../utils/format";
import type {
  FullTestModuleSlot,
  FullTestSection,
  FullTestUpload,
  FullTestUploadQuestion,
  QuestionCategory,
} from "../../types";

export const Route = createFileRoute("/admin/review-full-test/$uploadId/$section")({
  component: ReviewFullTest,
});

const SECTION_LABELS: Record<FullTestSection, string> = {
  READING_WRITING: "English (Reading & Writing)",
  MATH: "Math",
};
const MODULE_LABELS: Record<FullTestModuleSlot, string> = {
  MODULE_1: "Module 1",
  MODULE_2_EASY: "Module 2 Easy",
  MODULE_2_HARD: "Module 2 Hard",
};
const MODULE_SLOTS = Object.keys(MODULE_LABELS) as FullTestModuleSlot[];
const OPTION_LABELS = ["A", "B", "C", "D"];
const STANDARD_COUNT: Record<FullTestSection, number> = { READING_WRITING: 27, MATH: 22 };

const isSection = (value: string): value is FullTestSection => value === "READING_WRITING" || value === "MATH";

/** Mirrors the server rules so problems are visible before saving. */
const questionProblems = (
  question: FullTestUploadQuestion,
  section: FullTestSection,
  categories: QuestionCategory[],
) => {
  const problems: string[] = [];
  if (!question.text.trim()) problems.push("question text");
  if (!question.explanation.trim()) problems.push("explanation");
  if (!["EASY", "MEDIUM", "HARD"].includes(question.difficulty)) problems.push("difficulty");
  const category = categories.find((item) => item.name === question.category);
  if (!category || category.section !== section) problems.push("category");
  if (question.questionType === "GRID_IN") {
    if (!question.correctAnswer.trim()) problems.push("answer");
  } else {
    if (question.options.length !== 4 || question.options.some((option) => !option.text.trim())) {
      problems.push("all four choices");
    }
    if (!OPTION_LABELS.includes(question.correctAnswer)) problems.push("answer");
  }
  return problems;
};

function ReviewFullTest() {
  const { uploadId, section: sectionParam } = Route.useParams();
  const section = isSection(sectionParam) ? sectionParam : null;
  const [upload, setUpload] = useState<FullTestUpload | null>(null);
  const [questions, setQuestions] = useState<FullTestUploadQuestion[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [activeModule, setActiveModule] = useState<FullTestModuleSlot>("MODULE_1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!section) {
      setLoading(false);
      return;
    }
    Promise.all([api.get(`/api/uploads/full-tests/${uploadId}`), api.get("/api/categories")]).then(
      ([res, categoryRes]) => {
        if (res.success && res.upload) {
          setUpload(res.upload);
          const data = section === "MATH" ? res.upload.math : res.upload.readingWriting;
          setQuestions(data?.questions || []);
        }
        setCategories(categoryRes.success ? categoryRes.categories || [] : []);
        setLoading(false);
      },
    );
  }, [uploadId, section]);

  const sectionCategories = useMemo(
    () => categories.filter((category) => category.section === section),
    [categories, section],
  );

  const problemsByIndex = useMemo(
    () => (section ? questions.map((question) => questionProblems(question, section, categories)) : []),
    [questions, section, categories],
  );
  const incompleteCount = problemsByIndex.filter((problems) => problems.length > 0).length;

  const updateQuestion = (index: number, patch: Partial<FullTestUploadQuestion>) => {
    setQuestions((prev) => prev.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  };

  const changeType = (index: number, questionType: FullTestUploadQuestion["questionType"]) => {
    updateQuestion(
      index,
      questionType === "GRID_IN"
        ? { questionType, options: [], correctAnswer: "" }
        : {
            questionType,
            options: OPTION_LABELS.map((label) => ({ label, text: "" })),
            correctAnswer: "A",
          },
    );
  };

  const handleSave = async () => {
    if (!section) return;
    setSaving(true);
    setMessage(null);
    const res = await api.put(`/api/uploads/full-tests/${uploadId}/sections/${section}`, { questions });
    setSaving(false);
    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Could not save the review." });
      return;
    }
    setUpload((prev) => (prev ? { ...prev, ...res.upload } : res.upload));
    setMessage({
      type: "success",
      text: `${SECTION_LABELS[section]} saved and marked as reviewed. Publish the test from the uploads page once both sections are reviewed.`,
    });
  };

  if (loading) {
    return (
      <AdminLayout activeItem="/admin/uploads">
        <div className="py-12 text-center text-on-surface-variant">Loading...</div>
      </AdminLayout>
    );
  }

  const sectionData = upload && section ? (section === "MATH" ? upload.math : upload.readingWriting) : null;
  if (!upload || !section || !sectionData) {
    return (
      <AdminLayout activeItem="/admin/uploads">
        <div className="py-12 text-center text-error">Upload not found</div>
      </AdminLayout>
    );
  }

  const isPublished = upload.status === "PUBLISHED";
  const moduleQuestions = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.moduleSlot === activeModule);

  return (
    <AdminLayout activeItem="/admin/uploads">
      <Link
        to="/admin/uploads"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Back to uploads
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Review {SECTION_LABELS[section]}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {upload.title} · Year {upload.year} · Test #{upload.testNumber} · {sectionData.fileName}
          </p>
        </div>
        <Badge variant={sectionData.status === "REVIEWED" ? "success" : "info"}>{sectionData.status}</Badge>
      </div>

      <div className="sticky top-0 z-10 -mx-2 mb-6 flex flex-wrap items-center gap-3 bg-background/95 px-2 py-3 backdrop-blur">
        <button
          onClick={handleSave}
          disabled={saving || isPublished || incompleteCount > 0}
          className="btn-shimmer inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shark-shadow transition-all hover:bg-accent disabled:opacity-50 cursor-pointer"
        >
          <Icon name="save" className="text-lg" /> {saving ? "Saving..." : "Save & mark reviewed"}
        </button>
        <span className={`text-sm ${incompleteCount ? "text-error" : "text-on-surface-variant"}`}>
          {incompleteCount
            ? `${incompleteCount} question(s) need fixing before you can save`
            : `All ${questions.length} questions are complete`}
        </span>
      </div>

      {isPublished && (
        <div className="mb-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-sm">
          This test is published. Edit its questions and add graphs in Digital SAT Test Management.
        </div>
      )}
      {message && (
        <div
          className={`mb-6 whitespace-pre-line rounded-xl border p-4 text-sm ${message.type === "success" ? "border-primary/25 bg-primary/10 text-primary" : "border-error/25 bg-error/10 text-error"}`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 flex gap-2 rounded-2xl bg-surface-container-low p-1.5">
        {MODULE_SLOTS.map((slot) => {
          const count = questions.filter((question) => question.moduleSlot === slot).length;
          const broken = questions.some(
            (question, index) => question.moduleSlot === slot && problemsByIndex[index]?.length,
          );
          return (
            <button
              key={slot}
              onClick={() => setActiveModule(slot)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer ${activeModule === slot ? "bg-primary text-on-primary shadow" : "text-on-surface-variant"}`}
            >
              {MODULE_LABELS[slot]} · {count}
              {count !== STANDARD_COUNT[section] && (
                <span title={`An official module has ${STANDARD_COUNT[section]} questions`}> ⚠</span>
              )}
              {broken && <span className="ml-1 text-error">●</span>}
            </button>
          );
        })}
      </div>

      {sectionData.warnings?.length > 0 && (
        <ul className="mb-6 space-y-1 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-on-surface">
          {sectionData.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <Icon name="warning" className="text-[18px] text-accent" /> {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="mb-8 space-y-6">
        {moduleQuestions.map(({ question, index }, position) => {
          const problems = problemsByIndex[index] || [];
          const isGridIn = question.questionType === "GRID_IN";
          return (
            <div
              key={index}
              className={`rounded-2xl border p-6 shark-shadow ${problems.length ? "border-error/40 bg-error/5" : "border-outline-variant/40 bg-surface-container-lowest"}`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold">Q{position + 1}</span>
                  {problems.length > 0 && (
                    <span className="text-xs font-semibold text-error">Missing or invalid: {problems.join(", ")}</span>
                  )}
                </div>
                {section === "MATH" && (
                  <Select
                    value={question.questionType}
                    onChange={(e) => changeType(index, e.target.value as FullTestUploadQuestion["questionType"])}
                    options={[
                      { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
                      { value: "GRID_IN", label: "Grid-in (typed answer)" },
                    ]}
                    className="!w-auto !py-1.5"
                  />
                )}
              </div>

              <Textarea
                label={section === "READING_WRITING" ? "Passage + question" : "Question text"}
                value={question.text}
                onChange={(e) => updateQuestion(index, { text: e.target.value })}
                rows={section === "READING_WRITING" ? 6 : 3}
              />
              {section === "READING_WRITING" && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  The last line is shown as the question; the lines above it are shown as the passage.
                </p>
              )}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant">
                  Preview as students see it
                </summary>
                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-container-low p-3">
                  {renderFormattedText(question.text)}
                </div>
              </details>

              {isGridIn ? (
                <div className="mt-3 mb-3 max-w-sm">
                  <Input
                    label="Correct answer"
                    value={question.correctAnswer}
                    onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                    placeholder="e.g. 0.5 or 1/2"
                  />
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Separate equivalent answers with "or" or commas.
                  </p>
                </div>
              ) : (
                <div className="mt-3 mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.label} className="flex items-center gap-2">
                      <button
                        type="button"
                        title="Mark as correct answer"
                        onClick={() => updateQuestion(index, { correctAnswer: option.label })}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold cursor-pointer ${question.correctAnswer === option.label ? "bg-primary text-on-primary" : "bg-surface-container-high"}`}
                      >
                        {option.label}
                      </button>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => {
                          const options = [...question.options];
                          options[optionIndex] = { ...option, text: e.target.value };
                          updateQuestion(index, { options });
                        }}
                        className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                label="Explanation"
                value={question.explanation}
                onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                rows={3}
                className="mt-3"
              />

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {!isGridIn && (
                  <Select
                    label="Correct answer"
                    value={question.correctAnswer}
                    onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                    options={OPTION_LABELS.map((label) => ({ value: label, label }))}
                  />
                )}
                <Select
                  label="Difficulty"
                  value={question.difficulty}
                  onChange={(e) => updateQuestion(index, { difficulty: e.target.value })}
                  options={[
                    { value: "EASY", label: "Easy" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HARD", label: "Hard" },
                  ]}
                />
                <Select
                  label="Category"
                  value={question.category}
                  onChange={(e) => updateQuestion(index, { category: e.target.value })}
                  options={[
                    { value: "", label: "Select category" },
                    ...sectionCategories.map((category) => ({ value: category.name, label: category.name })),
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
