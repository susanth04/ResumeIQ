"""FastAPI application entry point for ResumeIQ AI."""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re as _re
import subprocess
import tempfile
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
# MCP client imports kept for optional _mcp_call_tool helper (not used in main flow)
try:
    from fastmcp.client import Client as _MCPClient
    from fastmcp.client.transports.sse import SSETransport as _SSETransport
    _MCP_AVAILABLE = True
except ImportError:
    _MCP_AVAILABLE = False
import firebase_admin
from firebase_admin import credentials, firestore, storage
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from uuid import uuid4

from agent.feedback_agent import DEFAULT_GEMINI_MODEL, run_feedback_agent_with_suggestions
from models.schemas import ResumeAnalysisResult
from tools.parser import parse_resume
from tools.scorer import score_resume, weak_areas_from_scores
from utils import file_handler

app = FastAPI(title="ResumeIQ AI", version="1.0.0")

cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

results_store: Dict[str, ResumeAnalysisResult] = {}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ImproveRequest(BaseModel):
    """Request body for targeted section improvement."""
    section: str = Field(..., description="Resume section name, e.g. experience")
    content: str = Field(..., description="Current text to rewrite")
    target_role: str = Field(default="", description="Optional target job title")


class ImproveResponse(BaseModel):
    """Rewritten section text."""
    rewritten: str


class ParsedResumePayload(BaseModel):
    name: str = ""
    email: str = ""
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)


class GenerateResumeRequest(BaseModel):
    parsed_resume: ParsedResumePayload
    target_role: str = ""
    suggestions: List[str] = Field(default_factory=list)
    weak_areas: List[str] = Field(default_factory=list)
    analysis_id: str = ""


class GenerateResumeResponse(BaseModel):
    latex: str


class CavemanFeedbackRequest(BaseModel):
    feedback: str


class CavemanFeedbackResponse(BaseModel):
    caveman_feedback: str


class GenerateResumeV2Request(BaseModel):
    analysisId: str
    targetRole: str = ""




# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _gemini_model_id() -> str:
    return os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)


def _gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=60_000))


def _is_pdflatex_available() -> bool:
    try:
        subprocess.run(["pdflatex", "--version"], capture_output=True, timeout=5)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _get_str(obj: Any, key: str) -> str:
    if isinstance(obj, dict):
        return str(obj.get(key, ""))
    return str(getattr(obj, key, ""))


def _get_list(obj: Any, key: str) -> list:
    if isinstance(obj, dict):
        return obj.get(key, []) or []
    return getattr(obj, key, []) or []


def _iso_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_tex(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    out = value
    for k, v in replacements.items():
        out = out.replace(k, v)
    return out


_FIREBASE_FAILED = False  # set True once init fails so we don't retry every request


def _firebase_bootstrap() -> None:
    global _FIREBASE_FAILED
    if _FIREBASE_FAILED:
        return
    if firebase_admin._apps:  # type: ignore[attr-defined]
        return
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    cred_obj = None
    if service_account_json:
        try:
            cred_obj = credentials.Certificate(json.loads(service_account_json))
        except Exception:
            _FIREBASE_FAILED = True
            return
    elif service_account_path:
        try:
            cred_obj = credentials.Certificate(service_account_path)
        except Exception:
            _FIREBASE_FAILED = True
            return
    else:
        # No service account configured — skip Firebase Admin silently
        _FIREBASE_FAILED = True
        return
    try:
        firebase_admin.initialize_app(
            cred_obj,
            {"storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "")},
        )
    except Exception:
        _FIREBASE_FAILED = True


def _firestore_client():
    _firebase_bootstrap()
    if _FIREBASE_FAILED or not firebase_admin._apps:  # type: ignore[attr-defined]
        return None
    try:
        return firestore.client()
    except Exception:
        return None


def _storage_bucket():
    _firebase_bootstrap()
    if _FIREBASE_FAILED or not firebase_admin._apps:  # type: ignore[attr-defined]
        return None
    try:
        return storage.bucket()
    except Exception:
        return None


def _mcp_url() -> str:
    return os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")


async def _mcp_call_tool(name: str, arguments: dict[str, Any]) -> str:
    """Call an MCP tool via SSE. Only used when MCP server is explicitly running."""
    if not _MCP_AVAILABLE:
        raise RuntimeError("fastmcp not installed")
    transport = _SSETransport(_mcp_url())
    async with _MCPClient(transport) as client:
        result = await client.call_tool(name, arguments)
    if isinstance(result.data, str):
        return result.data
    if result.data is not None:
        return json.dumps(result.data)
    chunks = []
    for block in result.content or []:
        text = getattr(block, "text", None)
        if text:
            chunks.append(text)
    return "\n".join(chunks).strip()


def _build_resume_text(parsed: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append(f"Name: {parsed.get('name', '')}")
    lines.append(f"Email: {parsed.get('email', '')}")
    lines.append(f"Phone: {parsed.get('phone', '')}")
    lines.append("Skills: " + ", ".join(parsed.get("skills", [])))
    lines.append("Experience:")
    for e in parsed.get("experience", [])[:8]:
        lines.append(
            f"- {e.get('title', '')} | {e.get('company', '')} | {e.get('duration', '')}"
        )
        for b in e.get("bullets", [])[:5]:
            lines.append(f"  * {b}")
    lines.append("Projects:")
    for p in parsed.get("projects", [])[:6]:
        lines.append(
            f"- {p.get('title', p.get('name', ''))} ({', '.join(p.get('tech_stack', p.get('tech', [])))})"
        )
        desc = p.get("description", "")
        if desc:
            lines.append(f"  * {desc}")
    lines.append("Education:")
    for edu in parsed.get("education", [])[:4]:
        lines.append(
            f"- {edu.get('degree', '')} | {edu.get('institution', '')} | {edu.get('year', '')}"
        )
    return "\n".join(lines)


def _render_latex_from_json(data: dict[str, Any], target_role: str) -> str:
    name = _safe_tex(data.get("name", "Candidate"))
    email = _safe_tex(data.get("email", ""))
    phone = _safe_tex(data.get("phone", ""))
    linkedin = _safe_tex(data.get("linkedin", ""))
    github = _safe_tex(data.get("github", ""))
    summary = _safe_tex(data.get("summary", ""))
    skills = [_safe_tex(str(s)) for s in (data.get("skills", []) or [])]

    exp_blocks = []
    for e in data.get("experience", [])[:6]:
        bullets = "\n".join(
            [f"\\item {_safe_tex(str(b))}" for b in (e.get("bullets", []) or [])[:3]]
        )
        exp_blocks.append(
            f"\\textbf{{{_safe_tex(str(e.get('role', '')))}}} \\hfill {_safe_tex(str(e.get('dates', '')))}\\\\\n"
            f"\\textit{{{_safe_tex(str(e.get('company', '')))}}}\n"
            "\\begin{itemize}[leftmargin=*,nosep]\n"
            f"{bullets}\n"
            "\\end{itemize}\n"
        )

    proj_blocks = []
    for p in data.get("projects", [])[:4]:
        bullets = "\n".join(
            [f"\\item {_safe_tex(str(b))}" for b in (p.get("bullets", []) or [])[:2]]
        )
        proj_blocks.append(
            f"\\textbf{{{_safe_tex(str(p.get('name', '')))}}} \\hfill \\textit{{{_safe_tex(str(p.get('tech', '')))}}}\n"
            "\\begin{itemize}[leftmargin=*,nosep]\n"
            f"{bullets}\n"
            "\\end{itemize}\n"
        )

    edu_blocks = []
    for edu in data.get("education", [])[:3]:
        edu_blocks.append(
            f"\\textbf{{{_safe_tex(str(edu.get('degree', '')))}}} \\hfill {_safe_tex(str(edu.get('year', '')))}\\\\\n"
            f"\\textit{{{_safe_tex(str(edu.get('institution', '')))}}} {_safe_tex(str(edu.get('gpa', '')))}\n"
        )

    return f"""\\documentclass[11pt,a4paper]{{article}}
\\usepackage[margin=0.8in]{{geometry}}
\\usepackage{{enumitem}}
\\usepackage{{titlesec}}
\\usepackage[hidelinks]{{hyperref}}
\\usepackage{{parskip}}
\\pagestyle{{empty}}
\\titleformat{{\\section}}{{\\large\\bfseries}}{{}}{{0em}}{{}}[\\titlerule]
\\titlespacing*{{\\section}}{{0pt}}{{8pt}}{{4pt}}
\\begin{{document}}
\\begin{{center}}
{{\\LARGE\\bfseries {name}}}\\\\[4pt]
{email} \\quad|\\quad {phone} \\quad|\\quad {linkedin} \\quad|\\quad {github}
\\end{{center}}
\\section{{Summary}}
{summary}
\\section{{Target Role}}
{_safe_tex(target_role or "General")}
\\section{{Skills}}
\\begin{{itemize}}[leftmargin=*,nosep]
\\item {", ".join(skills)}
\\end{{itemize}}
\\section{{Experience}}
{''.join(exp_blocks)}
\\section{{Projects}}
{''.join(proj_blocks)}
\\section{{Education}}
{''.join(edu_blocks)}
\\end{{document}}"""


# ---------------------------------------------------------------------------
# Endpoint 1 — Upload and analyze resume
# ---------------------------------------------------------------------------

@app.post("/upload", response_model=ResumeAnalysisResult)
async def upload_resume(
    resume: UploadFile = File(...),
    target_role: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
) -> ResumeAnalysisResult:
    """
    Accept a resume upload, parse and score it, run the LLM agent,
    and cache the result.
    """
    if not resume.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    try:
        file_handler.validate_extension(resume.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await resume.read()
    try:
        file_handler.validate_size(len(data))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        _, saved_path = file_handler.save_upload(resume.filename, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not save file: {exc}") from exc

    path_str = str(saved_path)

    # ── Step 1: Parse (local tool — fast, no MCP dependency) ───────────────
    try:
        local_parsed = parse_resume(path_str)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=f"Parse error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected parse failure: {exc}") from exc

    # ── Step 2: Score (local tool) ───────────────────────────────────────────
    local_scores = score_resume(local_parsed)
    score_obj: dict[str, Any] = local_scores.model_dump()
    weak = weak_areas_from_scores(local_scores)

    # ── Step 3: LLM feedback via Gemini agent ────────────────────────────────
    role_hint = f"\nTarget role context: {target_role}\n" if target_role else ""
    feedback_md = ""
    suggestions: list[str] = []
    try:
        feedback_md, suggestions = run_feedback_agent_with_suggestions(path_str)
        if role_hint and role_hint not in feedback_md:
            feedback_md = role_hint + "\n" + feedback_md
    except Exception as exc:
        feedback_md = (
            f"## Automated analysis\n\n"
            f"LLM feedback could not be generated ({exc}).\n\n"
            f"```\n{traceback.format_exc()}\n```"
        )
        suggestions = [f"Address: {w}" for w in weak][:7]

    if not suggestions:
        suggestions = [f"Improve {w}." for w in weak][:7]

    result_id = str(uuid4())
    payload = ResumeAnalysisResult(
        id=result_id,
        parsed=local_parsed,
        scores=local_scores,
        weak_areas=weak,
        feedback=feedback_md,
        suggestions=suggestions,
    )
    results_store[result_id] = payload
    score_obj = local_scores.model_dump()

    db = _firestore_client()
    bucket = _storage_bucket()
    resume_url = ""
    if user_id and bucket is not None:
        try:
            blob = bucket.blob(f"resumes/{user_id}/{result_id}.pdf")
            blob.upload_from_string(data, content_type=resume.content_type or "application/pdf")
            blob.make_public()
            resume_url = blob.public_url
        except Exception:
            resume_url = ""
    if db is not None:
        doc_payload = {
            "userId": user_id or "",
            "fileName": resume.filename,
            "fileSize": len(data),
            "targetRole": target_role or "",
            "totalScore": int(score_obj.get("total_score", 0)),
            "scores": {
                "skills_completeness": int(score_obj.get("skills_completeness", 0)),
                "experience_clarity": int(score_obj.get("experience_clarity", 0)),
                "ats_keyword_density": int(score_obj.get("ats_keyword_density", 0)),
                "formatting_quality": int(score_obj.get("formatting_quality", 0)),
                "education_relevance": int(score_obj.get("education_relevance", 0)),
                "total_score": int(score_obj.get("total_score", 0)),
            },
            "weakAreas": weak,
            "weak_areas": weak,
            "feedback": feedback_md,
            "suggestions": suggestions,
            "resumeUrl": resume_url,
            "parsedResume": parsed.model_dump(),
            "createdAt": firestore.SERVER_TIMESTAMP,
            "createdAtIso": _iso_utc_now(),
        }
        try:
            db.collection("analyses").document(result_id).set(doc_payload)
        except Exception:
            pass
    return payload


@app.get("/result/{result_id}", response_model=ResumeAnalysisResult)
async def get_result(result_id: str) -> ResumeAnalysisResult:
    """Return a cached analysis by ID."""
    if result_id not in results_store:
        raise HTTPException(status_code=404, detail="Result not found.")
    return results_store[result_id]


@app.get("/history/{user_id}")
async def get_history(user_id: str):
    db = _firestore_client()
    if db is None:
        return []
    docs = (
        db.collection("analyses")
        .where("userId", "==", user_id)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .stream()
    )
    out = []
    for d in docs:
        item = d.to_dict()
        item["id"] = d.id
        out.append(item)
    return out


@app.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str, user_id: str = Query(...)):
    db = _firestore_client()
    bucket = _storage_bucket()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore unavailable")
    ref = db.collection("analyses").document(analysis_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Analysis not found")
    doc = snap.to_dict() or {}
    if doc.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    ref.delete()
    if bucket is not None:
        blob = bucket.blob(f"resumes/{user_id}/{analysis_id}.pdf")
        try:
            blob.delete()
        except Exception:
            pass
    return {"ok": True}


# ---------------------------------------------------------------------------
# Endpoint 2 — Targeted section rewrite
# ---------------------------------------------------------------------------

@app.post("/improve", response_model=ImproveResponse)
async def improve_section(body: ImproveRequest) -> ImproveResponse:
    """Rewrite a single resume section for a target role using Gemini."""
    client = _gemini_client()
    role = body.target_role or "the role you are applying for"
    prompt = (
        f"Target role: {role}.\n"
        f"Rewrite ONLY the resume section below. Keep all facts truthful. "
        f"Use short, impactful sentences. Lead with strong verbs and metrics. "
        f"Do not add labels or preamble — output just the section text.\n\n"
        f"Section name: {body.section}\n\n---\n{body.content}\n---"
    )

    try:
        response = client.models.generate_content(
            model=_gemini_model_id(),
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are an expert resume writer. Write professional English. "
                    "Output only the rewritten section text — no preamble, no markdown, no commentary."
                ),
                max_output_tokens=4096,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM request failed: {exc}") from exc

    text = (response.text or "").strip()
    if not text:
        raise HTTPException(status_code=500, detail="Empty response from model.")

    return ImproveResponse(rewritten=text)


# ---------------------------------------------------------------------------
# Endpoint 3 — Generate improved resume as LaTeX / PDF
# ---------------------------------------------------------------------------

_LATEX_SCAFFOLD = r"""\documentclass[10pt,a4paper]{article}

\usepackage{url}
\usepackage{parskip}
\RequirePackage{color}
\RequirePackage{graphicx}
\usepackage[usenames,dvipsnames]{xcolor}
\usepackage[scale=0.93,top=0.6cm,bottom=0.6cm]{geometry}
\usepackage{tabularx}
\usepackage{enumitem}
\newcolumntype{C}{>{\centering\arraybackslash}X}
\usepackage{supertabular}
\newlength{\fullcollw}
\setlength{\fullcollw}{0.4\textwidth}
\usepackage{titlesec}
\usepackage{multicol}
\usepackage{multirow}
\titleformat{\section}{\large\scshape\raggedright}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{6pt}{4pt}
\usepackage[unicode, draft=false]{hyperref}
\definecolor{linkcolour}{rgb}{0,0.2,0.6}
\hypersetup{colorlinks,breaklinks,urlcolor=linkcolour,linkcolor=linkcolour}
\usepackage{fontawesome5}
\usepackage{setspace}
\renewcommand{\baselinestretch}{1.35}

\begin{document}
\pagestyle{empty}

%----------------------------------------------------------------------------------------
%  TITLE / HEADER
%----------------------------------------------------------------------------------------
\begin{tabularx}{\linewidth}{@{} C @{}}
\Huge{\textbf{CANDIDATE_FULL_NAME}} \\[4pt]
\large{\textit{CANDIDATE_TITLE_OR_DEGREE}} \\[8pt]
\normalsize{
\faMobile\,\href{tel:PHONE}{\raisebox{-0.05\height} \ \underline{PHONE}} \ $|$ \
\faEnvelope\,\href{mailto:EMAIL}{\raisebox{-0.05\height} \ \underline{EMAIL}} \ $|$ \
\faLinkedin\,\href{LINKEDIN_URL}{\raisebox{-0.05\height}\ \underline{LinkedIn}} \ $|$ \
\faGithub\,\href{GITHUB_URL}{\raisebox{-0.05\height}\ \underline{GitHub}}
}\\
\end{tabularx}

\vspace{4pt}

%----------------------------------------------------------------------------------------
%  EDUCATION
%----------------------------------------------------------------------------------------
\section{\textbf{Education}}
\vspace{4pt}

\begin{tabularx}{\linewidth}{l@{\extracolsep{\fill}}r@{}}
\textcolor{BlueViolet}{\textbf{UNIVERSITY_NAME}} & \hfill \normalsize \textbf{START_YEAR -- END_YEAR} \\[2pt]
\textit{DEGREE_NAME} & \hfill \normalsize \textbf{CGPA: X.XX / 10} \\[1pt]
\end{tabularx}

\vspace{2pt}

%----------------------------------------------------------------------------------------
%  WORK EXPERIENCE
%----------------------------------------------------------------------------------------
\section{\textbf{Work Experience}}
\vspace{4pt}

\begin{tabularx}{\linewidth}{@{}l r@{}}
\textcolor{BlueViolet}{\textbf{COMPANY NAME}} $|$ \textit{JOB TITLE} & \hfill \textbf{START DATE -- END DATE} \\[3pt]
\multicolumn{2}{@{}X@{}}{
    \begin{minipage}[t]{\linewidth}
        \begin{itemize}[nosep, leftmargin=1.2em, itemsep=4pt]
            \item BULLET POINT 1 — quantified achievement with action verb.
            \item BULLET POINT 2 — quantified achievement with action verb.
        \end{itemize}
    \end{minipage}
}
\end{tabularx}

\vspace{6pt}

%----------------------------------------------------------------------------------------
%  PROJECTS
%----------------------------------------------------------------------------------------
\section{\textbf{Projects}}
\vspace{4pt}

\begin{tabularx}{\linewidth}{ @{}l r@{} }
\textcolor{BlueViolet}{\textbf{PROJECT NAME}} $|$ \textit{TECH STACK} & \href{LINK}{\textbf{Project Link}} \\[3pt]
\multicolumn{2}{@{}X@{}}{
    \begin{minipage}[t]{\linewidth}
        \begin{itemize}[nosep, leftmargin=1.2em, itemsep=4pt]
            \item BULLET 1 with quantified impact.
            \item BULLET 2 with quantified impact.
        \end{itemize}
    \end{minipage}
}
\end{tabularx}

\vspace{8pt}

%----------------------------------------------------------------------------------------
%  TECHNICAL SKILLS
%----------------------------------------------------------------------------------------
\section{\textbf{Technical Skills}}
\vspace{4pt}

\begin{tabularx}{\linewidth}{@{}l X@{}}
\textcolor{BlueViolet}{\textbf{Programming Languages}} & LANG1, LANG2, LANG3 \\[6pt]
\textcolor{BlueViolet}{\textbf{Frameworks \& Libraries}} & FRAMEWORK1, FRAMEWORK2 \\[6pt]
\textcolor{BlueViolet}{\textbf{Tools \& Platforms}} & TOOL1, TOOL2, TOOL3 \\
\end{tabularx}

\vspace{2pt}

%----------------------------------------------------------------------------------------
%  ACHIEVEMENTS
%----------------------------------------------------------------------------------------
\section{\textbf{Achievements}}
\vspace{4pt}

\begin{itemize}[nosep, after=\strut, leftmargin=1.2em, itemsep=6pt]
    \item \textbf{ACHIEVEMENT 1}
    \item \textbf{ACHIEVEMENT 2}
\end{itemize}

\vspace{2pt}

%----------------------------------------------------------------------------------------
%  CERTIFICATIONS
%----------------------------------------------------------------------------------------
\section{\textbf{Certifications}}
\vspace{4pt}

\begin{itemize}[nosep, after=\strut, leftmargin=1.2em, itemsep=6pt]
    \item \textbf{CERTIFICATION NAME} \href{CERT_URL}{(Certificate)}
\end{itemize}

\end{document}"""


@app.post("/generate-resume")
async def generate_resume(body: GenerateResumeRequest):
    """
    Functionality 2: Use Gemini to rewrite the full resume as LaTeX.

    If pdflatex is installed, compiles the LaTeX and returns a PDF
    (application/pdf).  Otherwise returns the LaTeX source as JSON
    {\"latex\": \"...\"}  so the frontend can offer a .tex download.
    """
    client = _gemini_client()
    parsed = body.parsed_resume

    # ── Build compact resume summary ──────────────────────────────────────
    exp_lines = []
    for e in parsed.experience:
        title = _get_str(e, "title")
        company = _get_str(e, "company")
        duration = _get_str(e, "duration")
        bullets = _get_list(e, "bullets")
        bullet_text = "\n".join(f"  - {b}" for b in bullets[:6])
        exp_lines.append(f"{title} at {company} ({duration})\n{bullet_text}")

    edu_lines = []
    for e in parsed.education:
        edu_lines.append(
            f"{_get_str(e, 'degree')}, {_get_str(e, 'institution')} ({_get_str(e, 'year')})"
        )

    proj_lines = []
    for p in parsed.projects:
        tech = _get_list(p, "tech_stack")
        proj_lines.append(
            f"{_get_str(p, 'title')}: {_get_str(p, 'description')} [{', '.join(tech)}]"
        )

    resume_summary = (
        f"Name: {parsed.name}\n"
        f"Email: {parsed.email}\n"
        f"Phone: {parsed.phone or 'N/A'}\n\n"
        f"Skills: {', '.join(parsed.skills[:20])}\n\n"
        f"Experience:\n{chr(10).join(exp_lines[:5])}\n\n"
        f"Education:\n{chr(10).join(edu_lines[:3])}\n\n"
        f"Projects:\n{chr(10).join(proj_lines[:4])}\n\n"
        f"Certifications: {', '.join(parsed.certifications[:5])}"
    )

    role = body.target_role or "a suitable professional role"
    suggestions_text = "\n".join(f"- {s}" for s in body.suggestions[:8])
    weak_text = ", ".join(body.weak_areas[:5])

    # ── Prompt ────────────────────────────────────────────────────────────
    prompt = (
        f"TARGET ROLE: {role}\n\n"
        f"CANDIDATE DATA:\n{resume_summary}\n\n"
        f"WEAK AREAS TO FIX: {weak_text}\n\n"
        f"IMPROVEMENT SUGGESTIONS:\n{suggestions_text}\n\n"
        f"Fill in the LaTeX template below with the candidate's REAL data only.\n"
        f"Tailor every bullet point and skill for the TARGET ROLE: {role}.\n"
        f"Prioritise keywords and achievements most relevant to {role}.\n\n"
        f"STRICT RULES:\n"
        f"1. Response MUST start with \\documentclass — nothing before it.\n"
        f"2. Do NOT use markdown fences (no ```).\n"
        f"3. Do NOT invent employers, degrees, or dates not in the candidate data.\n"
        f"4. Rewrite bullets with strong action verbs and quantified impact.\n"
        f"5. Escape special chars: & → \\&  # → \\#  % → \\%  $ → \\$  _ → \\_\n"
        f"6. Keep ALL \\usepackage lines and document structure exactly as in the template.\n"
        f"7. Output ONLY the complete .tex file — nothing else.\n\n"
        f"TEMPLATE:\n{_LATEX_SCAFFOLD}"
    )

    system_prompt = (
        f"You are an expert LaTeX resume writer specialising in {role} roles. "
        f"You produce ATS-optimised, professionally formatted LaTeX resumes using the provided template. "
        f"Output ONLY raw LaTeX starting with \\documentclass. "
        f"Never output markdown, explanations, or any text outside the LaTeX document. "
        f"Tailor all content specifically for a {role} position."
    )

    try:
        response = client.models.generate_content(
            model=_gemini_model_id(),
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=8192,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini request failed: {exc}") from exc

    latex_text = (response.text or "").strip()

    # ── Cleanup: strip fences and junk before \documentclass ──────────────
    latex_text = _re.sub(r"```[a-zA-Z]*\n?", "", latex_text).strip()
    latex_text = _re.sub(r"```", "", latex_text).strip()

    doc_idx = latex_text.find(r"\documentclass")
    if doc_idx > 0:
        latex_text = latex_text[doc_idx:]

    end_idx = latex_text.rfind(r"\end{document}")
    if end_idx != -1:
        latex_text = latex_text[: end_idx + len(r"\end{document}")]

    if not latex_text or r"\documentclass" not in latex_text:
        raise HTTPException(
            status_code=500,
            detail="Model did not return valid LaTeX. Please try again.",
        )

    # ── Try pdflatex compilation ──────────────────────────────────────────
    if _is_pdflatex_available():
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tex_path = os.path.join(tmpdir, "resume.tex")
                pdf_path = os.path.join(tmpdir, "resume.pdf")

                with open(tex_path, "w", encoding="utf-8") as f:
                    f.write(latex_text)

                subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                    capture_output=True,
                    timeout=60,
                    cwd=tmpdir,
                )

                if os.path.exists(pdf_path):
                    upload_dir = os.getenv("UPLOAD_DIR", "./temp_uploads")
                    out_pdf = os.path.join(upload_dir, f"generated_{uuid4()}.pdf")
                    import shutil
                    shutil.copy2(pdf_path, out_pdf)
                    name_slug = (parsed.name or "resume").replace(" ", "_")
                    return FileResponse(
                        path=out_pdf,
                        media_type="application/pdf",
                        filename=f"{name_slug}_improved.pdf",
                    )
        except Exception:
            pass  # fall through to LaTeX source fallback

    # ── Fallback: return LaTeX source ─────────────────────────────────────
    return GenerateResumeResponse(latex=latex_text)


@app.post("/feedback/caveman", response_model=CavemanFeedbackResponse)
async def caveman_feedback(body: CavemanFeedbackRequest) -> CavemanFeedbackResponse:
    client = _gemini_client()
    try:
        response = client.models.generate_content(
            model=_gemini_model_id(),
            contents=body.feedback,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Rewrite this in caveman language. Keep all the technical advice but make it sound "
                    "like a caveman wrote it. Use words like UGG, SMASH, FIRE, BIG BRAIN, etc."
                ),
                max_output_tokens=4096,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Caveman rewrite failed: {exc}") from exc
    return CavemanFeedbackResponse(caveman_feedback=(response.text or "").strip())


@app.post("/generate-resume-v2")
async def generate_resume_v2(body: GenerateResumeV2Request):
    db = _firestore_client()
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore unavailable")
    doc = db.collection("analyses").document(body.analysisId).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Analysis not found")
    analysis = doc.to_dict() or {}
    parsed = analysis.get("parsedResume") or {}
    parsed_text = _build_resume_text(parsed)

    try:
        extracted_raw = await _mcp_call_tool("extract_resume_json", {"parsed_text": parsed_text})
        extracted = json.loads(extracted_raw)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"JSON extraction failed: {exc}") from exc

    latex_text = _render_latex_from_json(extracted, body.targetRole)
    overleaf_link = "https://www.overleaf.com/docs?snip_uri=" + base64.urlsafe_b64encode(
        latex_text.encode("utf-8")
    ).decode("ascii")

    pdf_b64 = None
    if _is_pdflatex_available():
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tex_path = os.path.join(tmpdir, "resume.tex")
                pdf_path = os.path.join(tmpdir, "resume.pdf")
                with open(tex_path, "w", encoding="utf-8") as f:
                    f.write(latex_text)
                subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                    capture_output=True,
                    timeout=60,
                    cwd=tmpdir,
                    check=False,
                )
                if os.path.exists(pdf_path):
                    with open(pdf_path, "rb") as fh:
                        pdf_b64 = base64.b64encode(fh.read()).decode("ascii")
        except Exception:
            pdf_b64 = None

    return {
        "analysisId": body.analysisId,
        "targetRole": body.targetRole,
        "extractedJson": extracted,
        "latex": latex_text,
        "pdfBase64": pdf_b64,
        "overleafUrl": overleaf_link,
        "pdfAvailable": bool(pdf_b64),
    }



# ---------------------------------------------------------------------------
# Endpoint — Generate resume directly from GitHub profile
# ---------------------------------------------------------------------------

class GitHubResumeRequest(BaseModel):
    github_token: str
    target_role: str = ""


@app.post("/github-resume")
async def github_resume(body: GitHubResumeRequest):
    """
    1. Fetch GitHub profile, top repos, and language stats via the GitHub REST API.
    2. Feed the structured data to Gemini.
    3. Return LaTeX source (or compiled PDF if pdflatex is available).
    """
    import urllib.request as _urllib_req
    import urllib.error as _urllib_err

    token = body.github_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="github_token is required.")

    headers_gh = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ResumeIQ/1.0",
    }

    def _gh_get(url: str) -> Any:
        req = _urllib_req.Request(url, headers=headers_gh)
        try:
            with _urllib_req.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except _urllib_err.HTTPError as exc:
            raise HTTPException(
                status_code=exc.code,
                detail=f"GitHub API error for {url}: {exc.reason}",
            ) from exc

    # ── 1. Basic profile ─────────────────────────────────────────────────
    profile = _gh_get("https://api.github.com/user")
    username: str = profile.get("login", "")
    full_name: str = profile.get("name") or username
    email: str = profile.get("email") or ""
    bio: str = profile.get("bio") or ""
    location: str = profile.get("location") or ""
    blog: str = profile.get("blog") or ""
    company: str = profile.get("company") or ""
    public_repos: int = profile.get("public_repos", 0)
    followers: int = profile.get("followers", 0)

    # ── 2. Top repos (most starred, non-fork) ────────────────────────────
    repos_raw = _gh_get(
        f"https://api.github.com/users/{username}/repos"
        f"?sort=stars&direction=desc&per_page=30&type=owner"
    )
    repos = [r for r in repos_raw if not r.get("fork")][:12]

    # ── 3. Language breakdown across top repos ───────────────────────────
    lang_bytes: dict[str, int] = {}
    for repo in repos[:8]:
        try:
            langs = _gh_get(f"https://api.github.com/repos/{username}/{repo['name']}/languages")
            for lang, b in langs.items():
                lang_bytes[lang] = lang_bytes.get(lang, 0) + b
        except Exception:
            pass
    top_langs = sorted(lang_bytes, key=lang_bytes.get, reverse=True)[:8]  # type: ignore[arg-type]

    # ── 4. Org memberships ───────────────────────────────────────────────
    try:
        orgs = [o.get("login", "") for o in _gh_get("https://api.github.com/user/orgs")[:5]]
    except Exception:
        orgs = []

    # ── 5. Build summary text for Gemini ─────────────────────────────────
    repo_lines = []
    for r in repos[:10]:
        desc = (r.get("description") or "").strip()
        stars = r.get("stargazers_count", 0)
        lang  = r.get("language") or ""
        repo_lines.append(
            f"- {r['name']} ({lang}) ★{stars}"
            + (f": {desc}" if desc else "")
        )

    github_summary = (
        f"GitHub Username: {username}\n"
        f"Full Name: {full_name}\n"
        f"Email: {email}\n"
        f"Location: {location}\n"
        f"Bio: {bio}\n"
        f"Company / Affiliation: {company}\n"
        f"Blog / Portfolio: {blog}\n"
        f"Public Repos: {public_repos}  |  Followers: {followers}\n"
        f"Organisations: {', '.join(orgs) or 'None'}\n\n"
        f"Primary Languages: {', '.join(top_langs)}\n\n"
        f"Top Repositories:\n" + "\n".join(repo_lines)
    )

    role = body.target_role or "Software Engineer"

    # ── 6. Gemini — generate LaTeX ────────────────────────────────────────
    client = _gemini_client()

    prompt = (
        f"TARGET ROLE: {role}\n\n"
        f"GITHUB PROFILE DATA:\n{github_summary}\n\n"
        "Generate a complete, professional ATS-optimised LaTeX resume for this developer.\n"
        "Rules:\n"
        "1. Start ONLY with \\documentclass — no markdown, no backtick fences.\n"
        "2. Use sections: Contact, Summary, Skills, Projects (from GitHub repos), "
        "   Experience (infer from org + bio + company), Education (infer if possible), Achievements.\n"
        "3. For Projects: list the top 4-6 repos with a 2-line description and the tech stack.\n"
        "4. Tailor every bullet and skill for the target role.\n"
        "5. Escape LaTeX specials: & → \\& # → \\# % → \\% $ → \\$ _ → \\_\n"
        "6. Use the same document style as below (geometry, titlesec, enumitem, fontawesome5, hyperref).\n"
        "7. Output ONLY the complete .tex file — nothing else.\n\n"
        "Use this LaTeX skeleton for styling:\n"
        r"""\documentclass[10pt,a4paper]{article}
\usepackage[scale=0.93,top=0.6cm,bottom=0.6cm]{geometry}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fontawesome5}
\usepackage{parskip}
\pagestyle{empty}
\titleformat{\section}{\large\scshape\raggedright}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{6pt}{4pt}
\begin{document}
% ... fill in all sections ...
\end{document}"""
    )

    try:
        response = client.models.generate_content(
            model=_gemini_model_id(),
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    f"You are an expert LaTeX resume writer for {role} roles. "
                    "Output ONLY raw LaTeX starting with \\documentclass. "
                    "Never output markdown or any text outside the LaTeX document."
                ),
                max_output_tokens=8192,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gemini error: {exc}") from exc

    latex_text = (response.text or "").strip()
    latex_text = _re.sub(r"```[a-zA-Z]*\n?", "", latex_text).strip()
    latex_text = _re.sub(r"```", "", latex_text).strip()
    doc_idx = latex_text.find(r"\documentclass")
    if doc_idx > 0:
        latex_text = latex_text[doc_idx:]
    end_idx = latex_text.rfind(r"\end{document}")
    if end_idx != -1:
        latex_text = latex_text[: end_idx + len(r"\end{document}")]

    if not latex_text or r"\documentclass" not in latex_text:
        raise HTTPException(status_code=500, detail="Model did not return valid LaTeX. Try again.")

    # ── 7. Try pdflatex ───────────────────────────────────────────────────
    if _is_pdflatex_available():
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tex_path = os.path.join(tmpdir, "resume.tex")
                pdf_path = os.path.join(tmpdir, "resume.pdf")
                with open(tex_path, "w", encoding="utf-8") as f:
                    f.write(latex_text)
                subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                    capture_output=True, timeout=60, cwd=tmpdir,
                )
                if os.path.exists(pdf_path):
                    import shutil as _shutil
                    upload_dir = os.getenv("UPLOAD_DIR", "./temp_uploads")
                    out_pdf = os.path.join(upload_dir, f"github_resume_{uuid4()}.pdf")
                    _shutil.copy2(pdf_path, out_pdf)
                    name_slug = full_name.replace(" ", "_") or "github_resume"
                    return FileResponse(
                        path=out_pdf,
                        media_type="application/pdf",
                        filename=f"{name_slug}_github_resume.pdf",
                    )
        except Exception:
            pass

    # ── 8. Fallback: return LaTeX + profile metadata ──────────────────────
    overleaf_url = (
        "https://www.overleaf.com/docs?snip_uri="
        + base64.urlsafe_b64encode(latex_text.encode()).decode("ascii")
    )
    return {
        "latex": latex_text,
        "overleafUrl": overleaf_url,
        "profile": {
            "name": full_name,
            "username": username,
            "email": email,
            "languages": top_langs,
            "topRepos": [r["name"] for r in repos[:6]],
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

