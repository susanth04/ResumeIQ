"""Extract structured resume data from PDF or DOCX using spaCy and heuristics."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List

import spacy
from docx import Document
from pdfminer.high_level import extract_text as pdf_extract_text

from models.schemas import (
    EducationEntry,
    ExperienceEntry,
    ParsedResume,
    ProjectEntry,
)

_NLP = None

SECTION_KEYS = (
    "skills",
    "experience",
    "work experience",
    "employment",
    "education",
    "projects",
    "certifications",
    "certificates",
)

EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)
PHONE_RE = re.compile(
    r"(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}"
    r"|\+?\d[\d\s().-]{8,}\d",
)


def _load_nlp():
    """Lazy-load spaCy English model."""
    global _NLP
    if _NLP is None:
        try:
            _NLP = spacy.load("en_core_web_sm")
        except Exception:
            # Vercel/serverless builds often don't include model packages.
            # Fall back to a blank English pipeline so parsing still works.
            _NLP = spacy.blank("en")
    return _NLP


def _extract_text(file_path: str) -> str:
    """Read plain text from a PDF or DOCX file."""
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        try:
            text = pdf_extract_text(str(path)) or ""
        except Exception as exc:
            raise RuntimeError(f"Failed to extract PDF text: {exc}") from exc
        if not text.strip():
            raise RuntimeError("PDF text extraction returned empty content.")
        return text
    if suffix == ".docx":
        try:
            doc = Document(str(path))
            parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
            text = "\n".join(parts)
        except Exception as exc:
            raise RuntimeError(f"Failed to read DOCX: {exc}") from exc
        if not text.strip():
            raise RuntimeError("DOCX contained no paragraph text.")
        return text
    raise ValueError(f"Unsupported file type: {suffix}")


def _guess_name(text: str) -> str:
    """Use spaCy PERSON entities and fallbacks for the candidate name."""
    nlp = _load_nlp()
    doc = nlp(text[:4000])
    persons = [ent.text.strip() for ent in doc.ents if ent.label_ == "PERSON"]
    if persons:
        # Prefer longest reasonable name
        persons.sort(key=len, reverse=True)
        return persons[0][:120]
    first_line = next(
        (ln.strip() for ln in text.splitlines() if ln.strip()), ""
    )
    if first_line and not EMAIL_RE.search(first_line):
        return first_line[:120]
    return ""


def _split_sections(text: str) -> Dict[str, List[str]]:
    """Split resume body into section key -> lines using keyword headers."""
    lines = [ln.rstrip() for ln in text.replace("\r", "").split("\n")]
    current = "header"
    sections: Dict[str, List[str]] = {
        "header": [],
        "skills": [],
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
    }

    def norm_header(line: str) -> str:
        return re.sub(r"[^a-z\s]", "", line.lower()).strip()

    for line in lines:
        stripped = line.strip()
        n = norm_header(stripped)
        matched = None
        if not n:
            sections[current].append("")
            continue
        if n in ("skills", "technical skills", "core competencies"):
            matched = "skills"
        elif n in (
            "experience",
            "work experience",
            "professional experience",
            "employment history",
            "employment",
        ):
            matched = "experience"
        elif n in ("education", "academic background", "qualifications"):
            matched = "education"
        elif n in ("projects", "academic projects", "personal projects"):
            matched = "projects"
        elif n in ("certifications", "certificates", "licenses"):
            matched = "certifications"
        elif len(stripped) < 40 and any(
            k in n for k in ("summary", "objective", "profile", "about")
        ):
            matched = "header"
        if matched:
            current = matched
            continue
        sections[current].append(line)
    return sections


def _parse_skills(lines: List[str]) -> List[str]:
    """Parse comma/bullet-separated skills."""
    raw = " ".join(ln.strip("•*- \t") for ln in lines if ln.strip())
    if not raw:
        return []
    parts = re.split(r"[,;|]", raw)
    skills = []
    for p in parts:
        s = p.strip()
        if s and len(s) < 80:
            skills.append(s)
    return skills[:50]


def _parse_experience(lines: List[str]) -> List[ExperienceEntry]:
    """Heuristic parsing of experience blocks."""
    entries: List[ExperienceEntry] = []
    current: ExperienceEntry | None = None
    date_pat = re.compile(
        r"\b(19|20)\d{2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}",
        re.I,
    )

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        bullet = stripped.startswith(("•", "-", "*", "▪", "·")) or re.match(
            r"^\d+[\.)]\s", stripped
        )
        if bullet:
            text = re.sub(r"^[•\-\*▪·\d\.\)\s]+", "", stripped).strip()
            if current and text:
                current.bullets.append(text)
            continue

        if date_pat.search(stripped) and len(stripped) < 200:
            if current and (current.title or current.bullets):
                entries.append(current)
            parts = re.split(r"\s[|\u2013\u2014-]\s|–|—", stripped, maxsplit=1)
            title_company = parts[0].strip()
            duration = parts[1].strip() if len(parts) > 1 else ""
            title = title_company
            company = ""
            if " at " in title_company.lower():
                idx = title_company.lower().rfind(" at ")
                title = title_company[:idx].strip()
                company = title_company[idx + 4 :].strip()
            elif "," in title_company:
                bits = [b.strip() for b in title_company.split(",", 1)]
                if len(bits) == 2:
                    title, company = bits[0], bits[1]
            current = ExperienceEntry(
                title=title,
                company=company,
                duration=duration or stripped,
                bullets=[],
            )
        elif current is None:
            current = ExperienceEntry(
                title=stripped,
                company="",
                duration="",
                bullets=[],
            )
        elif len(stripped) < 120 and not current.bullets:
            if not current.company and "," in stripped:
                bits = [b.strip() for b in stripped.split(",", 1)]
                current.company = bits[0]
                if len(bits) > 1:
                    current.duration = bits[1]
            else:
                current.company = stripped
    if current and (current.title or current.bullets):
        entries.append(current)
    return entries


def _parse_education(lines: List[str]) -> List[EducationEntry]:
    """Parse education lines into entries."""
    entries: List[EducationEntry] = []
    year_re = re.compile(r"\b(19|20)\d{2}\b")
    for line in lines:
        stripped = line.strip("•*- \t")
        if not stripped:
            continue
        years = year_re.findall(stripped)
        year = ""
        if years:
            m = year_re.search(stripped)
            if m:
                year = m.group(0)
        degree = stripped
        institution = ""
        if "," in stripped:
            parts = [p.strip() for p in stripped.split(",", 1)]
            degree = parts[0]
            institution = parts[1] if len(parts) > 1 else ""
        entries.append(
            EducationEntry(degree=degree[:200], institution=institution[:200], year=year)
        )
    return entries[:10]


def _parse_projects(lines: List[str]) -> List[ProjectEntry]:
    """Parse project section."""
    projects: List[ProjectEntry] = []
    current: ProjectEntry | None = None
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(("•", "-", "*")) or re.match(r"^\d+[\.)]\s", stripped):
            text = re.sub(r"^[•\-\*\d\.\)\s]+", "", stripped).strip()
            tech = []
            if "(" in text and ")" in text:
                inner = text[text.find("(") + 1 : text.find(")")]
                tech = [t.strip() for t in re.split(r"[,/]", inner) if t.strip()]
            if current:
                if text:
                    current.description = (current.description + " " + text).strip()
                if tech:
                    current.tech_stack = list(
                        dict.fromkeys(current.tech_stack + tech)
                    )
            continue
        if current:
            projects.append(current)
        title = stripped.split("–")[0].split("-")[0].strip()
        current = ProjectEntry(title=title[:200], description="", tech_stack=[])
    if current:
        projects.append(current)
    return projects


def _parse_certifications(lines: List[str]) -> List[str]:
    """Return list of certification strings."""
    out: List[str] = []
    for line in lines:
        s = line.strip("•*- \t")
        if s:
            out.append(s[:300])
    return out


def parse_resume(file_path: str) -> ParsedResume:
    """
    Parse a resume file into structured fields.

    Args:
        file_path: Absolute path to a .pdf or .docx file.

    Returns:
        ParsedResume populated from extracted text.

    Raises:
        ValueError: If the extension is not supported.
        RuntimeError: If text extraction fails.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix not in (".pdf", ".docx"):
        raise ValueError(f"Unsupported file type '{suffix}'. Use PDF or DOCX.")

    text = _extract_text(file_path)
    email_m = EMAIL_RE.search(text)
    email = email_m.group(0) if email_m else ""
    phone_m = PHONE_RE.search(text)
    phone = phone_m.group(0) if phone_m else None

    sections = _split_sections(text)
    name = _guess_name(text)

    skills = _parse_skills(sections["skills"])
    experience = _parse_experience(sections["experience"])
    education = _parse_education(sections["education"])
    projects = _parse_projects(sections["projects"])
    certs = _parse_certifications(sections["certifications"])

    return ParsedResume(
        name=name or "Unknown",
        email=email,
        phone=phone,
        skills=skills,
        experience=experience,
        education=education,
        projects=projects,
        certifications=certs,
    )
