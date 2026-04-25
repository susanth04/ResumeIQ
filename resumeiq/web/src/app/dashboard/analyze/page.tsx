"use client";

import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { UploadZone } from "@/components/dashboard/UploadZone";
import { FeedbackPanel } from "@/components/dashboard/FeedbackPanel";
import { ResumeGenerator } from "@/components/dashboard/ResumeGenerator";
import { saveAnalysis } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { Briefcase, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowBackground } from "@/components/ui/background-components";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { ParsedResume, ResumeAnalysisApiResult } from "@/types/analysis";

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
  { label: "Embedded / Firmware Engineer", value: "Embedded Engineer" },
  { label: "Product Manager", value: "Product Manager" },
  { label: "UX/UI Designer", value: "UX/UI Designer" },
  { label: "Product Designer", value: "Product Designer" },
  { label: "Business Analyst", value: "Business Analyst" },
  { label: "Financial Analyst", value: "Financial Analyst" },
  { label: "Investment Banking Analyst", value: "Investment Banking Analyst" },
  { label: "Management Consultant", value: "Management Consultant" },
  { label: "Growth / Marketing Manager", value: "Growth Marketing Manager" },
  { label: "Digital Marketing Specialist", value: "Digital Marketing Specialist" },
  { label: "Sales Development Representative", value: "Sales Development Representative" },
  { label: "Operations Manager", value: "Operations Manager" },
  { label: "HR / People Operations", value: "HR Manager" },
  { label: "Project Manager (PMP)", value: "Project Manager" },
  { label: "Research Scientist", value: "Research Scientist" },
  { label: "AI / NLP Researcher", value: "AI Research Scientist" },
];

export default function AnalyzePage() {
  const { file, setFile, targetRole, setTargetRole, loading, result, analyzeResume } = useAnalysis();
  const { user } = useAuth();
  const [customRole, setCustomRole] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (result && user) {
      const apiResult: ResumeAnalysisApiResult = {
        id: result.id,
        parsed: (result.parsedResume as unknown as ParsedResume) ?? {
          name: result.parsedName,
          email: result.parsedEmail,
          phone: null,
          skills: [],
          experience: [],
          education: [],
          projects: [],
          certifications: [],
        },
        scores: {
          skills_completeness: result.scores.skills_completeness,
          experience_clarity: result.scores.experience_clarity,
          ats_keyword_density: result.scores.ats_keyword_density,
          formatting_quality: result.scores.formatting_quality,
          education_relevance: result.scores.education_relevance,
          total_score: result.totalScore,
        },
        weak_areas: result.weakAreas,
        feedback: result.feedback,
        suggestions: result.suggestions,
      };
      saveAnalysis(
        user.uid,
        result.fileName || "resume.pdf",
        result.fileSize || file?.size || 0,
        targetRole || null,
        apiResult
      ).catch((err) => console.warn("Firestore save skipped:", err?.message));
    }
  }, [result, user, file, targetRole]);

  const handleRoleSelect = (value: string) => {
    if (value === "__custom__") {
      setShowCustom(true);
      setTargetRole(customRole);
    } else {
      setShowCustom(false);
      setTargetRole(value);
    }
  };

  const scoreColor = (v: number) =>
    v >= 80 ? "#10B981" : v >= 60 ? "#F59E0B" : "#EF4444";

  return (
    /* Relative so GlowBackground (absolute) is contained */
    <div className="relative min-h-screen bg-[var(--background)]">
      <GlowBackground />

      {/* All content sits above the glow (z-10) */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">Resume Analyzer</h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Upload your resume and select a target role to get a tailored analysis.
            </p>
          </div>

          {/* ── Target Role Selector ── */}
          <SpotlightCard
            spotlightColor="rgba(14,165,233,0.12)"
            className="p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-[#0EA5E9]" />
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Target Job Posting
              </label>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Selecting a role tailors the analysis and auto-generates a matching resume.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  className="w-full appearance-none bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-[#0EA5E9] cursor-pointer transition-colors"
                  value={showCustom ? "__custom__" : targetRole}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                >
                  {JOB_POSTINGS.map((job) => (
                    <option key={job.value} value={job.value}>{job.label}</option>
                  ))}
                  <option value="__custom__">✏️ Enter a custom role...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
              </div>
              {showCustom && (
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => { setCustomRole(e.target.value); setTargetRole(e.target.value); }}
                  placeholder="e.g. Principal Engineer at Stripe"
                  className="flex-1 bg-[var(--background)] border border-[#0EA5E9]/40 text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[var(--muted-foreground)]"
                />
              )}
            </div>
            {targetRole && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/25 text-[#0EA5E9] text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] inline-block" />
                  {targetRole}
                </span>
              </div>
            )}
          </SpotlightCard>

          {/* ── Upload Zone ── */}
          <SpotlightCard spotlightColor="rgba(14,165,233,0.10)" className="p-4">
            <UploadZone
              file={file}
              onFileChange={setFile}
              targetRole={targetRole}
              onTargetRoleChange={setTargetRole}
              loading={loading}
              onAnalyze={analyzeResume}
              hideRoleInput
            />
          </SpotlightCard>

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="space-y-4">
              <div className="h-28 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
              <div className="h-48 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <div className="space-y-6">

              {/* Score cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Overall score */}
                <SpotlightCard
                  spotlightColor={`${scoreColor(result.totalScore)}22`}
                  className="p-6 flex flex-col items-center justify-center text-center"
                >
                  <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Overall Score
                  </div>
                  <div
                    className="text-6xl font-bold font-mono leading-none"
                    style={{ color: scoreColor(result.totalScore) }}
                  >
                    {result.totalScore}
                  </div>
                  <div className="text-[var(--muted-foreground)] text-sm mt-1">/100</div>
                  <div
                    className="mt-3 text-xs px-3 py-1 rounded-full border"
                    style={{
                      color: scoreColor(result.totalScore),
                      borderColor: `${scoreColor(result.totalScore)}40`,
                      background: `${scoreColor(result.totalScore)}12`,
                    }}
                  >
                    {result.totalScore >= 80 ? "Excellent" : result.totalScore >= 60 ? "Good" : "Needs Work"}
                  </div>
                </SpotlightCard>

                {/* Sub-scores */}
                <SpotlightCard
                  spotlightColor="rgba(14,165,233,0.12)"
                  className="p-6"
                >
                  <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
                    Sub-scores
                  </div>
                  <div className="space-y-3">
                    {Object.entries(result.scores).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-[var(--foreground)] mb-1">
                          <span className="capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-mono font-semibold">{value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--border)]">
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(0, Math.min(100, value as number))}%`,
                              background: scoreColor(value as number),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              </div>

              {/* Weak areas + CTA */}
              {result.weakAreas.length > 0 && (
                <SpotlightCard
                  spotlightColor="rgba(245,158,11,0.12)"
                  className="p-5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                        Areas to Improve
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.weakAreas.map((area) => (
                          <span
                            key={area}
                            className="px-2 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--foreground)]"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="btn-primary shrink-0"
                      onClick={() =>
                        document.getElementById("resume-generator")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Improved Resume
                    </Button>
                  </div>
                </SpotlightCard>
              )}

              {/* AI Feedback panel */}
              <FeedbackPanel
                analysis={
                  result as unknown as {
                    feedback?: string;
                    suggestions?: string[];
                    parsedName?: string;
                    parsedEmail?: string;
                    [key: string]: unknown;
                  }
                }
              />

              {/* Resume Generator */}
              <div id="resume-generator">
                <ResumeGenerator analysis={result} targetRole={targetRole} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
