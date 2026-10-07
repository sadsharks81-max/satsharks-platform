import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Icon } from "../common/Icon";
import { Input } from "../ui/Input";
import { EmptyState } from "../ui/EmptyState";
import { api, getBackendUrl, getStoredToken } from "../../services/api";
import type { FullTestModuleSlot, FullTestSection, FullTestUpload, FullTestUploadSection } from "../../types";

const SECTION_LABELS: Record<FullTestSection, string> = { READING_WRITING: "English", MATH: "Math" };
const SECTION_FIELD: Record<FullTestSection, "readingWriting" | "math"> = {
  READING_WRITING: "readingWriting",
  MATH: "math",
};
const MODULE_SHORT_LABELS: Record<FullTestModuleSlot, string> = {
  MODULE_1: "M1",
  MODULE_2_EASY: "M2 Easy",
  MODULE_2_HARD: "M2 Hard",
};

const FORMAT_EXAMPLE = `SECTION: MATH

MODULE 1
QUESTION 1
CATEGORY: SAT Algebra
DIFFICULTY: MEDIUM
PROMPT: If 3x + 7 = 22, what is the value of x?
A: 3
B: 5
C: 7
D: 15
ANSWER: B
EXPLANATION: Subtract 7, then divide by 3.
END QUESTION

QUESTION 2
CATEGORY: SAT Algebra
DIFFICULTY: HARD
TYPE: GRID_IN
PROMPT: What is the value of 1/2 + 1/4?
ANSWER: 0.75 or 3/4
EXPLANATION: 1/2 + 1/4 = 3/4.
END QUESTION
END MODULE

MODULE 2 EASY
... questions numbered from 1 ...
END MODULE

MODULE 2 HARD
... questions numbered from 1 ...
END MODULE`;

const sectionVariant = (status: FullTestUploadSection["status"]) =>
  status === "REVIEWED" ? "success" : status === "EXTRACTED" ? "info" : "error";

/** Sends a multipart request; the JSON `api` helper cannot carry files. */
const postForm = async (path: string, formData: FormData) => {
  const token = getStoredToken();
  try {
    const res = await fetch(`${getBackendUrl()}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return await res.json();
  } catch {
    return { success: false, error: "Upload failed. Server error." };
  }
};

interface FullTestUploadsProps {
  uploadOpen: boolean;
  onUploadClose: () => void;
}

export function FullTestUploads({ uploadOpen, onUploadClose }: FullTestUploadsProps) {
  const [uploads, setUploads] = useState<FullTestUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [testNumber, setTestNumber] = useState("");
  const [englishFile, setEnglishFile] = useState<File | null>(null);
  const [mathFile, setMathFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<{ uploadId: string; section: FullTestSection } | null>(null);

  const fetchUploads = async () => {
    const res = await api.get("/api/uploads/full-tests");
    if (res.success) setUploads(res.uploads || []);
    else setPageError(res.error || "Could not load full-test uploads.");
    setLoading(false);
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const resetForm = () => {
    setTitle("");
    setTestNumber("");
    setEnglishFile(null);
    setMathFile(null);
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !year || !testNumber) {
      setFormError("Title, year, and test number are required.");
      return;
    }
    if (!englishFile && !mathFile) {
      setFormError("Choose the English PDF, the Math PDF, or both.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("year", year);
    formData.append("testNumber", testNumber);
    if (englishFile) formData.append("readingWriting", englishFile);
    if (mathFile) formData.append("math", mathFile);

    const data = await postForm("/api/uploads/full-tests", formData);
    setSubmitting(false);
    if (!data.success) {
      setFormError(data.error || "Upload failed.");
      return;
    }
    resetForm();
    onUploadClose();
    setPageError("");
    setPageNotice("");
    fetchUploads();
  };

  const startReplace = (uploadId: string, section: FullTestSection) => {
    replaceTargetRef.current = { uploadId, section };
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = replaceTargetRef.current;
    e.target.value = "";
    if (!file || !target) return;

    setBusyKey(`${target.uploadId}-${target.section}`);
    setPageError("");
    setPageNotice("");
    const formData = new FormData();
    formData.append("file", file);
    const data = await postForm(
      `/api/uploads/full-tests/${target.uploadId}/sections/${target.section}/file`,
      formData,
    );
    if (!data.success) setPageError(data.error || "Upload failed.");
    await fetchUploads();
    setBusyKey(null);
  };

  const handlePublish = async (upload: FullTestUpload) => {
    if (
      !confirm(
        `Publish "${upload.title}"?\n\nThis creates the adaptive test with all 6 modules. It stays hidden from students until you add any graphs/images and switch it to Active in Digital SAT Test Management.`,
      )
    ) {
      return;
    }
    setBusyKey(`${upload._id}-publish`);
    setPageError("");
    setPageNotice("");
    const res = await api.post(`/api/uploads/full-tests/${upload._id}/publish`, {});
    if (res.success) {
      setPageNotice(
        `"${upload.title}" was published with ${res.questionCount} questions. Add graphs/images and activate it in Digital SAT Test Management.`,
      );
    } else {
      setPageError(res.error || "Could not publish this test.");
    }
    await fetchUploads();
    setBusyKey(null);
  };

  const handleDelete = async (upload: FullTestUpload) => {
    const message =
      upload.status === "PUBLISHED"
        ? `Delete the upload record for "${upload.title}"? The published test itself is kept.`
        : `Delete the upload "${upload.title}"?`;
    if (!confirm(message)) return;
    const res = await api.delete(`/api/uploads/full-tests/${upload._id}`);
    if (!res.success) setPageError(res.error || "Could not delete this upload.");
    fetchUploads();
  };

  const renderSection = (upload: FullTestUpload, section: FullTestSection) => {
    const data = upload[SECTION_FIELD[section]];
    const isDraft = upload.status === "DRAFT";
    const busy = busyKey === `${upload._id}-${section}`;

    if (!data) {
      return (
        <div className="space-y-2">
          <span className="text-xs text-on-surface-variant">Not uploaded</span>
          {isDraft && (
            <button
              onClick={() => startReplace(upload._id, section)}
              disabled={busy}
              className="flex items-center gap-1 rounded bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary hover:bg-secondary/20 disabled:opacity-50 cursor-pointer"
            >
              <Icon name="upload" className="text-[14px]" /> {busy ? "Uploading..." : `Upload ${SECTION_LABELS[section]} PDF`}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2 max-w-xs">
        <div className="flex items-center gap-2">
          <Badge variant={sectionVariant(data.status)}>{data.status}</Badge>
          {data.status !== "FAILED" && (
            <span className="font-mono text-xs text-on-surface-variant">{data.questionCount ?? 0} Q</span>
          )}
        </div>
        <div className="truncate text-xs text-on-surface-variant" title={data.fileName}>
          {data.fileName}
        </div>
        {data.status !== "FAILED" && data.moduleCounts && (
          <div className="font-mono text-[11px] text-on-surface-variant">
            {(Object.keys(MODULE_SHORT_LABELS) as FullTestModuleSlot[])
              .map((slot) => `${MODULE_SHORT_LABELS[slot]} ${data.moduleCounts?.[slot] ?? 0}`)
              .join(" · ")}
          </div>
        )}
        {data.warnings?.length > 0 && (
          <ul className="space-y-0.5 text-[11px] leading-4 text-accent">
            {data.warnings.map((warning) => (
              <li key={warning} className="flex gap-1">
                <Icon name="warning" className="text-[13px]" /> {warning}
              </li>
            ))}
          </ul>
        )}
        {data.status === "FAILED" && data.errorMessage && (
          <details className="text-xs text-error">
            <summary className="cursor-pointer font-semibold">Why it failed</summary>
            <p className="mt-1 whitespace-pre-line leading-5">{data.errorMessage}</p>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          {data.status !== "FAILED" && isDraft && (
            <Link
              to="/admin/review-full-test/$uploadId/$section"
              params={{ uploadId: upload._id, section }}
              className="rounded bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              {data.status === "REVIEWED" ? "Edit review" : "Review"}
            </Link>
          )}
          {isDraft && (
            <button
              onClick={() => startReplace(upload._id, section)}
              disabled={busy}
              className="rounded bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary hover:bg-secondary/20 disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Uploading..." : "Re-upload"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleReplaceFile}
      />

      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Icon name="description" className="mt-0.5 text-2xl text-primary" />
            <div>
              <h2 className="font-bold text-primary">Upload one English PDF and one Math PDF per test</h2>
              <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
                Each PDF starts with its SECTION line and holds three modules: MODULE 1, MODULE 2 EASY, and
                MODULE 2 HARD. Students who score 65% or more on Module 1 get the hard Module 2. Every question
                needs CATEGORY, DIFFICULTY, PROMPT, ANSWER, and EXPLANATION; use TYPE: GRID_IN for Math
                fill-in questions. Use a text-based PDF, not a scan. Add graphs after publishing, in Test
                Management.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a
              href="/full-test-import-sample-english.pdf"
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <Icon name="picture_as_pdf" className="text-lg" /> English sample
            </a>
            <a
              href="/full-test-import-sample-math.pdf"
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <Icon name="picture_as_pdf" className="text-lg" /> Math sample
            </a>
            <a
              href="/full-test-import-template.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-accent"
            >
              <Icon name="print" className="text-lg" /> Open printable builder
            </a>
          </div>
        </div>
        <details className="mt-4 rounded-xl bg-surface-container-lowest px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-on-surface">View exact format</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-on-surface-variant">
            {FORMAT_EXAMPLE}
          </pre>
          <p className="mt-2 text-xs text-on-surface-variant">
            English questions may add a <span className="font-mono">PASSAGE:</span> line before PROMPT. The
            PROMPT is the question shown under the passage.
          </p>
        </details>
      </div>

      {pageError && (
        <div className="mb-6 whitespace-pre-line rounded-xl border border-error/25 bg-error/10 p-4 text-sm text-error">
          <div className="flex items-start gap-2">
            <Icon name="error" className="mt-0.5 shrink-0" />
            <span>{pageError}</span>
          </div>
        </div>
      )}
      {pageNotice && (
        <div className="mb-6 rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm text-primary">
          <div className="flex items-start gap-2">
            <Icon name="check_circle" className="mt-0.5 shrink-0" />
            <span>
              {pageNotice}{" "}
              <Link to="/admin/tests" className="font-semibold underline">
                Open Test Management
              </Link>
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">Loading...</div>
      ) : uploads.length === 0 ? (
        <EmptyState
          icon="upload_file"
          title="No full tests uploaded yet"
          description="Upload the English and Math PDFs of a test to get started"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shark-shadow">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                <th className="p-4 font-semibold">Test</th>
                <th className="p-4 font-semibold">English</th>
                <th className="p-4 font-semibold">Math</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {uploads.map((upload) => {
                const ready =
                  upload.readingWriting?.status === "REVIEWED" && upload.math?.status === "REVIEWED";
                const publishing = busyKey === `${upload._id}-publish`;
                return (
                  <tr key={upload._id} className="align-top transition-colors hover:bg-surface-container-low/50">
                    <td className="p-4">
                      <div className="text-sm font-semibold">{upload.title}</div>
                      <div className="mt-1 text-xs text-on-surface-variant">
                        Year {upload.year} · Test #{upload.testNumber}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {new Date(upload.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">{renderSection(upload, "READING_WRITING")}</td>
                    <td className="p-4">{renderSection(upload, "MATH")}</td>
                    <td className="p-4">
                      <Badge variant={upload.status === "PUBLISHED" ? "success" : "default"}>{upload.status}</Badge>
                      {upload.status === "DRAFT" && !ready && (
                        <p className="mt-2 max-w-[11rem] text-[11px] leading-4 text-on-surface-variant">
                          Review and save both sections to publish.
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-2">
                        {upload.status === "DRAFT" ? (
                          <button
                            onClick={() => handlePublish(upload)}
                            disabled={!ready || publishing}
                            className="whitespace-nowrap rounded bg-primary px-3 py-1 text-sm font-semibold text-on-primary hover:bg-accent disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {publishing ? "Publishing..." : "Publish Test"}
                          </button>
                        ) : (
                          <Link
                            to="/admin/tests"
                            className="rounded bg-primary/10 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/20"
                          >
                            Open in Test Management
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(upload)}
                          className="rounded bg-error/10 px-3 py-1 text-sm text-error hover:bg-error/20 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={uploadOpen} onClose={onUploadClose} title="Upload Full Test" icon="upload_file">
        {formError && (
          <div className="mb-4 flex items-start gap-2 whitespace-pre-line rounded-xl border border-error/25 bg-error/15 p-3 text-sm text-error">
            <Icon name="error" className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Digital SAT Practice Test 15"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              min={2000}
              max={2100}
            />
            <Input
              label="Test number"
              type="number"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              required
              min={1}
              placeholder="e.g. 15"
            />
          </div>
          {(
            [
              ["English (Reading & Writing) PDF", englishFile, setEnglishFile],
              ["Math PDF", mathFile, setMathFile],
            ] as const
          ).map(([label, file, setFile]) => (
            <div key={label}>
              <label className="mb-1.5 block font-mono text-[12px] uppercase tracking-[0.08em] text-on-surface-variant">
                {label}
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-outline-variant p-4 transition-colors hover:border-primary/40">
                <Icon name="cloud_upload" className="text-2xl text-on-surface-variant/50" />
                <span className="truncate text-sm text-on-surface-variant">
                  {file ? file.name : "Click to choose a PDF"}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          ))}
          <p className="text-xs leading-5 text-on-surface-variant">
            Each PDF is checked as soon as it is uploaded. If one has a mistake, fix that file and re-upload
            just that section from the table.
          </p>
          <div className="flex gap-4 border-t border-outline-variant/30 pt-4">
            <button
              type="button"
              onClick={onUploadClose}
              className="flex-1 rounded-xl border border-outline-variant py-2.5 text-sm font-semibold transition-colors hover:bg-surface-container-low cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-primary py-2.5 font-semibold text-on-primary transition-all hover:bg-accent disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Uploading & checking..." : "Upload"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
