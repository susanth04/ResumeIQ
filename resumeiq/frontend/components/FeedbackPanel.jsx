import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Render LLM markdown, collapsible sections, copy actions, and improve calls.
 */
export default function FeedbackPanel({
  apiBase,
  feedback,
  suggestions,
  parsed,
  targetRole,
}) {
  const sections = useMemo(() => splitMarkdownSections(feedback), [feedback]);
  const [open, setOpen] = useState(() => new Set(sections.map((_, i) => i)));
  const [improveLoading, setImproveLoading] = useState({});
  const [improveResult, setImproveResult] = useState({});

  const toggle = (idx) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const copyText = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(`Copy (${label})`, text);
    }
  };

  const improve = async (sectionKey, content) => {
    const k = sectionKey;
    setImproveLoading((s) => ({ ...s, [k]: true }));
    try {
      const res = await fetch(`${apiBase}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: sectionKey,
          content,
          target_role: targetRole || "",
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Improve request failed");
      }
      const data = await res.json();
      setImproveResult((s) => ({ ...s, [k]: data.rewritten }));
    } catch (e) {
      setImproveResult((s) => ({ ...s, [k]: `Error: ${e.message}` }));
    } finally {
      setImproveLoading((s) => ({ ...s, [k]: false }));
    }
  };

  const sectionSources = useMemo(
    () => buildSectionSources(parsed),
    [parsed]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/40">
        <h2 className="text-lg font-semibold text-white">AI feedback</h2>
        <p className="mt-1 text-sm text-slate-400">
          Written to be easy to scan: reasons for each point, concrete examples from your
          resume, and clear next steps. Expand or collapse each section.
        </p>

        <div className="mt-6 space-y-3">
          {sections.map((sec, idx) => {
            const improveKey = matchImproveKey(sec.title, sectionSources);
            const improveBusy = improveKey ? improveLoading[improveKey] : false;
            const improveOut = improveKey ? improveResult[improveKey] : null;
            return (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-100 hover:bg-slate-900/80"
              >
                <span>{sec.title || `Section ${idx + 1}`}</span>
                <span className="text-xs text-slate-500">
                  {open.has(idx) ? "Hide" : "Show"}
                </span>
              </button>
              {open.has(idx) && (
                <div className="border-t border-slate-800 px-4 py-4 text-sm leading-relaxed text-slate-200">
                  <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300">
                    <ReactMarkdown>{sec.body}</ReactMarkdown>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(sec.title, sec.body)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-500/60 hover:text-white"
                    >
                      Copy section
                    </button>
                    {improveKey && sectionSources[improveKey] && (
                      <button
                        type="button"
                        disabled={improveBusy}
                        onClick={() => improve(improveKey, sectionSources[improveKey])}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:opacity-40"
                      >
                        {improveBusy ? "Improving…" : "Improve this section"}
                      </button>
                    )}
                  </div>
                  {improveOut && (
                    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-50">
                      <p className="mb-1 font-semibold text-emerald-200">Suggested rewrite</p>
                      <pre className="whitespace-pre-wrap font-sans text-emerald-50/95">
                        {improveOut}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/40">
        <h3 className="text-base font-semibold text-white">Actionable suggestions</h3>
        <ul className="mt-4 space-y-3">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200"
            >
              <span>{s}</span>
              <button
                type="button"
                onClick={() => copyText(`suggestion-${i}`, s)}
                className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500/60"
              >
                Copy
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function splitMarkdownSections(md) {
  if (!md) return [{ title: "Overview", body: "" }];
  const lines = md.split(/\r?\n/);
  const chunks = [];
  let title = "Overview";
  let buf = [];

  const flush = () => {
    const body = buf.join("\n").trim();
    if (body || title !== "Overview") {
      chunks.push({ title, body: body || "_No content._" });
    }
    buf = [];
  };

  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      flush();
      title = m[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  if (!chunks.length) {
    return [{ title: "Analysis", body: md }];
  }
  return chunks;
}

function buildSectionSources(parsed) {
  if (!parsed) return {};
  const skillsText = (parsed.skills || []).join(", ");
  const expText = (parsed.experience || [])
    .map((e) => {
      const head = `${e.title} — ${e.company} (${e.duration})`;
      const bullets = (e.bullets || []).map((b) => `• ${b}`).join("\n");
      return `${head}\n${bullets}`;
    })
    .join("\n\n");
  const eduText = (parsed.education || [])
    .map((e) => `${e.degree}, ${e.institution} (${e.year})`)
    .join("\n");
  const projText = (parsed.projects || [])
    .map((p) => `${p.title}: ${p.description}`)
    .join("\n\n");

  return {
    skills: skillsText,
    experience: expText,
    education: eduText,
    projects: projText,
  };
}

function matchImproveKey(sectionTitle, sources) {
  const t = sectionTitle.toLowerCase();
  if (t.includes("skill")) return "skills";
  if (t.includes("experience") || t.includes("work")) return "experience";
  if (t.includes("education") || t.includes("academic")) return "education";
  if (t.includes("project")) return "projects";
  return null;
}
