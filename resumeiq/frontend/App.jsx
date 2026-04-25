import { useState } from "react";
import UploadCard from "./components/UploadCard.jsx";
import ScoreDashboard from "./components/ScoreDashboard.jsx";
import FeedbackPanel from "./components/FeedbackPanel.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [result, setResult] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">
              ResumeIQ
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              AI resume analyzer
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Upload a PDF or DOCX. You get automatic scores plus plain-language feedback
              (what changed, why it matters, what to do next) from Gemini&nbsp;2.5&nbsp;Flash.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <label className="block text-xs font-medium text-slate-400">
              Target role (optional)
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior ML Engineer"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-500/0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <UploadCard
          apiBase={API_BASE}
          targetRole={targetRole}
          onResult={(data) => {
            setError("");
            setResult(data);
          }}
          onError={(msg) => {
            setError(msg);
            setResult(null);
          }}
        />

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {result && (
          <>
            <ScoreDashboard scores={result.scores} weakAreas={result.weak_areas} />
            <FeedbackPanel
              apiBase={API_BASE}
              feedback={result.feedback}
              suggestions={result.suggestions}
              parsed={result.parsed}
              targetRole={targetRole}
            />
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        ResumeIQ · Gemini&nbsp;2.5&nbsp;Flash · API port 8000 · UI port 3000
      </footer>
    </div>
  );
}
