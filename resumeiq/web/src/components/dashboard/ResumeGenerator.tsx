"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ResumeGeneratorProps {
  analysis: {
    id: string;
    totalScore: number;
    parsedName?: string;
    parsedEmail?: string;
    parsedResume?: Record<string, unknown>;
    feedback?: string;
    suggestions?: string[];
    weakAreas?: string[];
  };
  targetRole: string;
}

export function ResumeGenerator({ analysis, targetRole }: ResumeGeneratorProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [latex, setLatex] = useState("");
  const [extractedJson, setExtractedJson] = useState<Record<string, unknown> | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [overleafUrl, setOverleafUrl] = useState<string>("");

  const generateResume = async () => {
    if (!user) return;

    setStatus("generating");
    setErrorMsg("");

    try {
      const token = await user.getIdToken();

      // Use /api/generate-resume (no Firestore required — passes data directly)
      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parsed_resume: analysis.parsedResume ?? {
            name: analysis.parsedName ?? "",
            email: analysis.parsedEmail ?? "",
            phone: null,
            skills: [],
            experience: [],
            education: [],
            projects: [],
            certifications: [],
          },
          target_role: targetRole || "",
          suggestions: analysis.suggestions ?? [],
          weak_areas: analysis.weakAreas ?? [],
          analysis_id: analysis.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(JSON.stringify(err.error ?? err) || "Resume generation failed");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/pdf")) {
        // Direct PDF download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(analysis.parsedName ?? "resume").replace(/\s+/g, "_")}_improved.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus("done");
        return;
      }

      const data = await response.json();
      setLatex(data.latex ?? "");
      setExtractedJson(null);
      setPdfBase64("");
      setOverleafUrl(data.overleafUrl ?? "");
      setStatus("done");
    } catch (err) {
      console.error("Resume generation error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const downloadLatex = () => {
    const blob = new Blob([latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(analysis.parsedName ?? "resume").replace(/\s+/g, "_")}_improved.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!pdfBase64) return;
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(analysis.parsedName ?? "resume").replace(/\s+/g, "_")}_improved.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="card-dark p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-base font-semibold text-slate-100">
              Generate Improved Resume
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Extract JSON preview first, then generate a reliable template-driven resume.
          </p>
        </div>
      </div>

      {/* Score context */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="text-xs px-3 py-1.5 rounded-lg bg-[#060810] border border-[#1A1F35] text-slate-400">
          Current score:{" "}
          <span className="font-bold text-slate-200">
            {analysis.totalScore}/100
          </span>
        </div>
        {targetRole && (
          <div className="text-xs px-3 py-1.5 rounded-lg bg-[#0EA5E9]/8 border border-[#0EA5E9]/20 text-[#0EA5E9]">
            Target: <span className="font-bold">{targetRole}</span>
          </div>
        )}
        <div className="text-xs px-3 py-1.5 rounded-lg bg-[#F59E0B]/8 border border-[#F59E0B]/20 text-[#F59E0B]">
          LaTeX compiled PDF
        </div>
      </div>

      {/* Action area */}
      {status === "idle" && (
        <Button
          onClick={generateResume}
          className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0C0F1A] font-semibold h-11 px-6 rounded-lg transition-all duration-200 hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate & Download Resume
        </Button>
      )}

      {status === "generating" && (
        <div className="flex items-center gap-3 py-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B]" />
          <div>
            <p className="text-sm font-medium text-slate-200">
              Generating your improved resume…
            </p>
            <p className="text-xs text-slate-500">
              Gemini is rewriting your content in LaTeX — this takes ~15 seconds
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

          {extractedJson && (
            <div className="bg-[#060810] border border-[#1A1F35] rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2">Extracted JSON Preview</p>
              <pre className="text-xs text-slate-400 max-h-48 overflow-auto font-mono">
                {JSON.stringify(extractedJson, null, 2)}
              </pre>
            </div>
          )}

          {latex && (
            <div className="space-y-3">
              {/* LaTeX preview */}
              <div className="bg-[#060810] border border-[#1A1F35] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#1A1F35]">
                  <span className="text-xs text-slate-500 font-mono">resume.tex</span>
                  <span className="text-xs px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded">
                    LaTeX
                  </span>
                </div>
                <pre className="text-xs text-slate-400 p-4 overflow-x-auto max-h-64 font-mono leading-relaxed">
                  {latex.slice(0, 1200)}
                  {latex.length > 1200 && "\n…"}
                </pre>
              </div>

              <div className="flex flex-wrap gap-3">
                {pdfBase64 && (
                  <Button onClick={downloadPdf} className="btn-primary h-9 px-5 text-sm">
                    <FileDown className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button
                  onClick={downloadLatex}
                  className="btn-primary h-9 px-5 text-sm"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download .tex
                </Button>
                <Button
                  onClick={() => window.open(overleafUrl, "_blank", "noopener,noreferrer")}
                  className="btn-ghost h-9 px-5 text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Overleaf
                </Button>
                <Button
                  onClick={() => setStatus("idle")}
                  className="btn-ghost h-9 px-5 text-sm"
                >
                  Regenerate
                </Button>
              </div>

              {!pdfBase64 && (
                <p className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md p-2">
                  PDF compilation unavailable locally. Use Overleaf to compile for free.
                </p>
              )}
            </div>
          )}

          {!latex && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-400">PDF downloaded to your device.</p>
              <Button
                onClick={() => setStatus("idle")}
                className="btn-ghost h-8 px-4 text-xs"
              >
                Regenerate
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
              <p className="text-xs text-slate-500 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <Button
            onClick={() => setStatus("idle")}
            className="btn-ghost h-9 px-4 text-sm"
          >
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
}
