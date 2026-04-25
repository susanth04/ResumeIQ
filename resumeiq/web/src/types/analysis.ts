/** API response shape from FastAPI /upload (ResumeAnalysisResult). */

export interface ScoreBreakdown {
  skills_completeness: number;
  experience_clarity: number;
  ats_keyword_density: number;
  formatting_quality: number;
  education_relevance: number;
  total_score: number;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string | null;
  skills: string[];
  experience: unknown[];
  education: unknown[];
  projects: unknown[];
  certifications: string[];
}

export interface ResumeAnalysisApiResult {
  id: string;
  parsed: ParsedResume;
  scores: ScoreBreakdown;
  weak_areas: string[];
  feedback: string;
  suggestions: string[];
}

export interface ScoreSubset {
  skills_completeness: number;
  experience_clarity: number;
  ats_keyword_density: number;
  formatting_quality: number;
  education_relevance: number;
}

export interface SavedAnalysis {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  targetRole: string | null;
  totalScore: number;
  scores: ScoreSubset;
  weakAreas: string[];
  feedback: string;
  suggestions: string[];
  parsedName: string;
  parsedEmail: string;
  parsedResume: ParsedResume;
  createdAt: Date;
}
