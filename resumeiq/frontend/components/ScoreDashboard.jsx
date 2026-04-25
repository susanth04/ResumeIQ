import { useMemo } from "react";

function scoreColor(value) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-400";
  return "bg-rose-500";
}

function ringColor(value) {
  if (value >= 80) return "stroke-emerald-400";
  if (value >= 60) return "stroke-amber-400";
  return "stroke-rose-500";
}

/**
 * Circular total score and horizontal bars for sub-scores.
 */
export default function ScoreDashboard({ scores, weakAreas }) {
  const total = scores.total_score;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (total / 100) * circumference;

  const dims = useMemo(
    () => [
      { key: "skills_completeness", label: "Skills completeness", value: scores.skills_completeness },
      { key: "experience_clarity", label: "Experience clarity", value: scores.experience_clarity },
      { key: "ats_keyword_density", label: "ATS keyword density", value: scores.ats_keyword_density },
      { key: "formatting_quality", label: "Formatting quality", value: scores.formatting_quality },
      { key: "education_relevance", label: "Education relevance", value: scores.education_relevance },
    ],
    [scores]
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/40">
      <h2 className="text-lg font-semibold text-white">Score breakdown</h2>
      <p className="mt-1 text-sm text-slate-400">
        These numbers come from rules in the app (not the AI): skills breadth, bullet
        quality, keyword match, section coverage, and education level—combined into one
        total. Use them alongside the written feedback below.
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-[220px,1fr] md:items-center">
        <div className="flex flex-col items-center justify-center">
          <div className="relative h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                className="text-slate-800"
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
              />
              <circle
                className={ringColor(total)}
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-semibold text-white">{total}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {dims.map((d) => (
            <div key={d.key}>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>{d.label}</span>
                <span className="font-mono text-slate-200">{d.value}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${scoreColor(d.value)}`}
                  style={{ width: `${d.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {weakAreas?.length > 0 && (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Weak areas
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {weakAreas.map((w) => (
              <span
                key={w}
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-100"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
