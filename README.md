# ResumeIQ AI

Intelligent resume analyzer: upload PDF or DOCX, get deterministic parsing and scoring, plus Gemini-powered Markdown feedback and section rewrites.

## Prerequisites

- Python 3.11+
- Node.js 18+ (for the React frontend)
- A [Google AI Studio](https://aistudio.google.com/apikey) Gemini API key (`GEMINI_API_KEY`)

## Backend setup

```bash
cd resumeiq
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`).

```bash
copy .env.example .env
```

Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend setup

```bash
cd resumeiq\frontend
npm install
npm run dev
```

The UI expects the API at `http://localhost:8000`. To use another origin, set `VITE_API_URL` in `frontend/.env`.

## Example API calls

Upload a resume (multipart):

```bash
curl -X POST "http://localhost:8000/upload?target_role=Data%20Scientist" ^
  -F "resume=@C:\path\to\resume.pdf"
```

Fetch a cached result:

```bash
curl http://localhost:8000/result/<uuid-from-upload-response>
```

Improve a section (JSON):

```bash
curl -X POST http://localhost:8000/improve ^
  -H "Content-Type: application/json" ^
  -d "{\"section\":\"experience\",\"content\":\"Your bullet text...\",\"target_role\":\"ML Engineer\"}"
```

## Project layout

- `main.py` — FastAPI routes and in-memory result cache
- `tools/parser.py` — PDF/DOCX text extraction and structured parsing
- `tools/scorer.py` — Weighted scoring dimensions
- `agent/feedback_agent.py` — Gemini tool loop (`parse_resume`, `score_resume`)
- `frontend/` — React + Vite + Tailwind UI

## Notes

- Uploads are stored under `UPLOAD_DIR` (default `./temp_uploads`), capped by `MAX_FILE_SIZE_MB` (default 5).
- Gemini HTTP requests use a 30-second timeout (`HttpOptions.timeout` in milliseconds).
- CORS allows `http://localhost:3000` for the Vite dev server.
