"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScoreCardProps {
  analysis: {
    id: string;
    totalScore: number;
    scores?: {
      skills_completeness: number;
      experience_clarity: number;
      ats_keyword_density: number;
      formatting_quality: number;
      education_relevance: number;
    };
    weakAreas?: string[];
  };
}

const scoreConfig = [
  { key: "skills_completeness", label: "Skills", icon: "⚡" },
  { key: "experience_clarity", label: "Experience", icon: "📋" },
  { key: "ats_keyword_density", label: "ATS Keywords", icon: "🔍" },
  { key: "formatting_quality", label: "Formatting", icon: "✨" },
  { key: "education_relevance", label: "Education", icon: "🎓" },
] as const;

function getColor(value: number) {
  if (value >= 80) return "#10B981"; // emerald
  if (value >= 60) return "#F59E0B"; // amber
  return "#EF4444"; // red
}

function getGrade(score: number) {
  if (score >= 90) return { label: "Excellent", color: "#10B981" };
  if (score >= 75) return { label: "Good", color: "#10B981" };
  if (score >= 60) return { label: "Fair", color: "#F59E0B" };
  if (score >= 40) return { label: "Needs Work", color: "#EF4444" };
  return { label: "Poor", color: "#EF4444" };
}

export function ScoreCard({ analysis }: ScoreCardProps) {
  const score = Math.round(analysis.totalScore ?? 0);
  const grade = getGrade(score);
  const circumference = 2 * Math.PI * 44; // radius = 44

  return (
    <Card className="card-dark p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Score Breakdown
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic rules + ATS analysis
          </p>
        </div>
        <Badge
          className="text-xs font-semibold px-3 py-1 rounded-full border-0"
          style={{
            backgroundColor: `${grade.color}18`,
            color: grade.color,
          }}
        >
          {grade.label}
        </Badge>
      </div>

      {/* Circular Score */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
            {/* Track */}
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="#1A1F35"
              strokeWidth="8"
            />
            {/* Progress */}
            <motion.circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke={getColor(score)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset:
                  circumference - (score / 100) * circumference,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 6px ${getColor(score)}80)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold tabular-nums"
              style={{ color: getColor(score) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {score}
            </motion.span>
            <span className="text-xs text-slate-500">/100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {scoreConfig.map(({ key, label, icon }) => {
            const value = Math.round(analysis.scores?.[key] ?? 0);
            const color = getColor(value);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">
                    {icon} {label}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color }}>
                    {value}
                  </span>
                </div>
                <div className="h-1 bg-[#1A1F35] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak Areas */}
      {analysis.weakAreas && analysis.weakAreas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Areas to Improve
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.weakAreas.map((area, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444]"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
