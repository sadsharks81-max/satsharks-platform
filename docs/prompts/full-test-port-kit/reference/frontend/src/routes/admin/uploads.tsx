import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/common/Icon";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { api, getBackendUrl } from "../../services/api";
import type { PracticeTestUpload } from "../../types";
import { FullTestUploads } from "../../components/admin/FullTestUploads";

export const Route = createFileRoute("/admin/uploads")({
  component: AdminUploads,
});

function AdminUploads() {
  const [uploads, setUploads] = useState<PracticeTestUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"FULL_TEST" | "PRACTICE_QUESTIONS">("FULL_TEST");
  const [fullTestModalOpen, setFullTestModalOpen] = useState(false);

  const fetchUploads = async () => {
    const res = await api.get("/api/uploads");
    if (res.success) setUploads(res.uploads || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      setError("Title and file are required.");
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${getBackendUrl()}/api/uploads/practice-questions`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setTitle("");
        setFile(null);
        fetchUploads();
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setError("Upload failed. Server error.");
    }
    setUploading(false);
  };

  const handleExtract = async (id: string) => {
    setExtractingId(id);
    setPageError("");
    const res = await api.post(`/api/uploads/${id}/extract`, {});
    if (!res.success) setPageError(res.error || "Question extraction failed.");
    await fetchUploads();
    setExtractingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this upload?")) return;
    await api.delete(`/api/uploads/${id}`);
    fetchUploads();
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "default" | "warning" | "info" | "success" | "error" | "accent"> = {
      UPLOADED: "default",
      PROCESSING: "warning",
      EXTRACTED: "info",
      REVIEWED: "accent",
      PUBLISHED: "success",
      FAILED: "error",
    };
    return map[s] || "default";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <AdminLayout activeItem="/admin/uploads">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Test & Practice Question Uploads</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage full-test PDF uploads and separate practice-question imports.
          </p>
        </div>
        <button
          onClick={() => {
            if (activeType === "FULL_TEST") {
              setFullTestModalOpen(true);
              return;
            }
            setModalOpen(true);
            setError("");
          }}
          className="btn-shimmer inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shark-shadow hover:bg-accent transition-all cursor-pointer"
        >
          <Icon name="upload_file" className="text-lg" /> Upload{" "}
          {activeType === "FULL_TEST" ? "Test" : "Questions"}
        </button>
      </div>
      <div className="mb-6 flex gap-2 rounded-2xl bg-surface-container-low p-1.5">
        <button
          onClick={() => setActiveType("FULL_TEST")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${activeType === "FULL_TEST" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant"}`}
        >
          Full Test Uploads
        </button>
        <button
          onClick={() => setActiveType("PRACTICE_QUESTIONS")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${activeType === "PRACTICE_QUESTIONS" ? "bg-primary text-on-primary shadow" : "text-on-surface-variant"}`}
        >
          Practice Question Uploads
        </button>
      </div>

      {activeType === "PRACTICE_QUESTIONS" && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Icon name="description" className="mt-0.5 text-2xl text-primary" />
              <div>
                <h2 className="font-bold text-primary">
                  Use the required practice-question PDF format
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
                  Use a text-based PDF (not a scan). Every question needs SECTION, CATEGORY,
                  DIFFICULTY, PROMPT, choices A-D, ANSWER, EXPLANATION, and END QUESTION. Category
                  names must exactly match a category in the question bank.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href="/practice-question-import-sample.pdf"
                download
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                <Icon name="picture_as_pdf" className="text-lg" /> Download sample PDF
              </a>
              <a
                href="/practice-question-import-template.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-accent"
              >
                <Icon name="print" className="text-lg" /> Open printable builder
              </a>
            </div>
          </div>
          <details className="mt-4 rounded-xl bg-surface-container-lowest px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-on-surface">
              View exact field order
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-on-surface-variant">{`QUESTION 1
SECTION: MATH
CATEGORY: Algebra
DIFFICULTY: MEDIUM
PROMPT: If 3x + 7 = 22, what is the value of x?
A: 3
B: 5
C: 7
D: 15
ANSWER: B
EXPLANATION: Subtract 7, then divide by 3.
END QUESTION`}</pre>
          </details>
        </div>
      )}

      {activeType === "FULL_TEST" && (
        <FullTestUploads uploadOpen={fullTestModalOpen} onUploadClose={() => setFullTestModalOpen(false)} />
      )}

      {activeType === "PRACTICE_QUESTIONS" && pageError && (
        <div className="mb-6 whitespace-pre-line rounded-xl border border-error/25 bg-error/10 p-4 text-sm text-error">
          <div className="flex items-start gap-2">
            <Icon name="error" className="mt-0.5 shrink-0" />
            <span>{pageError}</span>
          </div>
        </div>
      )}

      {activeType !== "PRACTICE_QUESTIONS" ? null : loading ? (
        <div className="text-center py-12 text-on-surface-variant">Loading...</div>
      ) : uploads.filter((item) => (item.uploadType || "FULL_TEST") === activeType).length === 0 ? (
        <EmptyState
          icon="upload_file"
          title="No uploads yet"
          description="Upload a correctly formatted practice-question PDF to get started"
        />
      ) : (
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/40 overflow-hidden shark-shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/40 text-xs uppercase tracking-wider text-on-surface-variant">
                <th className="p-4 font-semibold">Title</th>
                <th className="p-4 font-semibold">File</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Questions</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {uploads
                .filter((item) => (item.uploadType || "FULL_TEST") === activeType)
                .map((u) => (
                  <tr key={u._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4 font-semibold text-sm">{u.title}</td>
                    <td className="p-4 text-sm text-on-surface-variant">
                      <div>{u.fileName}</div>
                      <div className="text-xs">{formatSize(u.fileSize)}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
                      {u.status === "FAILED" && u.errorMessage && (
                        <p className="mt-2 max-w-sm whitespace-pre-line text-xs leading-5 text-error">
                          {u.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-sm font-mono">{u.extractedQuestions?.length || 0}</td>
                    <td className="p-4 text-sm text-on-surface-variant">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {u.status === "UPLOADED" && (
                          <button
                            disabled={extractingId === u._id}
                            onClick={() => handleExtract(u._id)}
                            className="px-3 py-1 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {extractingId === u._id ? "Extracting..." : "Extract"}
                          </button>
                        )}
                        {(u.status === "EXTRACTED" || u.status === "REVIEWED") && (
                          <Link
                            to="/admin/review-upload/$uploadId"
                            params={{ uploadId: u._id }}
                            className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded text-sm font-semibold transition-colors"
                          >
                            Review
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(u._id)}
                          className="px-3 py-1 bg-error/10 text-error hover:bg-error/20 rounded text-sm transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Import Practice Questions"
        icon="upload_file"
      >
        {error && (
          <div className="mb-4 p-3 bg-error/15 text-error rounded-xl text-sm border border-error/25 flex items-center gap-2">
            <Icon name="error" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Official SAT Practice Test 1"
          />
          <div>
            <label className="mb-1.5 block font-mono text-[12px] uppercase tracking-[0.08em] text-on-surface-variant">
              PDF File
            </label>
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
              <Icon name="cloud_upload" className="text-4xl text-on-surface-variant/40 mb-2" />
              <p className="text-sm text-on-surface-variant mb-3">
                {file ? file.name : "Click to select or drag and drop a PDF"}
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ position: "relative" }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-on-surface-variant">
            Before uploading, confirm the PDF uses the required field order and selectable text.
            Need a clean starting file?{" "}
            <a
              href="/practice-question-import-template.html"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline"
            >
              Open the printable template
            </a>
            .
          </div>
          <div className="flex gap-4 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container-low text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-accent font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
