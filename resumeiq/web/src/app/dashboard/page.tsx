"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeUserAnalyses } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { HistoryCard } from "@/components/dashboard/HistoryCard";
import { useRouter } from "next/navigation";
import { FileText, TrendingUp, Zap, Plus } from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type { SavedAnalysis } from "@/types/analysis";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAnalyses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeUserAnalyses(
      user.uid,
      (items) => {
        setAnalyses(items);
        setLoading(false);
      },
      (error) => {
        if (
          typeof error === "object" &&
          error !== null &&
          ("code" in error || "message" in error)
        ) {
          const maybeError = error as { code?: string; message?: string };
          if (
            maybeError.code === "permission-denied" ||
            maybeError.message?.includes("permissions")
          ) {
            console.warn("Firestore rules not deployed.");
          } else {
            console.error("Error loading analyses:", error);
          }
        } else {
          console.error("Error loading analyses:", error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const bestScore = analyses.length > 0 ? Math.max(...analyses.map((a) => a.totalScore)) : null;
  const latestScore = analyses.length > 0 ? analyses[0].totalScore : null;
  const recentAnalyses = analyses.slice(0, 5);

  const scoreColor = (score: number | null) => {
    if (!score) return "text-[var(--muted-foreground)]";
    if (score >= 80) return "text-[#10B981]";
    if (score >= 60) return "text-[#F59E0B]";
    return "text-[#EF4444]";
  };

  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* ── Welcome ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            Here&apos;s a summary of your resume performance.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/analyze")}
          className="btn-primary h-9 px-4 text-sm hidden sm:flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </Button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SpotlightCard spotlightColor="rgba(14,165,233,0.12)" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase tracking-wider">
                Total Analyses
              </p>
              <p className="text-3xl font-bold text-[var(--foreground)] tabular-nums">
                {analyses.length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#0EA5E9]" />
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(16,185,129,0.12)" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase tracking-wider">
                Best Score
              </p>
              <p className={`text-3xl font-bold tabular-nums ${scoreColor(bestScore)}`}>
                {bestScore ? `${bestScore}` : "—"}
                {bestScore && <span className="text-base text-[var(--muted-foreground)] font-normal">/100</span>}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(245,158,11,0.12)" className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1 uppercase tracking-wider">
                Latest Score
              </p>
              <p className={`text-3xl font-bold tabular-nums ${scoreColor(latestScore)}`}>
                {latestScore ? `${latestScore}` : "—"}
                {latestScore && <span className="text-base text-[var(--muted-foreground)] font-normal">/100</span>}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#F59E0B]" />
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* ── Recent Analyses ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Recent Analyses</h2>
          <Button
            onClick={() => router.push("/dashboard/analyze")}
            className="btn-primary h-8 px-3 text-xs sm:hidden"
          >
            New Analysis
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-pulse h-16"
              />
            ))}
          </div>
        ) : recentAnalyses.length === 0 ? (
          <SpotlightCard spotlightColor="rgba(14,165,233,0.08)" className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-5 h-5 text-[#0EA5E9]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">No analyses yet</h3>
            <p className="text-[var(--muted-foreground)] text-sm mb-6">
              Upload your first resume to start tracking your score.
            </p>
            <Button
              onClick={() => router.push("/dashboard/analyze")}
              className="btn-primary h-9 px-5 text-sm"
            >
              Analyze Your Resume
            </Button>
          </SpotlightCard>
        ) : (
          <div className="space-y-3">
            {recentAnalyses.map((analysis) => (
              <HistoryCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
