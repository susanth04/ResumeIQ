"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  targetRole: string | null;
  totalScore: number;
  scores: {
    skills_completeness: number;
    experience_clarity: number;
    ats_keyword_density: number;
    formatting_quality: number;
    education_relevance: number;
  };
  weakAreas: string[];
  feedback: string;
  suggestions: string[];
  parsedName: string;
  parsedEmail: string;
  parsedResume?: Record<string, unknown>;
  resumeUrl?: string;
  createdAt: string;
}

export function useAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const analyzeResume = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to analyze resumes",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    toast({
      title: "Upload Success",
      description: "Resume uploaded. Running analysis...",
    });
    try {
      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);
      if (targetRole) {
        formData.append("target_role", targetRole);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(error.error || "Analysis failed");
      }

      const data = await response.json();

      // Normalize the API response — FastAPI returns snake_case with total_score nested
      const normalized: AnalysisResult = {
        id: data.id,
        userId: user.uid,
        fileName: file.name,
        fileSize: file.size,
        targetRole: targetRole || null,
        totalScore: data.scores?.total_score ?? data.totalScore ?? 0,
        scores: {
          skills_completeness: data.scores?.skills_completeness ?? 0,
          experience_clarity: data.scores?.experience_clarity ?? 0,
          ats_keyword_density: data.scores?.ats_keyword_density ?? 0,
          formatting_quality: data.scores?.formatting_quality ?? 0,
          education_relevance: data.scores?.education_relevance ?? 0,
        },
        weakAreas: data.weak_areas ?? data.weakAreas ?? [],
        feedback: data.feedback ?? "",
        suggestions: data.suggestions ?? [],
        parsedName: data.parsed?.name ?? "",
        parsedEmail: data.parsed?.email ?? "",
        parsedResume: data.parsed,
        resumeUrl: data.resumeUrl ?? "",
        createdAt: new Date().toISOString(),
      };

      // Persist to localStorage so History page can display it without Firestore
      try {
        const key = `resumeiq_history_${user.uid}`;
        const existing: AnalysisResult[] = JSON.parse(localStorage.getItem(key) ?? "[]");
        existing.unshift(normalized); // newest first
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 50))); // cap at 50
      } catch {
        // localStorage unavailable — non-fatal
      }

      setResult(normalized);
      toast({
        title: "Analysis Complete ✓",
        description: `Your resume scored ${normalized.totalScore}/100`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to analyze resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const clearAnalysis = () => {
    setFile(null);
    setTargetRole("");
    setResult(null);
  };

  return {
    file,
    setFile,
    targetRole,
    setTargetRole,
    loading,
    result,
    analyzeResume,
    clearAnalysis,
  };
}
