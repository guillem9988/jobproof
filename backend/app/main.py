import html as html_lib
import json
import os
import re
import time
from contextlib import asynccontextmanager
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import Field

from . import tasks
from .core import (
    SERVER_DEFAULT_ANTHROPIC_KEY,
    SERVER_DEFAULT_GEMINI_KEY,
    SERVER_DEFAULT_GITHUB_TOKEN,
    SERVER_DEFAULT_OPENAI_KEY,
    Base,
    ChatMessage,
    CoverLetterRequest,
    GeneratedCoverLetter,
    InterviewChatReply,
    InterviewChatRequest,
    Requirement,
    Requirements,
    Schema,
    Status,
    all_records,
    engine,
    get,
    get_allowed_origins,
    get_effective_anthropic_key,
    get_effective_gemini_key,
    get_effective_github_token,
    get_effective_openai_key,
    normalize,
    now,
    save,
    settings,
    uid,
)
from .demo import load_demo
from .ingestion import FORBIDDEN_PREFIXES, GitHub, import_local_dir, parse_url
from .providers import PROMPT_VERSION, provider
from .retrieval import retrieve, validate_assessment

PIPELINE = "1.1"


def init_settings():
    try:
        cfg = get("config", kind="settings")
    except Exception:  # noqa: BLE001 - settings table may not exist yet on first boot
        return
    if cfg.get("anthropic_api_key") and not settings.anthropic_api_key:
        settings.anthropic_api_key = cfg["anthropic_api_key"]
    if cfg.get("gemini_api_key") and not settings.gemini_api_key:
        settings.gemini_api_key = cfg["gemini_api_key"]
    if cfg.get("openai_api_key") and not settings.openai_api_key:
        settings.openai_api_key = cfg["openai_api_key"]
    if cfg.get("llm_provider") and not settings.llm_provider:
        settings.llm_provider = cfg["llm_provider"]
    if cfg.get("llm_model") and (
        not settings.llm_model or settings.llm_model in ("claude-sonnet-4-6", "gpt-4o")
    ):
        settings.llm_model = cfg["llm_model"]
    if cfg.get("github_token") and not settings.github_token:
        settings.github_token = cfg["github_token"]


@asynccontextmanager
async def lifespan(app):
    try:
        Base.metadata.create_all(engine)
    except Exception:  # noqa: BLE001, S110 - tables may already exist or the DB may be read-only
        pass
    init_settings()
    tasks.recover()
    yield


app = FastAPI(title="JobProof local API", version=PIPELINE, lifespan=lifespan)
configured_origins = get_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in configured_origins else configured_origins,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def protect(request: Request, call_next):
    if request.method in {"POST", "PUT", "DELETE"}:
        origin = request.headers.get("origin")
        allowed = set(get_allowed_origins())
        if origin and "*" not in allowed and origin not in allowed:
            return JSONResponse({"error": {"code": "origin", "message": "Untrusted origin"}}, 403)
        body = await request.body()
        if len(body) > 300_000:
            return JSONResponse({"error": {"code": "size", "message": "Request exceeds 300 KB."}}, 413)
    return await call_next(request)


@app.exception_handler(ValueError)
async def value_error(request, exc):
    return JSONResponse({"error": {"code": "invalid_request", "message": str(exc)}}, 400)


class Document(Schema):
    id: str
    data: dict[str, Any]


def doc(row):
    return Document(id=row["id"], data={k: v for k, v in row.items() if k != "id"})


class Health(Schema):
    status: str
    real_provider_configured: bool
    active_provider: str = ""
    model: str
    demo_available: bool
    limits: dict[str, int]


@app.get("/health", response_model=Health)
@app.get("/api/v1/health", response_model=Health)
def health():
    eff_gemini = get_effective_gemini_key()
    eff_openai = get_effective_openai_key()
    eff_anthropic = get_effective_anthropic_key()

    pref = settings.llm_provider
    if not pref:
        if eff_gemini:
            pref = "gemini"
        elif eff_openai:
            pref = "openai"
        elif eff_anthropic:
            pref = "anthropic"
        else:
            pref = "gemini"

    active = ""
    if pref == "gemini" and eff_gemini:
        active = "gemini"
    elif pref == "openai" and eff_openai:
        active = "openai"
    elif pref == "anthropic" and eff_anthropic:
        active = "anthropic"

    configured = bool(active)

    if pref == "gemini":
        default_model = "gemini-3.8-flash"
    elif pref == "openai":
        default_model = "gpt-6-sol"
    else:
        default_model = "claude-sonnet-5-5"

    model = settings.llm_model if settings.llm_model else default_model

    return Health(
        status="ok",
        real_provider_configured=configured,
        active_provider=active,
        model=model,
        demo_available=True,
        limits={
            "projects": 3,
            "requirements": settings.max_requirements,
            "files": settings.max_files,
            "file_bytes": settings.max_file_bytes,
            "project_bytes": settings.max_project_bytes,
        },
    )


def mask_secret(secret: str) -> str:
    if not secret:
        return ""
    if len(secret) <= 8:
        return "****"
    return secret[:6] + "..." + secret[-4:]


def update_env_file(updates: dict[str, str]):
    for env_path in [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), ".env")),
    ]:
        if not os.path.exists(env_path):
            continue
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            updated_keys = set()
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key = stripped.split("=", 1)[0].strip()
                    if key in updates:
                        new_lines.append(f"{key}={updates[key]}\n")
                        updated_keys.add(key)
                        continue
                new_lines.append(line)
            for k, v in updates.items():
                if k not in updated_keys:
                    new_lines.append(f"{k}={v}\n")
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
        except OSError:
            continue


class SettingsView(Schema):
    llm_provider: str
    llm_model: str
    gemini_api_key_configured: bool
    gemini_api_key_preview: str
    gemini_is_server_default: bool = False
    anthropic_api_key_configured: bool
    anthropic_api_key_preview: str
    anthropic_is_server_default: bool = False
    openai_api_key_configured: bool
    openai_api_key_preview: str
    openai_is_server_default: bool = False
    github_token_configured: bool
    github_token_preview: str
    github_is_server_default: bool = False
    real_provider_configured: bool
    active_provider: str


class SettingsUpdate(Schema):
    llm_provider: str | None = None
    llm_model: str | None = None
    gemini_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    github_token: str | None = None


class SettingsTestRequest(Schema):
    provider: Literal["gemini", "anthropic", "openai", "github"]
    api_key: str | None = None
    model: str | None = None


class SettingsTestResponse(Schema):
    success: bool
    message: str
    latency_ms: int = 0


@app.get("/api/v1/settings", response_model=SettingsView)
def get_settings():
    eff_gemini = get_effective_gemini_key()
    eff_openai = get_effective_openai_key()
    eff_anthropic = get_effective_anthropic_key()
    eff_github = get_effective_github_token()

    provider_pref = settings.llm_provider
    if not provider_pref:
        if eff_gemini:
            provider_pref = "gemini"
        elif eff_openai:
            provider_pref = "openai"
        elif eff_anthropic:
            provider_pref = "anthropic"
        else:
            provider_pref = "gemini"

    active = ""
    if provider_pref == "gemini" and eff_gemini:
        active = "gemini"
    elif provider_pref == "openai" and eff_openai:
        active = "openai"
    elif provider_pref == "anthropic" and eff_anthropic:
        active = "anthropic"

    configured = bool(active)

    if provider_pref == "gemini":
        default_model = "gemini-3.8-flash"
    elif provider_pref == "openai":
        default_model = "gpt-6-sol"
    else:
        default_model = "claude-sonnet-5-5"

    current_model = settings.llm_model if settings.llm_model else default_model

    gemini_is_server = bool(not settings.gemini_api_key and SERVER_DEFAULT_GEMINI_KEY)
    gemini_preview = mask_secret(eff_gemini)
    if eff_gemini and gemini_is_server:
        gemini_preview = f"{gemini_preview} (Default)"

    anthropic_is_server = bool(not settings.anthropic_api_key and SERVER_DEFAULT_ANTHROPIC_KEY)
    anthropic_preview = mask_secret(eff_anthropic)
    if eff_anthropic and anthropic_is_server:
        anthropic_preview = f"{anthropic_preview} (Default)"

    openai_is_server = bool(not settings.openai_api_key and SERVER_DEFAULT_OPENAI_KEY)
    openai_preview = mask_secret(eff_openai)
    if eff_openai and openai_is_server:
        openai_preview = f"{openai_preview} (Default)"

    github_is_server = bool(not settings.github_token and SERVER_DEFAULT_GITHUB_TOKEN)
    github_preview = mask_secret(eff_github)
    if eff_github and github_is_server:
        github_preview = f"{github_preview} (Default)"

    return SettingsView(
        llm_provider=provider_pref,
        llm_model=current_model,
        gemini_api_key_configured=bool(eff_gemini),
        gemini_api_key_preview=gemini_preview,
        gemini_is_server_default=gemini_is_server,
        anthropic_api_key_configured=bool(eff_anthropic),
        anthropic_api_key_preview=anthropic_preview,
        anthropic_is_server_default=anthropic_is_server,
        openai_api_key_configured=bool(eff_openai),
        openai_api_key_preview=openai_preview,
        openai_is_server_default=openai_is_server,
        github_token_configured=bool(eff_github),
        github_token_preview=github_preview,
        github_is_server_default=github_is_server,
        real_provider_configured=configured,
        active_provider=active,
    )


@app.post("/api/v1/settings", response_model=SettingsView)
def update_settings(payload: SettingsUpdate):
    if payload.llm_provider is not None:
        settings.llm_provider = payload.llm_provider.strip()
    if payload.llm_model is not None:
        settings.llm_model = payload.llm_model.strip()
    if payload.gemini_api_key is not None:
        settings.gemini_api_key = payload.gemini_api_key.strip()
    if payload.anthropic_api_key is not None:
        settings.anthropic_api_key = payload.anthropic_api_key.strip()
    if payload.openai_api_key is not None:
        settings.openai_api_key = payload.openai_api_key.strip()
    if payload.github_token is not None:
        settings.github_token = payload.github_token.strip()

    save(
        "settings",
        {
            "llm_provider": settings.llm_provider,
            "llm_model": settings.llm_model,
            "gemini_api_key": settings.gemini_api_key,
            "anthropic_api_key": settings.anthropic_api_key,
            "openai_api_key": settings.openai_api_key,
            "github_token": settings.github_token,
        },
        id="config",
    )

    update_env_file(
        {
            "LLM_PROVIDER": settings.llm_provider,
            "LLM_MODEL": settings.llm_model,
            "GEMINI_API_KEY": settings.gemini_api_key,
            "ANTHROPIC_API_KEY": settings.anthropic_api_key,
            "OPENAI_API_KEY": settings.openai_api_key,
            "GITHUB_TOKEN": settings.github_token,
        }
    )

    return get_settings()


@app.post("/api/v1/settings/test", response_model=SettingsTestResponse)
def test_settings(payload: SettingsTestRequest):
    if payload.provider == "gemini":
        key = payload.api_key.strip() if payload.api_key else get_effective_gemini_key()
        if not key:
            return SettingsTestResponse(success=False, message="No Gemini API key provided or configured.")
        model = (
            payload.model.strip()
            if payload.model
            else (settings.llm_model if settings.llm_model.startswith("gemini-") else "gemini-3.8-flash")
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        start_t = time.perf_counter()
        try:
            with httpx.Client(timeout=10, headers={"x-goog-api-key": key}) as client:
                resp = client.post(
                    url,
                    json={
                        "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
                        "generationConfig": {"max_output_tokens": 5},
                    },
                )
            latency = int((time.perf_counter() - start_t) * 1000)
            if resp.status_code == 200:
                return SettingsTestResponse(
                    success=True, message=f"Gemini ({model}) connected successfully!", latency_ms=latency
                )
            elif resp.status_code in {400, 401, 403}:
                err_msg = "Invalid or unauthorized Gemini API key."
                try:
                    err_json = resp.json()
                    if isinstance(err_json, dict) and "error" in err_json and "message" in err_json["error"]:
                        err_msg = str(err_json["error"]["message"])
                except (ValueError, KeyError):
                    err_msg = "Invalid or unauthorized Gemini API key."
                return SettingsTestResponse(success=False, message=err_msg, latency_ms=latency)
            else:
                return SettingsTestResponse(
                    success=False, message=f"Gemini returned HTTP {resp.status_code}", latency_ms=latency
                )
        except (httpx.RequestError, httpx.HTTPError) as e:
            return SettingsTestResponse(success=False, message=f"Connection error: {e!s}")

    elif payload.provider == "anthropic":
        key = payload.api_key.strip() if payload.api_key else get_effective_anthropic_key()
        if not key:
            return SettingsTestResponse(success=False, message="No Anthropic API key provided or configured.")
        model = (
            payload.model.strip()
            if payload.model
            else (
                settings.llm_model
                if settings.llm_model and "claude" in settings.llm_model
                else "claude-sonnet-5-5"
            )
        )
        start_t = time.perf_counter()
        try:
            with httpx.Client(
                timeout=10, headers={"x-api-key": key, "anthropic-version": "2023-06-01"}
            ) as client:
                resp = client.post(
                    "https://api.anthropic.com/v1/messages",
                    json={
                        "model": model,
                        "max_tokens": 5,
                        "messages": [{"role": "user", "content": "Hello"}],
                    },
                )
            latency = int((time.perf_counter() - start_t) * 1000)
            if resp.status_code == 200:
                return SettingsTestResponse(
                    success=True, message=f"Anthropic ({model}) connected successfully!", latency_ms=latency
                )
            elif resp.status_code in {401, 403}:
                return SettingsTestResponse(
                    success=False, message="Invalid or unauthorized Anthropic API key.", latency_ms=latency
                )
            else:
                err_msg = f"Anthropic returned HTTP {resp.status_code}"
                try:
                    err_json = resp.json()
                    if isinstance(err_json, dict) and "error" in err_json and "message" in err_json["error"]:
                        err_msg = str(err_json["error"]["message"])
                except (ValueError, KeyError):
                    err_msg = f"Anthropic returned HTTP {resp.status_code}"
                return SettingsTestResponse(success=False, message=err_msg, latency_ms=latency)
        except (httpx.RequestError, httpx.HTTPError) as e:
            return SettingsTestResponse(success=False, message=f"Connection error: {e!s}")

    elif payload.provider == "openai":
        key = payload.api_key.strip() if payload.api_key else get_effective_openai_key()
        if not key:
            return SettingsTestResponse(success=False, message="No OpenAI API key provided or configured.")
        model = (
            payload.model.strip()
            if payload.model
            else (
                settings.llm_model
                if settings.llm_model and any(k in settings.llm_model for k in ("gpt", "o1", "o3", "o4"))
                else "gpt-6-sol"
            )
        )
        start_t = time.perf_counter()
        try:
            with httpx.Client(timeout=10, headers={"Authorization": f"Bearer {key}"}) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json={
                        "model": model,
                        "max_tokens": 5,
                        "messages": [{"role": "user", "content": "Hello"}],
                    },
                )
            latency = int((time.perf_counter() - start_t) * 1000)
            if resp.status_code == 200:
                return SettingsTestResponse(
                    success=True, message=f"OpenAI ({model}) connected successfully!", latency_ms=latency
                )
            elif resp.status_code in {401, 403}:
                return SettingsTestResponse(
                    success=False, message="Invalid or unauthorized OpenAI API key.", latency_ms=latency
                )
            else:
                err_msg = f"OpenAI returned HTTP {resp.status_code}"
                try:
                    err_json = resp.json()
                    if isinstance(err_json, dict) and "error" in err_json and "message" in err_json["error"]:
                        err_msg = str(err_json["error"]["message"])
                except (ValueError, KeyError):
                    err_msg = f"OpenAI returned HTTP {resp.status_code}"
                return SettingsTestResponse(success=False, message=err_msg, latency_ms=latency)
        except (httpx.RequestError, httpx.HTTPError) as e:
            return SettingsTestResponse(success=False, message=f"Connection error: {e!s}")

    elif payload.provider == "github":
        token = payload.api_key.strip() if payload.api_key else get_effective_github_token()
        if not token:
            return SettingsTestResponse(success=False, message="No GitHub token provided or configured.")
        start_t = time.perf_counter()
        try:
            headers = {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "User-Agent": "JobProof",
            }
            with httpx.Client(timeout=10, headers=headers) as client:
                resp = client.get("https://api.github.com/user")
            latency = int((time.perf_counter() - start_t) * 1000)
            if resp.status_code == 200:
                login = resp.json().get("login", "authenticated user")
                return SettingsTestResponse(
                    success=True, message=f"GitHub token verified for user @{login}!", latency_ms=latency
                )
            elif resp.status_code in {401, 403}:
                return SettingsTestResponse(
                    success=False, message="Invalid or unauthorized GitHub token.", latency_ms=latency
                )
            else:
                return SettingsTestResponse(
                    success=False, message=f"GitHub returned HTTP {resp.status_code}", latency_ms=latency
                )
        except (httpx.RequestError, httpx.HTTPError) as e:
            return SettingsTestResponse(success=False, message=f"Connection error: {e!s}")

    return SettingsTestResponse(success=False, message="Unknown provider requested.")


class ProjectInput(Schema):
    url: str = Field(default="", max_length=300)
    local_path: str = Field(default="", max_length=500)
    name: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=2000)
    contribution: str = Field(default="", max_length=4000)
    excludes: str = Field(default="", max_length=500)


@app.post("/api/v1/projects", response_model=Document)
def project_create(body: ProjectInput):
    if body.local_path:
        abs_path = os.path.abspath(body.local_path)
        if not os.path.isdir(abs_path):
            raise ValueError(f"Local directory does not exist: {body.local_path}")
        if any(abs_path == p or abs_path.startswith(p + "/") for p in FORBIDDEN_PREFIXES):
            raise ValueError("System directories cannot be imported.")
        repo_name = body.name or os.path.basename(abs_path) or "local-project"
        return doc(
            save(
                "project",
                {
                    **body.model_dump(),
                    "name": repo_name,
                    "owner": "local",
                    "repository": repo_name,
                    "url": f"file://{abs_path}",
                    "local_path": abs_path,
                    "created_at": now(),
                    "updated_at": now(),
                    "demo": False,
                    "local": True,
                },
            )
        )
    if not body.url:
        raise ValueError("Either url or local_path must be supplied.")
    owner, repo = parse_url(body.url)
    return doc(
        save(
            "project",
            {
                **body.model_dump(),
                "name": body.name or repo,
                "owner": owner,
                "repository": repo,
                "url": f"https://github.com/{owner}/{repo}",
                "created_at": now(),
                "updated_at": now(),
                "demo": False,
                "local": False,
            },
        )
    )


@app.get("/api/v1/projects", response_model=list[Document])
def projects():
    return [doc(p) for p in all_records("project")]


@app.get("/api/v1/projects/{id}", response_model=Document)
def project_get(id: str):
    return doc(get(id, "project"))


class ImportInput(Schema):
    ref: str = Field(default="", max_length=200, pattern=r"^[A-Za-z0-9_./-]*$")
    request_id: str = Field(default_factory=uid, max_length=100)


@app.post("/api/v1/projects/{id}/imports", response_model=Document)
def import_project(id: str, body: ImportInput):
    p = get(id, "project")
    if p.get("demo"):
        raise ValueError("Fixture projects cannot be fetched from GitHub.")
    if p.get("local"):
        return doc(
            tasks.submit(
                "import",
                "import:" + id + ":" + body.request_id,
                lambda check: import_local_dir(p, p["local_path"], check)["id"],
            )
        )
    return doc(
        tasks.submit(
            "import",
            "import:" + id + ":" + body.request_id,
            lambda check: GitHub().import_repo(p, body.ref, check)["id"],
        )
    )


@app.get("/api/v1/projects/{id}/snapshots", response_model=list[Document])
def snapshots(id: str):
    return [doc(s) for s in all_records("snapshot") if s["project_id"] == id]


@app.get("/api/v1/snapshots", response_model=list[Document])
def snapshots_all():
    return [doc(s) for s in all_records("snapshot")]


@app.get("/api/v1/snapshots/{id}", response_model=Document)
def snapshot_get(id: str):
    s = get(id, "snapshot")
    s["files"] = [
        {k: f[k] for k in ["id", "path", "hash", "line_count", "type"]}
        for f in all_records("file")
        if f["snapshot_id"] == id
    ]
    return doc(s)


class JobInput(Schema):
    title: str = Field(min_length=1, max_length=200)
    company: str = Field(default="", max_length=200)
    url: str = Field(default="", max_length=1000)
    text: str = Field(min_length=10, max_length=40000)
    language: Literal["ca", "es", "en"] = "en"


@app.post("/api/v1/job-postings", response_model=Document)
def job_create(body: JobInput):
    if body.url and not body.url.startswith("https://"):
        raise ValueError("Reference URL must use HTTPS. It is never fetched.")
    return doc(
        save(
            "job",
            {
                **body.model_dump(),
                "canonical_text": normalize(body.text),
                "created_at": now(),
                "requirements": [],
                "requirements_version": 0,
                "demo": False,
            },
        )
    )


@app.get("/api/v1/job-postings", response_model=list[Document])
def jobs():
    return [doc(j) for j in all_records("job")]


@app.get("/api/v1/job-postings/{id}", response_model=Document)
def job_get(id: str):
    return doc(get(id, "job"))


class JobUrlFetchRequest(Schema):
    url: str = Field(min_length=5, max_length=1000)


class JobUrlFetchResponse(Schema):
    title: str = ""
    company: str = ""
    text: str


@app.post("/api/v1/job-postings/fetch-url", response_model=JobUrlFetchResponse)
def fetch_job_url(body: JobUrlFetchRequest):
    if not body.url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")
    try:
        resp = httpx.get(
            body.url,
            follow_redirects=True,
            timeout=15,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
            },
        )
    except (httpx.RequestError, httpx.HTTPError) as e:
        raise HTTPException(status_code=400, detail=f"Failed to reach URL: {e!s}")

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Website returned HTTP {resp.status_code}")

    html = resp.text
    clean = re.sub(
        r"<(script|style|nav|footer|header|noscript)[^>]*>.*?</\1>",
        " ",
        html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    title = ""
    if title_match:
        raw_title = re.sub(r"\s+", " ", title_match.group(1)).strip()
        title = raw_title.split("|")[0].split(" - ")[0].strip()

    clean = re.sub(r"<(p|br|div|li|h[1-6])[^>]*>", "\n", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = html_lib.unescape(clean)
    lines = [line.strip() for line in clean.splitlines()]
    clean_text = "\n".join(line for line in lines if line)

    if len(clean_text) < 30:
        raise HTTPException(status_code=400, detail="Could not extract readable text from the provided URL.")

    return JobUrlFetchResponse(
        title=title[:200],
        company="",
        text=clean_text[:40000],
    )


class ExtractInput(Schema):
    mode: Literal["demo", "real"] = "real"
    request_id: str = Field(default_factory=uid, max_length=100)


def check_requirements(requirements, text):
    if len({r.id for r in requirements}) != len(requirements):
        raise ValueError("Requirement IDs must be unique.")
    rows = []
    for r in requirements:
        if r.provenance == "manual":
            r.quote, r.offset = "", None
        elif (
            not r.quote
            or r.offset is None
            or text[r.offset : r.offset + len(r.quote)] != r.quote
            or r.offset < 0
        ):
            raise ValueError(
                "Requirement citation does not match the canonical job text. Correct it or add as manual."
            )
        rows.append(r.model_dump())
    return rows


@app.post("/api/v1/job-postings/{id}/extract-requirements", response_model=Document)
def extract(id: str, body: ExtractInput):
    job = get(id, "job")
    p = provider(body.mode)

    def work(check):
        check("Extracting requirements")
        reqs = p.extract_requirements(job["canonical_text"])
        rows = check_requirements(reqs.requirements, job["canonical_text"])
        check("Validating job citations")
        current = get(id, "job")
        if current["requirements_version"] != job["requirements_version"]:
            raise ValueError("Requirements changed during extraction. Extract again explicitly.")
        save(
            "job",
            {
                **current,
                "requirements": rows,
                "requirements_version": current["requirements_version"] + 1,
                "extraction_usage": p.usage,
            },
            id,
        )
        return id

    return doc(tasks.submit("extraction", "extract:" + id + ":" + body.request_id, work))


@app.get("/api/v1/job-postings/{id}/requirements", response_model=Requirements)
def requirements(id: str):
    return Requirements(requirements=get(id, "job")["requirements"])


class RequirementsUpdate(Requirements):
    version: int


@app.put("/api/v1/job-postings/{id}/requirements", response_model=Document)
def update_requirements(id: str, body: RequirementsUpdate):
    with tasks.lock:
        job = get(id, "job")
        if body.version != job["requirements_version"]:
            raise HTTPException(409, "Requirements changed; reload before saving.")
        rows = check_requirements(body.requirements, job["canonical_text"])
        return doc(save("job", {**job, "requirements": rows, "requirements_version": body.version + 1}, id))


class AnalysisInput(Schema):
    job_id: str
    snapshot_ids: list[str] = Field(min_length=1, max_length=3)
    mode: Literal["demo", "real"]
    request_id: str = Field(max_length=100, min_length=1)


def analyze(a, p, check):
    check("Retrieval")
    selected = [r for r in a["requirements"] if r["selected"]]
    candidates, context = {}, 0
    for r in selected:
        candidates[r["id"]] = []
        for c in retrieve(r["text"], a["snapshot_ids"]):
            if context + len(c["text"]) > settings.max_context_chars:
                a["warnings"].append("Context limit reached; retrieved sources were omitted.")
                break
            context += len(c["text"])
            candidates[r["id"]].append(c)
    assessments = []
    for i, r in enumerate(selected):
        check(f"Evaluation {i + 1}/{len(selected)}")
        result = p.assess_requirements(r, candidates[r["id"]])
        check(f"Citation validation {i + 1}/{len(selected)}")
        valid = validate_assessment(result, candidates[r["id"]], a["snapshot_ids"], r)
        assessments.append(save("assessment", {**valid, "analysis_id": a["id"], "requirement": r}))
    check("Interview preparation")
    preparation = p.generate_preparation_material(
        [{k: a[k] for k in ["requirement", "status", "explanation", "limitations"]} for a in assessments]
    )
    known = {r["id"] for r in selected}
    if any(r.requirement_id not in known for r in preparation.recommendations):
        raise ValueError("Provider returned recommendations for unknown requirements.")
    check("Saving report")
    save(
        "analysis",
        {
            **a,
            "assessments": [x["id"] for x in assessments],
            "preparation": preparation.model_dump(),
            "usage": p.usage,
            "context_chars": context,
        },
        a["id"],
    )
    return a["id"]


@app.post("/api/v1/analyses", response_model=Document)
def analysis_create(body: AnalysisInput):
    with tasks.lock:
        key = "analysis:" + body.request_id
        duplicate = next((t for t in all_records("task") if t["key"] == key), None)
        if duplicate:
            previous = get(duplicate["analysis_id"], "analysis")
            current = get(body.job_id, "job")
            if (
                previous["job_id"] != body.job_id
                or previous["requirements_version"] != current["requirements_version"]
                or set(previous["snapshot_ids"]) != set(body.snapshot_ids)
                or previous["mode"] != body.mode
                or previous["pipeline_version"] != PIPELINE
            ):
                raise HTTPException(
                    409, "Request ID already belongs to different inputs. Retry with a new request ID."
                )
            return doc(duplicate)
        job = get(body.job_id, "job")
        reqs = [r for r in job["requirements"] if r.get("selected", True)]
        if not 1 <= len(reqs) <= settings.max_requirements:
            raise ValueError(
                f"Select 1–{settings.max_requirements} requirements; remaining requirements stay visible as excluded."
            )
        snaps = [get(s, "snapshot") for s in set(body.snapshot_ids)]
        if len({s["project_id"] for s in snaps}) != len(snaps):
            raise ValueError("Select one snapshot per project.")
        if any(s["status"] != "complete" for s in snaps):
            raise ValueError("Only completed imports can be selected.")
        if body.mode == "demo" and (not job.get("demo") or any(not s.get("demo") for s in snaps)):
            raise ValueError("Demo requires the fixture posting and fixture projects.")
        p = provider(body.mode)
        warnings = [
            "Authorship and execution are not verified. Valid citations establish text presence, not correctness of conclusions."
        ]
        if any(s["partial"] for s in snaps):
            warnings.append("Partial imports: missing evidence may be in omitted files.")
        if len(reqs) != len(job["requirements"]):
            warnings.append(
                f"Partial analysis: {len(reqs)} of {len(job['requirements'])} requirements selected."
            )
        tasks.ensure_capacity()
        a = save(
            "analysis",
            {
                "job_id": body.job_id,
                "title": job["title"],
                "requirements": [Requirement.model_validate(r).model_dump() for r in job["requirements"]],
                "requirements_version": job["requirements_version"],
                "snapshot_ids": body.snapshot_ids,
                "snapshots": snaps,
                "mode": body.mode,
                "status": "queued",
                "created_at": now(),
                "pipeline_version": PIPELINE,
                "prompt_version": PROMPT_VERSION,
                "model": p.model,
                "parameters": {
                    "max_context_chars": settings.max_context_chars,
                    "max_calls": settings.max_calls,
                    "max_tokens": settings.max_tokens,
                    "max_retries": settings.max_retries,
                },
                "warnings": warnings,
                "assessments": [],
            },
        )
        return doc(tasks.submit("analysis", key, lambda check: analyze(a, p, check), a["id"]))


@app.get("/api/v1/analyses", response_model=list[Document])
def analyses():
    return [doc(a) for a in reversed(all_records("analysis"))]


@app.get("/api/v1/analyses/{id}", response_model=Document)
def analysis_get(id: str):
    return doc(get(id, "analysis"))


@app.get("/api/v1/analyses/{id}/assessments", response_model=list[Document])
def assessments(id: str):
    return [doc(a) for a in all_records("assessment") if a["analysis_id"] == id]


@app.get("/api/v1/assessments/{id}/evidence", response_model=list[dict[str, Any]])
def evidence(id: str):
    return get(id, "assessment")["evidence"]


class ReviewInput(Schema):
    status: Status
    reason: str = Field(min_length=3, max_length=4000)
    remove_chunk_ids: list[str] = Field(default_factory=list)
    add_chunk_ids: list[str] = Field(default_factory=list)


@app.post("/api/v1/assessments/{id}/reviews", response_model=Document)
def review(id: str, body: ReviewInput):
    with tasks.lock:
        a = get(id, "assessment")
        analysis = get(a["analysis_id"], "analysis")
        if analysis["status"] != "complete":
            raise ValueError("Review is available after analysis completes.")
        from .core import Assessment

        added = []
        for chunk_id in body.add_chunk_ids:
            c = get(chunk_id, "chunk")
            if c["snapshot_id"] not in analysis["snapshot_ids"]:
                raise ValueError("Manual evidence must belong to an analyzed snapshot.")
            result = Assessment(
                status="partial",
                explanation=body.reason,
                limitations=[],
                evidence=[{"chunk_id": chunk_id, "quote": c["text"], "relation": body.reason}],
            )
            added.extend(
                validate_assessment(result, [c], analysis["snapshot_ids"], a["requirement"])["evidence"]
            )
        updated = [e for e in a["evidence"] if e["chunk_id"] not in body.remove_chunk_ids] + added
        if body.status == "supported" and not updated:
            raise ValueError("Supported requires at least one valid evidence citation.")
        decision = {
            "id": uid(),
            "previous": a["status"],
            "status": body.status,
            "reason": body.reason,
            "created_at": now(),
            "added": added,
            "removed": [e for e in a["evidence"] if e["chunk_id"] in body.remove_chunk_ids],
        }
        return doc(
            save(
                "assessment",
                {**a, "status": body.status, "evidence": updated, "reviews": a["reviews"] + [decision]},
                id,
            )
        )


@app.get("/api/v1/snapshots/{id}/chunks", response_model=list[Document])
def chunks(id: str):
    get(id, "snapshot")
    return [doc(c) for c in all_records("chunk") if c["snapshot_id"] == id]


@app.get("/api/v1/tasks/{id}", response_model=Document)
def task_get(id: str):
    return doc(get(id, "task"))


@app.post("/api/v1/tasks/{id}/cancel", response_model=Document)
def cancel_task(id: str):
    with tasks.lock:
        t = get(id, "task")
        if t["status"] in {"queued", "running"}:
            t = save("task", {**t, "cancel_requested": True}, id)
        return doc(t)


@app.post("/api/v1/analyses/{id}/cancel", response_model=Document)
def cancel_analysis(id: str):
    t = next((t for t in all_records("task") if t.get("analysis_id") == id), None)
    if not t:
        raise ValueError("Analysis task not found")
    return cancel_task(t["id"])


@app.post("/api/v1/demo", response_model=dict[str, Any])
def demo():
    with tasks.lock:
        return load_demo()


def export_report(id):
    a = get(id, "analysis")
    if a["status"] != "complete":
        raise ValueError("An incomplete analysis cannot be exported as a completed report.")
    rows = [get(x, "assessment") for x in a["assessments"]]
    for row in rows:
        for e in row["evidence"]:
            e.pop("source_text", None)
    return {**a, "assessments": rows}


def markdown(report):
    lines = [
        f"# JobProof — {report['title']}",
        f"Mode: {report['mode']} | Model: {report['model']}",
        f"Date: {report['created_at']} | Pipeline: {report['pipeline_version']} | Prompt: {report['prompt_version']} | Requirements version: {report['requirements_version']}",
        "",
        "## Scope and limitations",
        *report["warnings"],
    ]
    for s in report["snapshots"]:
        lines.append(f"- Commit: {s['sha']}; partial import: {s['partial']}; files: {s['file_count']}")
    for a in report["assessments"]:
        lines.extend(
            [
                "",
                f"## {a['requirement']['text']} — {a['status']}",
                a["explanation"],
                *a["limitations"],
                f"Original model status: {a['original']['status']}",
            ]
        )
        for e in a["evidence"]:
            lines.extend(
                [
                    f"- {e['path']}:{e['start']}–{e['end']} ({e['type']}) {e['url'] or 'fixture'}",
                    "> " + e["quote"].replace("\n", "\n> "),
                ]
            )
        for r in a["reviews"]:
            lines.append(f"Human review {r['created_at']}: {r['previous']} → {r['status']}. {r['reason']}")
    lines.extend(
        [
            "",
            "## Interview preparation",
            *report["preparation"]["questions"],
            *report["preparation"]["technical_points"],
            *report["preparation"]["decisions"],
            *report["preparation"]["honest_limitations"],
            *report["preparation"]["personal_prompts"],
        ]
    )
    for r in report["preparation"]["recommendations"]:
        lines.append(f"- {r['action']} Expected: {r['observable_result']} {r['effort_estimate']}")
    excluded = [r["text"] for r in report["requirements"] if not r["selected"]]
    lines.extend(["", "Excluded requirements: " + "; ".join(excluded)])
    return "\n".join(lines)


@app.get("/api/v1/analyses/{id}/export")
def export(id: str, format: Literal["markdown", "json"] = "markdown"):
    report = export_report(id)
    content = markdown(report) if format == "markdown" else json.dumps(report, indent=2)
    return Response(
        content,
        media_type="text/markdown" if format == "markdown" else "application/json",
        headers={
            "Content-Disposition": f'attachment; filename="jobproof-{id}.{"md" if format == "markdown" else "json"}"'
        },
    )


@app.post("/api/v1/analyses/{id}/cover-letter", response_model=GeneratedCoverLetter)
def generate_cover_letter_endpoint(id: str, body: CoverLetterRequest):
    a = get(id, "analysis")
    if a["status"] != "complete":
        raise HTTPException(status_code=400, detail="Cover letter requires a completed analysis.")
    job = get(a["job_id"], "job")
    assessment_rows = [get(x, "assessment") for x in a["assessments"]]
    p = provider(a.get("mode", "demo"))
    letter = p.generate_cover_letter(
        job_title=job["title"],
        job_text=job["text"],
        assessments=assessment_rows,
        language=body.language,
        tone=body.tone,
    )
    save("analysis", {**a, "cover_letter": letter.model_dump()}, id)
    return letter


@app.get("/api/v1/analyses/{id}/cover-letter", response_model=GeneratedCoverLetter | None)
def get_cover_letter_endpoint(id: str):
    a = get(id, "analysis")
    cl = a.get("cover_letter")
    if not cl:
        return None
    return GeneratedCoverLetter.model_validate(cl)


@app.post("/api/v1/analyses/{id}/interview/chat", response_model=InterviewChatReply)
def interview_chat_endpoint(id: str, body: InterviewChatRequest):
    a = get(id, "analysis")
    if a["status"] != "complete":
        raise HTTPException(status_code=400, detail="Interview simulation requires a completed analysis.")
    job = get(a["job_id"], "job")
    assessment_rows = [get(x, "assessment") for x in a["assessments"]]
    p = provider(a.get("mode", "demo"))
    reply = p.chat_interview(
        job_title=job["title"],
        assessments=assessment_rows,
        messages=[m.model_dump() for m in body.messages],
        language=body.language,
    )
    chat_history = [m.model_dump() for m in body.messages]
    chat_history.append(
        {
            "id": uid(),
            "role": "interviewer",
            "content": reply.interviewer_reply,
            "feedback": reply.evaluation_feedback,
            "created_at": now(),
        }
    )
    save("analysis", {**a, "interview_chat": chat_history}, id)
    return reply


@app.get("/api/v1/analyses/{id}/interview/chat", response_model=list[ChatMessage])
def get_interview_chat_endpoint(id: str):
    a = get(id, "analysis")
    chat = a.get("interview_chat", [])
    return [ChatMessage.model_validate(m) for m in chat]


@app.post("/api/v1/analyses/{id}/interview/reset", response_model=dict[str, bool])
def reset_interview_chat_endpoint(id: str):
    a = get(id, "analysis")
    save("analysis", {**a, "interview_chat": []}, id)
    return {"ok": True}


# Serve static frontend SPA in production if built
_static_dir = settings.static_dir or os.environ.get("STATIC_DIR", "")
if not _static_dir:
    _candidate = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
    if os.path.isdir(_candidate):
        _static_dir = _candidate

if _static_dir and os.path.isdir(_static_dir):
    _assets = os.path.join(_static_dir, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = os.path.join(_static_dir, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        index_html = os.path.join(_static_dir, "index.html")
        if os.path.isfile(index_html):
            return FileResponse(index_html)
        raise HTTPException(status_code=404, detail="Page not found")
