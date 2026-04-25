"""Deterministic resume parsing and scoring tools."""

from tools.parser import parse_resume
from tools.scorer import score_resume, weak_areas_from_scores

__all__ = ["parse_resume", "score_resume", "weak_areas_from_scores"]
