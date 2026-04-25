"""Pydantic schemas for resume parsing, scoring, and analysis results."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ExperienceEntry(BaseModel):
    """A single work experience block."""

    title: str = ""
    company: str = ""
    duration: str = ""
    bullets: List[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    """A single education entry."""

    degree: str = ""
    institution: str = ""
    year: str = ""


class ProjectEntry(BaseModel):
    """A project listed on the resume."""

    title: str = ""
    description: str = ""
    tech_stack: List[str] = Field(default_factory=list)


class ParsedResume(BaseModel):
    """Structured data extracted from a resume file."""

    name: str = ""
    email: str = ""
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[ExperienceEntry] = Field(default_factory=list)
    education: List[EducationEntry] = Field(default_factory=list)
    projects: List[ProjectEntry] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)


class ScoreBreakdown(BaseModel):
    """Numeric scores across resume quality dimensions."""

    skills_completeness: int = Field(ge=0, le=100)
    experience_clarity: int = Field(ge=0, le=100)
    ats_keyword_density: int = Field(ge=0, le=100)
    formatting_quality: int = Field(ge=0, le=100)
    education_relevance: int = Field(ge=0, le=100)
    total_score: int = Field(ge=0, le=100)


class ResumeAnalysisResult(BaseModel):
    """Full analysis payload returned to the client."""

    id: str
    parsed: ParsedResume
    scores: ScoreBreakdown
    weak_areas: List[str] = Field(default_factory=list)
    feedback: str = ""
    suggestions: List[str] = Field(default_factory=list)
