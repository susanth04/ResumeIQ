"""Deterministic scoring for parsed resume content."""

from __future__ import annotations

import re
from typing import List

from models.schemas import ParsedResume, ScoreBreakdown

ATS_KEYWORDS = [
    "python",
    "machine learning",
    "api",
    "rest",
    "sql",
    "docker",
    "git",
    "aws",
    "fastapi",
    "nlp",
    "deep learning",
    "tensorflow",
    "pytorch",
    "agile",
    "ci/cd",
    "cicd",
]

ACTION_VERBS = [
    "led",
    "built",
    "developed",
    "designed",
    "implemented",
    "managed",
    "created",
    "improved",
    "increased",
    "reduced",
    "delivered",
    "achieved",
    "optimized",
    "automated",
    "collaborated",
    "owned",
    "drove",
    "launched",
    "scaled",
    "mentored",
    "architected",
]

DIMENSION_LABELS = {
    "skills_completeness": "Skills Completeness",
    "experience_clarity": "Experience Clarity",
    "ats_keyword_density": "ATS Keyword Density",
    "formatting_quality": "Formatting Quality",
    "education_relevance": "Education Relevance",
}


def _skills_score(skills: List[str]) -> int:
    """Skills completeness: count / 20 capped at 100."""
    if not skills:
        return 0
    return min(100, int((len(skills) / 20.0) * 100))


def _experience_clarity_score(parsed: ParsedResume) -> int:
    """Fraction of bullets with an action verb and a digit."""
    bullets: List[str] = []
    for exp in parsed.experience:
        bullets.extend(exp.bullets)
    if not bullets:
        return 0
    good = 0
    for b in bullets:
        lower = b.lower()
        has_verb = any(v in lower for v in ACTION_VERBS)
        has_num = bool(re.search(r"\d", b))
        if has_verb and has_num:
            good += 1
        elif has_verb:
            good += 0.5
    return min(100, int(round((good / len(bullets)) * 100)))


def _ats_score(parsed: ParsedResume) -> int:
    """Match resume text against ATS keyword list."""
    chunks: List[str] = []
    chunks.append(" ".join(parsed.skills))
    for exp in parsed.experience:
        chunks.append(exp.title)
        chunks.append(exp.company)
        chunks.extend(exp.bullets)
    for edu in parsed.education:
        chunks.append(edu.degree)
        chunks.append(edu.institution)
    for proj in parsed.projects:
        chunks.append(proj.title)
        chunks.append(proj.description)
        chunks.extend(proj.tech_stack)
    blob = " ".join(chunks).lower()
    if not blob.strip():
        return 0
    hits = sum(1 for kw in ATS_KEYWORDS if kw in blob)
    return min(100, int((hits / len(ATS_KEYWORDS)) * 100))


def _formatting_score(parsed: ParsedResume) -> int:
    """Presence of major sections."""
    score = 0
    if parsed.skills:
        score += 25
    if parsed.experience:
        score += 35
    if parsed.education:
        score += 25
    if parsed.projects or (parsed.certifications and len(parsed.certifications) > 0):
        score += 15
    return min(100, score)


def _education_relevance(parsed: ParsedResume) -> int:
    """Map degree strings to a relevance score."""
    if not parsed.education:
        return 0
    best = 0
    for edu in parsed.education:
        d = edu.degree.lower()
        if "ph.d" in d or "phd" in d:
            val = 100
        elif "master" in d or "m.s" in d or "m.s." in d or "mba" in d:
            val = 90
        elif "b.tech" in d or "btech" in d or "bachelor" in d or "b.s" in d or "b.s." in d:
            val = 70
        elif "associate" in d:
            val = 55
        else:
            val = 60
        best = max(best, val)
    return best


def score_resume(parsed: ParsedResume) -> ScoreBreakdown:
    """
    Compute weighted scores for a parsed resume.

    Weights: skills 25%, experience 30%, ATS 20%, formatting 10%, education 15%.
    """
    s_skills = _skills_score(parsed.skills)
    s_exp = _experience_clarity_score(parsed)
    s_ats = _ats_score(parsed)
    s_fmt = _formatting_score(parsed)
    s_edu = _education_relevance(parsed)

    total = int(
        round(
            0.25 * s_skills
            + 0.30 * s_exp
            + 0.20 * s_ats
            + 0.10 * s_fmt
            + 0.15 * s_edu
        )
    )
    total = max(0, min(100, total))

    return ScoreBreakdown(
        skills_completeness=s_skills,
        experience_clarity=s_exp,
        ats_keyword_density=s_ats,
        formatting_quality=s_fmt,
        education_relevance=s_edu,
        total_score=total,
    )


def weak_areas_from_scores(scores: ScoreBreakdown) -> List[str]:
    """List human-readable weak dimensions (score below 60)."""
    weak: List[str] = []
    mapping = [
        ("skills_completeness", scores.skills_completeness),
        ("experience_clarity", scores.experience_clarity),
        ("ats_keyword_density", scores.ats_keyword_density),
        ("formatting_quality", scores.formatting_quality),
        ("education_relevance", scores.education_relevance),
    ]
    for key, val in mapping:
        if val < 60:
            weak.append(DIMENSION_LABELS[key])
    return weak
