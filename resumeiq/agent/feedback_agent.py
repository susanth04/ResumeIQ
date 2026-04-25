"""
Orchestrate Gemini with parse_resume and score_resume as callable tools.

Implements a multi-turn tool loop until the model returns final Markdown feedback.
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Tuple

from google import genai
from google.genai import types

from models.schemas import ParsedResume
from tools.parser import parse_resume
from tools.scorer import score_resume

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

GEMINI_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="parse_resume",
                description=(
                    "Parses a resume file and returns structured JSON with name, email, "
                    "skills, experience, education, and projects."
                ),
                parameters_json_schema={
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Absolute path to the uploaded resume file",
                        }
                    },
                    "required": ["file_path"],
                },
            ),
            types.FunctionDeclaration(
                name="score_resume",
                description=(
                    "Scores a parsed resume across 5 dimensions: skills, experience clarity, "
                    "ATS keywords, formatting, and education. Returns numeric scores."
                ),
                parameters_json_schema={
                    "type": "object",
                    "properties": {
                        "parsed_resume": {
                            "type": "object",
                            "description": "The ParsedResume JSON object returned by parse_resume",
                        }
                    },
                    "required": ["parsed_resume"],
                },
            ),
        ]
    )
]

SYSTEM_PROMPT = """You are ResumeIQ, an expert resume analyst. You MUST use these tools in order before writing anything for the user:
1. parse_resume — reads the file and returns structured resume data (JSON).
2. score_resume — takes that parsed JSON and returns numeric scores (0–100) for five quality areas.

After both tools have run, write your analysis for the candidate in **plain, easy-to-read English**.
Assume they are smart but not HR experts: briefly explain any jargon (e.g. one short line on what "ATS" means: applicant tracking systems that scan resumes for keywords).

**How to write (required style):**
- Use short paragraphs and `##` section headers. Prefer bullets where it helps scanning.
- For every major point, make the **reason** obvious: say *what* is wrong or right, *why* it matters to a recruiter, and *what to do next*.
- Tie comments to **concrete details** from their resume (job titles, skills listed, bullets you saw)—never vague praise or generic advice.
- When you suggest a rewrite, show a **before → after** example for at least one weak bullet where possible.
- Keep a calm, constructive tone.

**Sections to include (in this order), each with `##` headers:**
1. **Quick summary** — 3–5 bullets: overall strengths, biggest gaps, and how the scores fit together in one sentence each.
2. **Skills** — what is strong, what is missing or buried, and which keywords matter for ATS.
3. **Experience** — clarity of roles, impact (numbers/action verbs), and bullet-level fixes.
4. **Education & projects** — relevance and how to frame them if thin.
5. **ATS & keywords** — a short list of terms to add or surface (and why).
6. **Weak bullets to rewrite** — specific examples with suggested replacements.

End with a section titled exactly:
## Actionable Suggestions
Then a **numbered** list of 5–7 concrete next steps (one clear action per line)."""


def _execute_tool(name: str, tool_input: Dict[str, Any]) -> str:
    """Run local tool implementations and return JSON strings for the model."""
    if name == "parse_resume":
        path = tool_input.get("file_path")
        if not path:
            return '{"error": "file_path is required"}'
        try:
            parsed = parse_resume(path)
            return parsed.model_dump_json()
        except Exception as exc:
            return f'{{"error": "{str(exc)}"}}'
    if name == "score_resume":
        raw = tool_input.get("parsed_resume")
        if raw is None:
            return '{"error": "parsed_resume is required"}'
        try:
            if isinstance(raw, str):
                parsed = ParsedResume.model_validate_json(raw)
            else:
                parsed = ParsedResume.model_validate(raw)
            scores = score_resume(parsed)
            return scores.model_dump_json()
        except Exception as exc:
            return f'{{"error": "{str(exc)}"}}'
    return '{"error": "unknown tool"}'


def _extract_suggestions(markdown: str) -> List[str]:
    """Pull numbered or bulleted items under 'Actionable Suggestions' if present."""
    suggestions: List[str] = []
    lower = markdown.lower()
    idx = lower.find("actionable suggestions")
    if idx == -1:
        return _fallback_bullets(markdown)
    section = markdown[idx:]
    for line in section.splitlines()[1:]:
        line = line.strip()
        if not line:
            if suggestions:
                break
            continue
        m = re.match(r"^(?:\d+[\.)]\s*|[-*]\s+)(.+)", line)
        if m:
            suggestions.append(m.group(1).strip())
        elif line.startswith("#"):
            break
        elif suggestions and line[0].isalpha():
            break
    return suggestions[:10] if suggestions else _fallback_bullets(markdown)


def _fallback_bullets(text: str) -> List[str]:
    """Collect bullet lines from the tail of the response."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    out: List[str] = []
    for ln in lines:
        m = re.match(r"^[-*]\s+(.+)", ln)
        if m:
            out.append(m.group(1).strip())
    return out[:7]


def _gemini_client() -> genai.Client:
    """Build a Gemini client with a 30s HTTP timeout (milliseconds)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=30_000),
    )


def run_feedback_agent(file_path: str) -> str:
    """
    Run the tool-using agent until the model returns final Markdown feedback.

    Args:
        file_path: Absolute path to the resume on disk.

    Returns:
        Markdown string from the assistant.
    """
    client = _gemini_client()
    model_id = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    user_text = (
        f"Analyze the resume at this absolute file path. Call tools as needed.\n\n"
        f"FILE_PATH: {file_path}"
    )

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=GEMINI_TOOLS,
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(
                mode=types.FunctionCallingConfigMode.AUTO,
            )
        ),
        max_output_tokens=8192,
    )

    history: List[types.Content] = [
        types.Content(role="user", parts=[types.Part(text=user_text)]),
    ]
    last_text = ""

    for _ in range(20):
        resp = client.models.generate_content(
            model=model_id,
            contents=history,
            config=config,
        )

        if not resp.candidates:
            break

        cand = resp.candidates[0]
        if not cand.content or not cand.content.parts:
            break

        parts = list(cand.content.parts)
        text_here = "".join(p.text or "" for p in parts if p.text)
        if text_here:
            last_text = text_here

        fcalls = [p.function_call for p in parts if p.function_call]
        if not fcalls:
            return last_text or text_here or "Analysis could not be completed."

        history.append(cand.content)

        fr_parts: List[types.Part] = []
        for fc in fcalls:
            if not fc or not fc.name:
                continue
            args = dict(fc.args or {})
            payload = _execute_tool(fc.name, args)
            fr_parts.append(
                types.Part(
                    function_response=types.FunctionResponse(
                        name=fc.name,
                        id=fc.id,
                        response={"output": payload},
                    )
                )
            )

        if not fr_parts:
            return last_text or "Tool call could not be executed."

        history.append(types.Content(role="user", parts=fr_parts))

    return last_text or "Analysis stopped after maximum tool rounds."


def run_feedback_agent_with_suggestions(file_path: str) -> Tuple[str, List[str]]:
    """
    Run the agent and derive structured suggestion strings from the Markdown.

    Returns:
        Tuple of (feedback_markdown, suggestions).
    """
    md = run_feedback_agent(file_path)
    suggestions = _extract_suggestions(md)
    return md, suggestions
