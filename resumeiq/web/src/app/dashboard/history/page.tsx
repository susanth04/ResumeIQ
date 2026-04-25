"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Trash2, FileText, Clock, Target } from "lucide-react";
import { GlowBackground } from "@/components/ui/background-components";
import { SpotlightCard } from "@/components/ui/spotlight-card";

type ScoreEntry = {
  skills_completeness?: number;
  experience_clarity?: number;
  ats_keyword_density?: number;
  formatting_quality?: number;
  education_relevance?: number;
  [key: string]: number | undefined;
};

type HistoryItem = {
  id: string;
  fileName: string;
  totalScore: number;
  targetRole?: string | null;
  scores?: ScoreEntry;
  createdAt?: string;
  parsedName?: string;
  weakAreas?: string[];
  feedback?: string;
};

const SCORE_COLOR = (v: number) =>
  v >= 80 ? "#10B981" : v >= 60 ? "#F59E0B" : "#EF4444";

export default function HistoryPage() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadFromLocalStorage = useCallback(() => {
    if (!user) return;
    try {
      const key = `resumeiq_history_${user.uid}`;
      const raw = localStorage.getItem(key);
      const items: HistoryItem[] = raw ? JSON.parse(raw) : [];
      setAnalyses(items);
    } catch {
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadFromLocalStorage();
  }, [user, loadFromLocalStorage]);

  const handleDelete = (id: string) => {
    if (!user) return;
    const key = `resumeiq_history_${user.uid}`;
    const updated = analyses.filter((a) => a.id !== id);
    setAnalyses(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      <GlowBackground />

      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">

          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">Analysis History</h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Your past resume analyses — stored locally on this device.
            </p>
          </div>

          {/* ── Loading skeleton ── */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse"
                />
              ))}
            </div>

          /* ── Empty state ── */
          ) : analyses.length === 0 ? (
            <SpotlightCard
              spotlightColor="rgba(14,165,233,0.08)"
              className="p-12 flex flex-col items-center gap-3 text-center"
            >
              <FileText className="w-10 h-10 text-[var(--muted-foreground)]" />
              <p className="text-[var(--foreground)] font-medium">No analyses yet</p>
              <p className="text-[var(--muted-foreground)] text-sm">
                Go to{" "}
                <span className="text-[#0EA5E9]">Analyze Resume</span> and upload
                your first resume.
              </p>
            </SpotlightCard>

          /* ── List ── */
          ) : (
            <div className="space-y-3">
              {analyses.map((item) => (
                <SpotlightCard
                  key={item.id}
                  spotlightColor={`${SCORE_COLOR(item.totalScore)}18`}
                  className="overflow-hidden"
                >
                  {/* ── Row ── */}
                  <div className="flex items-center gap-4 p-4">

                    {/* Score badge */}
                    <div
                      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                      style={{
                        color: SCORE_COLOR(item.totalScore),
                        borderColor: `${SCORE_COLOR(item.totalScore)}40`,
                        background: `${SCORE_COLOR(item.totalScore)}12`,
                      }}
                    >
                      <span className="text-xl font-bold font-mono leading-none">
                        {item.totalScore}
                      </span>
                      <span className="text-[10px] opacity-70">/100</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--foreground)] font-medium text-sm truncate">
                        {item.parsedName || item.fileName}
                      </p>
                      <p className="text-[var(--muted-foreground)] text-xs truncate">
                        {item.fileName}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {item.targetRole && (
                          <span className="flex items-center gap-1 text-xs text-[#0EA5E9]">
                            <Target className="w-3 h-3" />
                            {item.targetRole}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        className="btn-ghost h-8 px-2 text-xs"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      >
                        {expanded === item.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        className="btn-ghost h-8 px-2 text-xs text-red-400 hover:text-red-300 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* ── Expanded sub-scores ── */}
                  {expanded === item.id && (
                    <div className="border-t border-[var(--border)] px-4 py-4 bg-[var(--background)]/60">
                      {item.scores && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {Object.entries(item.scores)
                            .filter(([, v]) => v !== undefined)
                            .map(([key, value]) => (
                              <SpotlightCard
                                key={key}
                                spotlightColor={`${SCORE_COLOR(value ?? 0)}20`}
                                className="p-3"
                              >
                                <div className="text-[10px] text-[var(--muted-foreground)] capitalize mb-1">
                                  {key.replace(/_/g, " ")}
                                </div>
                                <div
                                  className="text-lg font-bold font-mono"
                                  style={{ color: SCORE_COLOR(value ?? 0) }}
                                >
                                  {value}
                                </div>
                                <div className="mt-2 h-1 rounded-full bg-[var(--border)]">
                                  <div
                                    className="h-1 rounded-full transition-all duration-700"
                                    style={{
                                      width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
                                      background: SCORE_COLOR(value ?? 0),
                                    }}
                                  />
                                </div>
                              </SpotlightCard>
                            ))}
                        </div>
                      )}
                      {item.weakAreas && item.weakAreas.length > 0 && (
                        <div>
                          <p className="text-xs text-[var(--muted-foreground)] mb-2">
                            Areas to improve
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.weakAreas.map((w) => (
                              <span
                                key={w}
                                className="px-2 py-0.5 text-xs rounded-full border border-[var(--border)] text-[var(--foreground)]"
                              >
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SpotlightCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
