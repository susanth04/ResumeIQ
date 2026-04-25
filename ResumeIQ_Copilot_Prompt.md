# ResumeIQ AI — Copilot Structured Prompt

---

## SYSTEM CONTEXT

You are an expert full-stack AI engineer. Your task is to build **ResumeIQ AI**, an intelligent resume analyzer system. The system accepts resume uploads, parses and scores them using deterministic tools, and uses an LLM agent (via MCP) to generate structured feedback and improvement suggestions.

Build the complete project end-to-end: backend, MCP tool definitions, LLM agent orchestration, Pydantic schemas, and a minimal frontend.

---

## PROJECT GOAL

> Users upload a resume (PDF or DOCX). The system parses it, scores it across multiple dimensions, and returns section-by-section AI feedback with actionable improvement suggestions.

---

## TECH STACK

| Layer              | Technology                              |
|--------------------|------------------------------------------|
| Backend Framework  | FastAPI (Python 3.11+)                  |
| File Parsing       | `pdfminer.six`, `python-docx`, `spaCy`  |
| LLM Orchestration  | MCP (Model Context Protocol)            |
| LLM Model          | Claude claude-sonnet-4-20250514 via Anthropic API      |
| Data Validation    | Pydantic v2                             |
| Frontend           | React + Tailwind CSS                    |
| Storage            | Local filesystem (temp uploads)         |
| Environment Config | `python-dotenv`                         |

---

## FOLDER STRUCTURE

Generate the project with the following structure:

```
resumeiq/
├── main.py                        # FastAPI app entry point
├── requirements.txt               # All dependencies
├── .env.example                   # Environment variable template
│
├── tools/
│   ├── __init__.py
│   ├── parser.py                  # parse_resume() tool
│   └── scorer.py                  # score_resume() tool
│
├── agent/
│   ├── __init__.py
│   └── feedback_agent.py          # MCP LLM orchestration logic
│
├── models/
│   ├── __init__.py
│   └── schemas.py                 # All Pydantic models
│
├── utils/
│   ├── __init__.py
│   └── file_handler.py            # File save/read/cleanup utilities
│
└── frontend/
    ├── index.html
    ├── App.jsx
    └── components/
        ├── UploadCard.jsx
        ├── ScoreDashboard.jsx
        └── FeedbackPanel.jsx
```

---

## PYDANTIC SCHEMAS (`models/schemas.py`)

Define the following models:

```python
# Parsed resume structure
class ParsedResume(BaseModel):
    name: str
    email: str
    phone: Optional[str]
    skills: List[str]
    experience: List[ExperienceEntry]   # title, company, duration, bullets[]
    education: List[EducationEntry]     # degree, institution, year
    projects: List[ProjectEntry]        # title, description, tech_stack[]
    certifications: Optional[List[str]]

# Score breakdown
class ScoreBreakdown(BaseModel):
    skills_completeness: int            # 0–100
    experience_clarity: int             # 0–100
    ats_keyword_density: int            # 0–100
    formatting_quality: int             # 0–100
    education_relevance: int            # 0–100
    total_score: int                    # weighted average

# Full analysis result
class ResumeAnalysisResult(BaseModel):
    id: str                             # UUID
    parsed: ParsedResume
    scores: ScoreBreakdown
    weak_areas: List[str]
    feedback: str                       # markdown string from LLM
    suggestions: List[str]             # bullet list of improvements
```

---

## TOOL 1 — `parse_resume()` (`tools/parser.py`)

### Signature
```python
def parse_resume(file_path: str) -> ParsedResume:
```

### Behavior
- Detect file type (`.pdf` or `.docx`) from extension
- For PDF: use `pdfminer.six` to extract raw text
- For DOCX: use `python-docx` to extract paragraphs
- Use `spaCy` (`en_core_web_sm`) for Named Entity Recognition:
  - Extract PERSON → name
  - Extract EMAIL via regex
  - Extract PHONE via regex
- Use rule-based section detection with keywords:
  - `SKILLS`, `EXPERIENCE`, `EDUCATION`, `PROJECTS`, `CERTIFICATIONS`
- Parse each section into its corresponding Pydantic model
- Return a fully populated `ParsedResume` object

### Error Handling
- Raise `ValueError` if file type is unsupported
- Raise `RuntimeError` if text extraction fails
- Return empty lists (not None) for missing sections

---

## TOOL 2 — `score_resume()` (`tools/scorer.py`)

### Signature
```python
def score_resume(parsed: ParsedResume) -> ScoreBreakdown:
```

### Scoring Logic

| Dimension             | Weight | Logic |
|-----------------------|--------|-------|
| Skills Completeness   | 25%    | Count of skills / 20 (capped at 100) |
| Experience Clarity    | 30%    | % of bullet points with action verbs + numbers |
| ATS Keyword Density   | 20%    | Match against a standard ATS keyword list |
| Formatting Quality    | 10%    | Presence of all major sections |
| Education Relevance   | 15%    | Degree level scoring (PhD=100, BTech=70, etc.) |

### Behavior
- Compute each sub-score independently
- Calculate `total_score` as weighted average
- Populate `weak_areas` list with dimensions scoring below 60
- Return `ScoreBreakdown` object

### ATS Keyword List (built-in)
Include at minimum: `Python, Machine Learning, API, REST, SQL, Docker, Git, AWS, FastAPI, NLP, Deep Learning, TensorFlow, PyTorch, Agile, CI/CD`

---

## MCP AGENT — `feedback_agent.py` (`agent/feedback_agent.py`)

### Purpose
Orchestrate the LLM to call `parse_resume` and `score_resume` as MCP tools, then generate natural language feedback.

### MCP Tool Definitions
Register both tools with MCP:

```python
tools = [
    {
        "name": "parse_resume",
        "description": "Parses a resume file and returns structured JSON with name, email, skills, experience, education, and projects.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Absolute path to the uploaded resume file"}
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "score_resume",
        "description": "Scores a parsed resume across 5 dimensions: skills, experience clarity, ATS keywords, formatting, and education. Returns numeric scores and weak areas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "parsed_resume": {"type": "object", "description": "The ParsedResume JSON object returned by parse_resume"}
            },
            "required": ["parsed_resume"]
        }
    }
]
```

### System Prompt for LLM

```
You are ResumeIQ, an expert resume analyst and career coach. You have access to two tools:
1. parse_resume — extracts structured data from a resume file
2. score_resume — scores the parsed resume across 5 dimensions

Your job:
1. Call parse_resume() with the provided file path
2. Call score_resume() with the parsed result
3. Based on the scores and parsed content, generate:
   - A section-by-section analysis (Skills, Experience, Education, Projects)
   - Specific rewrites for weak bullet points
   - A prioritized list of 5–7 actionable improvement suggestions
   - Keywords the candidate should add for ATS optimization
   
Format your response in clean Markdown with headers for each section.
Be specific, constructive, and actionable. Do not be generic.
```

### Agentic Loop
- Implement a `while` loop that:
  1. Sends messages to LLM
  2. Checks if response contains `tool_use` blocks
  3. Executes the corresponding local tool function
  4. Appends `tool_result` to message history
  5. Continues until LLM returns a final `text` response
- Return the final markdown feedback string

---

## FASTAPI ROUTES (`main.py`)

### `POST /upload`
```
Input:  multipart/form-data — resume file (PDF or DOCX)
        Optional query param: target_role (str)
Process: Save file → run agent → return full analysis
Output: ResumeAnalysisResult JSON
```

### `GET /result/{id}`
```
Input:  UUID string
Output: Cached ResumeAnalysisResult JSON (store in-memory dict)
Error:  404 if ID not found
```

### `POST /improve`
```
Input:  JSON { "section": "experience", "content": "...", "target_role": "..." }
Process: Send section to LLM for targeted rewrite only
Output: { "rewritten": "..." }
```

### CORS
Enable CORS for `http://localhost:3000` (React dev server).

---

## FRONTEND (`frontend/`)

### `UploadCard.jsx`
- Drag-and-drop file upload zone
- Accept `.pdf` and `.docx` only
- Show file name + size after selection
- Submit button → calls `POST /upload`
- Show loading spinner during analysis

### `ScoreDashboard.jsx`
- Display total score as a large circular progress ring
- Show 5 sub-scores as horizontal bar charts
- Color code: green (≥80), yellow (60–79), red (<60)
- List weak areas as tags

### `FeedbackPanel.jsx`
- Render LLM markdown feedback using `react-markdown`
- Collapsible sections per resume section
- "Copy" button per suggestion
- "Improve This Section" button → calls `POST /improve`

---

## REQUIREMENTS.TXT

```
fastapi
uvicorn
python-multipart
pdfminer.six
python-docx
spacy
anthropic
pydantic>=2.0
python-dotenv
uuid
```

Also include: `python -m spacy download en_core_web_sm` as a setup instruction in README.

---

## .ENV.EXAMPLE

```
ANTHROPIC_API_KEY=your_api_key_here
UPLOAD_DIR=./temp_uploads
MAX_FILE_SIZE_MB=5
```

---

## ERROR HANDLING REQUIREMENTS

- All routes must return proper HTTP status codes (400, 404, 422, 500)
- File size validation: reject files > 5MB
- File type validation: reject non-PDF/DOCX
- LLM timeout: set 30s timeout on Anthropic API calls
- Wrap all tool executions in try/except and return descriptive errors

---

## ADDITIONAL INSTRUCTIONS FOR COPILOT

1. Generate ALL files completely — no placeholders or `# TODO` comments
2. Use `async def` for all FastAPI route handlers
3. Use `uuid4()` to generate result IDs
4. Store results in an in-memory dict `results_store: dict[str, ResumeAnalysisResult]`
5. Add docstrings to all functions
6. Follow PEP8 formatting throughout
7. The MCP agentic loop must handle multi-turn tool use correctly
8. Frontend must be functional with real API calls to `http://localhost:8000`
9. Include a `README.md` with setup steps, run commands, and example curl requests
