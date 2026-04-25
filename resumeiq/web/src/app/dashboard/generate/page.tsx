"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { GlowBackground } from "@/components/ui/background-components";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import {
  FileDown, Loader2, Sparkles, CheckCircle2,
  AlertCircle, ExternalLink, Upload, FileText,
  Briefcase, ChevronDown, X,
} from "lucide-react";

const JOB_POSTINGS = [
  { label: "Select a target role...", value: "" },
  { label: "Software Engineer — Full Stack", value: "Software Engineer (Full Stack)" },
  { label: "Backend Engineer (Python / Node.js)", value: "Backend Engineer" },
  { label: "Frontend Engineer (React / Next.js)", value: "Frontend Engineer" },
  { label: "Mobile Engineer (iOS / Android)", value: "Mobile Engineer" },
  { label: "Machine Learning Engineer", value: "Machine Learning Engineer" },
  { label: "Data Scientist", value: "Data Scientist" },
  { label: "Data Engineer", value: "Data Engineer" },
  { label: "DevOps / SRE", value: "DevOps Engineer / SRE" },
  { label: "Cloud Architect (AWS / GCP / Azure)", value: "Cloud Architect" },
  { label: "Cybersecurity Analyst", value: "Cybersecurity Analyst" },
  { label: "Product Manager", value: "Product Manager" },
  { label: "UX/UI Designer", value: "UX/UI Designer" },
  { label: "Business Analyst", value: "Business Analyst" },
  { label: "Financial Analyst", value: "Financial Analyst" },
  { label: "Management Consultant", value: "Management Consultant" },
  { label: "Research Scientist", value: "Research Scientist" },
  { label: "AI / NLP Researcher", value: "AI Research Scientist" },
];

export default function GenerateResumePage() {
  const { user } = useAuth();

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customRole, setCustomRole] = useState("");

  // Generation state
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [latex, setLatex] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [overleafUrl, setOverleafUrl] = useState("");
  const [parsedName, setParsedName] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.name.endsWith(".docx"))) setFile(f);
  };

  const handleRoleSelect = (value: string) => {
    if (value === "__custom__") { setShowCustom(true); setTargetRole(customRole); }
    else { setShowCustom(false); setTargetRole(value); }
  };

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

  const generate = async () => {
    if (!file || !user) return;
    setStatus("generating");
    setErrorMsg("");

    try {
      const token = await user.getIdToken();

      // Step 1: Upload & parse resume to get structured data
      const form = new FormData();
      form.append("file", file);
      if (targetRole) form.append("target_role", targetRole);

      const uploadRes = await fetch(`/api/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!uploadRes.ok) throw new Error("Failed to parse resume");
      const uploadData = await uploadRes.json();
      setParsedName(uploadData.parsed?.name ?? "");

      // Step 2: Generate resume from parsed data
      const genRes = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          parsed_resume: uploadData.parsed ?? {},
          target_role: targetRole,
          suggestions: uploadData.suggestions ?? [],
          weak_areas: uploadData.weak_areas ?? [],
          analysis_id: uploadData.id ?? "direct",
        }),
      });
      if (!genRes.ok) throw new Error("Resume generation failed");

      const ct = genRes.headers.get("content-type") ?? "";
      if (ct.includes("application/pdf")) {
        const blob = await genRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "improved_resume.pdf";
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus("done");
        return;
      }

      const data = await genRes.json();
      setLatex(data.latex ?? "");
      setPdfBase64(data.pdf_base64 ?? "");
      setOverleafUrl(data.overleafUrl ?? "");
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const downloadLatex = () => {
    const blob = new Blob([latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(parsedName || "resume").replace(/\s+/g, "_")}_tailored.tex`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(parsedName || "resume").replace(/\s+/g, "_")}_tailored.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      <GlowBackground />
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#F59E0B]" />
              Generate Tailored Resume
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Upload your resume, pick a target role — Gemini rewrites it as an ATS-optimized LaTeX PDF.
            </p>
          </div>

          {/* Step 1 — Target Role */}
          <SpotlightCard spotlightColor="rgba(245,158,11,0.12)" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">Target Role</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  className="w-full appearance-none bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  value={showCustom ? "__custom__" : targetRole}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                >
                  {JOB_POSTINGS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                  <option value="__custom__">✏️ Enter a custom role...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
              </div>
              {showCustom && (
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => { setCustomRole(e.target.value); setTargetRole(e.target.value); }}
                  placeholder="e.g. Staff Engineer at OpenAI"
                  className="flex-1 bg-[var(--background)] border border-[#F59E0B]/40 text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#F59E0B] placeholder:text-[var(--muted-foreground)]"
                />
              )}
            </div>
            {targetRole && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-[#F59E0B] text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] inline-block" />
                  {targetRole}
                </span>
              </div>
            )}
          </SpotlightCard>

          {/* Step 2 — Upload */}
          <SpotlightCard spotlightColor="rgba(245,158,11,0.10)" className="p-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !file && document.getElementById("gen-file-input")?.click()}
              className={`rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer p-6 text-center
                ${file
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/5 cursor-default"
                  : "border-[var(--border)] hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/5 bg-[var(--muted)]"
                }`}
            >
              <input
                id="gen-file-input"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">{file.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setStatus("idle"); }}
                    className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--muted-foreground)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-[var(--border)] flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="font-semibold text-[var(--foreground)] mb-1">Drop your resume here</p>
                  <p className="text-sm text-[var(--muted-foreground)]">PDF or DOCX, max 5 MB</p>
                </>
              )}
            </div>
          </SpotlightCard>

          {/* Step 3 — Generate */}
          <SpotlightCard spotlightColor="rgba(245,158,11,0.12)" className="p-6">

            {status === "idle" && (
              <Button
                onClick={generate}
                disabled={!file}
                className="w-full h-12 font-semibold text-sm bg-[#F59E0B] hover:bg-[#D97706] text-[#0C0F1A] disabled:opacity-40 rounded-lg transition-all hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate &amp; Download Tailored Resume
              </Button>
            )}

            {status === "generating" && (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B]" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Generating your tailored resume…
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Gemini is rewriting your content in LaTeX — ~20 seconds
                  </p>
                </div>
              </div>
            )}

            {status === "done" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#10B981]">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Resume generated successfully!</span>
                </div>

                {latex && (
                  <div className="space-y-3">
                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
                        <span className="text-xs text-[var(--muted-foreground)] font-mono">resume.tex</span>
                        <span className="text-xs px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded">LaTeX</span>
                      </div>
                      <pre className="text-xs text-[var(--muted-foreground)] p-4 overflow-x-auto max-h-64 font-mono leading-relaxed">
                        {latex.slice(0, 1200)}{latex.length > 1200 && "\n…"}
                      </pre>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {pdfBase64 && (
                        <Button onClick={downloadPdf} className="btn-primary h-9 px-5 text-sm">
                          <FileDown className="w-4 h-4 mr-2" />Download PDF
                        </Button>
                      )}
                      <Button onClick={downloadLatex} className="btn-primary h-9 px-5 text-sm">
                        <FileDown className="w-4 h-4 mr-2" />Download .tex
                      </Button>
                      {overleafUrl && (
                        <Button
                          onClick={() => window.open(overleafUrl, "_blank", "noopener,noreferrer")}
                          className="btn-ghost h-9 px-5 text-sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />Open in Overleaf
                        </Button>
                      )}
                      <Button onClick={() => { setStatus("idle"); setFile(null); }} className="btn-ghost h-9 px-5 text-sm">
                        Generate Another
                      </Button>
                    </div>

                    {!pdfBase64 && (
                      <p className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md p-2">
                        pdflatex not installed on server — use Overleaf to compile to PDF for free.
                      </p>
                    )}
                  </div>
                )}

                {!latex && (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-[var(--muted-foreground)]">PDF downloaded to your device.</p>
                    <Button onClick={() => { setStatus("idle"); setFile(null); }} className="btn-ghost h-8 px-4 text-xs">
                      Generate Another
                    </Button>
                  </div>
                )}
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#EF4444]/8 border border-[#EF4444]/25">
                  <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#EF4444]">Generation failed</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{errorMsg}</p>
                  </div>
                </div>
                <Button onClick={() => setStatus("idle")} className="btn-ghost h-9 px-4 text-sm">
                  Try Again
                </Button>
              </div>
            )}
          </SpotlightCard>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[
              { icon: "🤖", title: "Gemini-powered", desc: "Rewrites with ATS best practices" },
              { icon: "📄", title: "LaTeX quality", desc: "Professional typeset output" },
              { icon: "🎯", title: "Role-tailored", desc: "Keywords matched to target job" },
            ].map((item) => (
              <SpotlightCard key={item.title} spotlightColor="rgba(245,158,11,0.10)" className="p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{item.desc}</p>
              </SpotlightCard>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
