"""
ResumeIQ MCP Server
===================
Exposes the two core ResumeIQ tools via the Model Context Protocol (MCP)
using fastmcp so that any MCP-compatible LLM client (Claude Desktop, Cursor,
Copilot, etc.) can call them directly.

Run with:
    python mcp_server.py            # stdio transport (default)
    python mcp_server.py --sse      # SSE transport on http://localhost:8001/sse
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# ── Make sure project root is on path so tools/ and models/ are importable
ROOT = Path(__file__).parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv()

from fastmcp import FastMCP  # pip install fastmcp
from google import genai
from google.genai import types

from models.schemas import ParsedResume
from tools.parser import parse_resume as _parse_resume
from tools.scorer import score_resume as _score_resume, weak_areas_from_scores

# ── Create the MCP server instance
mcp = FastMCP(
    name="ResumeIQ",
    instructions=(
        "You are ResumeIQ, an expert resume analyst. "
        "Always call parse_resume first, then score_resume, then write detailed markdown feedback."
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1: parse_resume
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
def parse_resume(file_path: str) -> str:
    """
    Parse a resume file (PDF or DOCX) and return structured JSON.

    Extracts: name, email, phone, skills, experience (with bullets),
    education, projects, and certifications using pdfminer / python-docx
    and spaCy NER.

    Args:
        file_path: Absolute path to the uploaded resume file on disk.

    Returns:
        JSON string containing a ParsedResume object.
    """
    try:
        parsed = _parse_resume(file_path)
        return parsed.model_dump_json(indent=2)
    except FileNotFoundError as exc:
        return json.dumps({"error": f"File not found: {exc}"})
    except ValueError as exc:
        return json.dumps({"error": f"Unsupported file type: {exc}"})
    except RuntimeError as exc:
        return json.dumps({"error": f"Extraction failed: {exc}"})
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"error": str(exc)})


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2: score_resume
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
def score_resume(parsed_resume_json: str) -> str:
    """
    Score a parsed resume across 5 quality dimensions and return JSON.

    Dimensions (0–100):
      - skills_completeness   (25 % weight)
      - experience_clarity    (30 % weight)
      - ats_keyword_density   (20 % weight)
      - formatting_quality    (10 % weight)
      - education_relevance   (15 % weight)

    Also returns total_score (weighted average) and weak_areas (dimensions
    that scored below 60).

    Args:
        parsed_resume_json: JSON string of a ParsedResume object, as returned
                            by the parse_resume tool.

    Returns:
        JSON string containing ScoreBreakdown and weak_areas list.
    """
    try:
        parsed = ParsedResume.model_validate_json(parsed_resume_json)
        scores = _score_resume(parsed)
        weak = weak_areas_from_scores(scores)
        result = scores.model_dump()
        result["weak_areas"] = weak
        return json.dumps(result, indent=2)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"error": str(exc)})


@mcp.tool()
def generate_feedback(scores_json: str, target_role: str) -> str:
    """Generate markdown feedback and suggestions from score JSON."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return json.dumps({"error": "Missing GEMINI_API_KEY"})
    model_id = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=60_000))
    try:
        parsed = json.loads(scores_json)
        prompt = (
            f"Target role: {target_role or 'General'}\n"
            f"Scores JSON: {json.dumps(parsed, indent=2)}\n\n"
            "Write concise markdown feedback with these sections: "
            "## What is strong, ## What to improve, ## Priority actions. "
            "In Priority actions include 5-7 bullet suggestions."
        )
        res = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=4096),
        )
        return (res.text or "").strip()
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@mcp.tool()
def extract_resume_json(parsed_text: str) -> str:
    """Extract structured resume JSON for generation flow."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return json.dumps({"error": "Missing GEMINI_API_KEY"})
    model_id = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=60_000))
    prompt = (
        "Extract structured resume data as JSON only. Fields: name, email, phone, linkedin, github, "
        "summary (2 sentences), experience (array of {company, role, dates, bullets[3]}), "
        "projects (array of {name, tech, bullets[2]}), skills (array of strings), "
        "education (array of {degree, institution, year, gpa}). Return ONLY valid JSON, no markdown.\n\n"
        f"Resume text:\n{parsed_text}"
    )
    try:
        res = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="Return only valid JSON object and no explanation.",
                max_output_tokens=4096,
            ),
        )
        text = (res.text or "").strip()
        text = text.replace("```json", "").replace("```", "").strip()
        obj = json.loads(text)
        return json.dumps(obj)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ResumeIQ MCP Server")
    parser.add_argument(
        "--sse",
        action="store_true",
        help="Use SSE transport instead of stdio (for web clients)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8001,
        help="Port for SSE transport (default: 8001)",
    )
    args = parser.parse_args()

    if args.sse:
        print(f"[ResumeIQ MCP] Starting SSE server on http://localhost:{args.port}/sse")
        mcp.run(transport="sse", port=args.port)
    else:
        print("[ResumeIQ MCP] Starting stdio server…", file=sys.stderr)
        mcp.run(transport="stdio")
