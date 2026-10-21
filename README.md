# JobProof

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![Node: 22+](https://img.shields.io/badge/node-22+-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org)

**JobProof** is a privacy-first, local evidence workspace for honest job applications. It connects actual source code from your repositories with the explicit requirements of a job posting. 

Instead of generating superficial "ATS match percentages" or hallucinated hiring probability scores, JobProof verifies whether your code actually implements what the employer asks for, cites the exact files and line numbers, and highlights the limitations that require an honest conversation during the interview.

---

## Key Features

### 1. Multi-LLM Provider Architecture
- **Native Support for 3 Top Providers (Latest 2026 Generation):**
  - **Google Gemini API:** Structured output via REST (`gemini-3.8-flash`, `gemini-3.8-flash-lite`, `gemini-3.7-flash`, `gemini-3.1-pro`).
  - **Anthropic Claude:** Official Anthropic SDK with Pydantic structured parsing (`claude-sonnet-5-5`, `claude-opus-5-5`, `claude-fable-5-1`, `claude-haiku-4-5`).
  - **OpenAI:** Official JSON schema structured completions (`gpt-6-sol`, `gpt-6-astra`, `gpt-6-luna`).
- **Flexible Model Configuration:** Automatic modern defaults per provider, with an optional custom model ID input in Settings.
- **In-App Settings & Key Management:** Secure local SQLite/`.env` persistence, live connection latency testers, and masked key previews.

### 2. Smart Project & Job Ingestion
- **GitHub Ingestion:** Supports shorthand `owner/repo` as well as full URLs.
- **Private Repository Access:** Configurable GitHub Personal Access Token (`GITHUB_TOKEN`) enables private repository analysis.
- **Local Directory Import:** Point to local folders on your machine for zero-network analysis.
- **Custom Exclusions:** Filter out unwanted files or directories (e.g. `docs, fixtures, temp, test`) per project.
- **Job Ingestion:** Paste text directly, fetch clean job descriptions from public URLs (`/job-postings/fetch-url`), or upload `.txt` / `.md` job posting files.

### 3. Evidence-Grounded Analysis & Verification
- **Verifiable Citations:** Every piece of evidence references the exact file path and line numbers within the immutable commit snapshot.
- **Four Clear Assessment States:**
  - `supported`: Concrete, relevant implementation evidenced in code.
  - `partially_supported`: Implemented partially, or accompanied by limitations.
  - `not_evidenced`: Absence of code evidence (explicitly not absence of skill).
  - `contradicted`: Disproven or conflicting implementation.
- **Strict Anti-Hallucination Rules:** Repository presence is never mistaken for production deployment, team communication, or years of employment.
- **Human-in-the-Loop Reviews:** Override or annotate conclusions with full audit trails without losing the original AI output.

### 4. Honest Candidate Tools
- **Evidence-Backed Cover Letter Generator:** Generates tailored, strictly honest markdown cover letters highlighting verified code achievements while acknowledging verified boundaries. Supports multiple tones (Balanced, Technical, Concise) in English, Catalan, or Spanish.
- **Interactive Mock Interview Simulator:** Multi-turn conversational practice that evaluates technical depth and honesty, questioning your real architecture decisions and deployment scope.

### 5. Privacy & Modern UI
- **Zero-Code Execution:** Imported repositories are **never executed** or evaluated in a runtime sandbox.
- **Automatic Secret Redaction:** Multi-line secrets, API keys (`sk-ant-*`, `AIza*`, `sk-proj-*`, `ghp_*`, `AKIA*`), and passwords are redacted prior to analysis.
- **Trilingual Internationalization:** Full interface support in **Catalan (`ca`)**, **English (`en`)**, and **Spanish (`es`)**.
- **Dark Mode:** Elegant, responsive interface with persistent theme toggle and mobile support (390px viewport certified).

---

## Quickstart

### Prerequisites
- **Python 3.12+** (CI runs 3.12)
- **Node.js 22+** and **pnpm**

### Quick Start (One Command)

After cloning the repository, simply run:

```bash
# Automatically sets up dependencies and launches both backend and frontend:
./run.sh
```

Or run the setup and servers individually:

```bash
# Automated environment & database setup:
./setup.sh

# Or start services directly:
./scripts/start-backend.sh   # Terminal 1 (Backend: http://127.0.0.1:8000)
./scripts/start-frontend.sh  # Terminal 2 (Frontend: http://127.0.0.1:5173)
```

Open JobProof at **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. In the UI, click **⚡ Setup & Run** to load sample projects and verify the entire evidence pipeline with 1 click!

---

## Docker Deployment

JobProof includes a production-ready, multi-stage `Dockerfile`:

```bash
# Build the Docker image
docker build -t jobproof .

# Run the container
docker run -p 127.0.0.1:8000:8000 \
  -e GEMINI_API_KEY="your-gemini-key" \
  -v jobproof-data:/data \
  jobproof
```

Keep the port bound to `127.0.0.1`: a normal (non-hosted) instance has no authentication and must not be reachable from other machines. The database lives in the `jobproof-data` volume (`/data/jobproof.db`) and the container runs as a non-root user.

Access the single-container app at `http://localhost:8000`.

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API Key | `""` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | `""` |
| `OPENAI_API_KEY` | OpenAI API Key | `""` |
| `LLM_PROVIDER` | Preferred provider: `gemini`, `anthropic`, or `openai` | Auto-detected |
| `LLM_MODEL` | Custom model ID override | Provider default |
| `GITHUB_TOKEN` | Personal Access Token for private repos & 5k req/hr | `""` |
| `DATABASE_URL` | SQLite database URI | `sqlite:///./jobproof.db` |
| `STATIC_DIR` | Path to production built frontend assets | `""` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Localhost defaults |
| `HOSTED_MODE` | `true` runs a locked-down public demo (see below) | `false` |
| `HOSTED_WRITE_LIMIT_PER_MIN` | Write requests allowed per client per minute in hosted mode | `60` |
| `HOSTED_BYOK` | With hosted mode: private per-visitor workspaces and bring-your-own AI key | `false` |
| `WORKSPACE_TTL_HOURS` | Hours before a visitor workspace is deleted | `24` |
| `WORKSPACE_MAX_PROJECTS` / `_JOBS` / `_ANALYSES` | Per-visitor quotas | `3` / `5` / `5` |
| `TRIAL_DAILY_CALLS` | AI calls per day visitors without a key may use on the server's Gemini key (`0` disables) | `0` |
| `TRIAL_WORKSPACE_CALLS` / `TRIAL_UNTIL` | Per-visitor trial calls per day / expiry date (`YYYY-MM-DD`) | `40` / none |

*Note: All API keys and settings can be conveniently managed directly from the in-app **Settings** screen.*

---

## Running it

JobProof is a single-user tool that you run on your own computer; there is no public live demo. It has no accounts, so do not expose a normal instance to the internet.

If you ever do publish an instance, set `HOSTED_MODE=true` first. It locks the backend down to the fictional fixtures (no imports, no settings, no real AI, rate limited, strict `ALLOWED_ORIGINS`), and `HOSTED_BYOK=true` adds private per-visitor workspaces with bring-your-own AI keys. What this does and does not protect against is in [`docs/security.md`](docs/security.md).

To use JobProof with your own repositories, job postings and API keys, run it locally. See [`docs/security.md`](docs/security.md).

---

## Quality Assurance & Verification

JobProof is continuously tested with high-coverage unit, contract, and browser test suites:

```bash
# 1. Backend tests & linters 
.venv/bin/pytest backend/tests
.venv/bin/ruff check backend
.venv/bin/ruff format --check backend

# 2. Frontend typecheck & i18n unit tests
pnpm --dir frontend test
pnpm --dir frontend build

# 3. Playwright browser end-to-end tests (5 tests)
pnpm --dir frontend e2e
```

---

## Architecture

```text
GitHub / Local Folders → Commit Snapshot → Secret Redaction & Chunking → Line Chunks
                                                                            ↓
Job Posting (URL / File / Text) → Structured Requirement Extraction → BM25 Search
                                                                            ↓
                                                                AI Provider Assessment
                                                                            ↓
                                                              Citation Verification Loop
                                                                            ↓
                                                             Durable SQLite Report Store
                                                                            ↓
                                                            Human Review & Evidence Audit
                                                                            ↓
                                                    Markdown / JSON Export & AI Tools
```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Security

Report vulnerabilities privately (see [`SECURITY.md`](SECURITY.md)). What the project does and does not protect against, including hosted mode, is documented in [`docs/security.md`](docs/security.md).
