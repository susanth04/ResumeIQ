import { useCallback, useState } from "react";

/**
 * Drag-and-drop upload zone that posts multipart resume to POST /upload.
 */
export default function UploadCard({ apiBase, targetRole, onResult, onError }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = (f) => {
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      onError("Please choose a .pdf or .docx file.");
      return;
    }
    setFile(f);
    onError("");
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      pickFile(f);
    },
    [onError]
  );

  const submit = async () => {
    if (!file) {
      onError("Select a resume file first.");
      return;
    }
    setLoading(true);
    onError("");
    try {
      const form = new FormData();
      form.append("resume", file);
      const qs = new URLSearchParams();
      if (targetRole && targetRole.trim()) {
        qs.set("target_role", targetRole.trim());
      }
      const url = `${apiBase}/upload${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      onResult(data);
    } catch (err) {
      onError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const sizeLabel = file
    ? `${(file.size / 1024).toFixed(1)} KB`
    : "";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/40">
      <h2 className="text-lg font-semibold text-white">Upload resume</h2>
      <p className="mt-1 text-sm text-slate-400">
        Drag and drop a PDF or Word document, or browse your files.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragOver
            ? "border-emerald-400/80 bg-emerald-500/5"
            : "border-slate-700 bg-slate-950/40 hover:border-slate-500"
        }`}
        onClick={() => document.getElementById("resume-input")?.click()}
      >
        <p className="text-sm text-slate-300">
          Drop your resume here, or{" "}
          <span className="font-medium text-emerald-400">click to browse</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">Accepted: .pdf, .docx · Max 5 MB</p>
        <input
          id="resume-input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {file && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500">{sizeLabel}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFile(null);
            }}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled={loading || !file}
          onClick={submit}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950 border-t-transparent" />
              Analyzing…
            </span>
          ) : (
            "Analyze resume"
          )}
        </button>
        {loading && (
          <p className="text-xs text-slate-500">
            Parsing, scoring, and generating feedback…
          </p>
        )}
      </div>
    </section>
  );
}
