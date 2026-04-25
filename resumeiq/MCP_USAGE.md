# MCP Usage

## Claude Desktop (stdio)

1. Start ResumeIQ MCP server with stdio:
   - `python mcp_server.py`
2. Add to Claude Desktop MCP config:
   - command: `python`
   - args: `["mcp_server.py"]`
   - cwd: your `resumeiq` project folder
3. Claude can now call `parse_resume`, `score_resume`, `generate_feedback`, and `extract_resume_json`.

## ResumeIQ backend via SSE

1. Start MCP server in SSE mode:
   - `python mcp_server.py --sse --port 8001`
2. Set backend env:
   - `MCP_SERVER_URL=http://localhost:8001/sse`
3. In `main.py`, `/upload` orchestrates:
   - `parse_resume` -> `score_resume` -> `generate_feedback`
4. In `/generate-resume-v2`, backend calls:
   - `extract_resume_json`

This keeps the LLM pipeline auditable and modular, with MCP tools as the single execution surface.
