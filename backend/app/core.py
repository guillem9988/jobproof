import contextvars
import hashlib
import os
import re
import time
import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import JSON, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")
    database_url: str = "sqlite:///./jobproof.db"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = ""
    llm_model: str = ""
    github_token: str = ""
    max_files: int = 150
    max_file_bytes: int = 100_000
    max_project_bytes: int = 5_000_000
    max_requirements: int = 15
    max_context_chars: int = 60000
    max_calls: int = 17
    max_tokens: int = 4096
    external_timeout: int = 45
    max_retries: int = 1
    task_workers: int = 2
    hosted_mode: bool = False
    hosted_write_limit_per_min: int = 60
    # Hosted "bring your own key": each visitor gets a private, expiring workspace and supplies their own AI key.
    hosted_byok: bool = False
    workspace_ttl_hours: int = 24
    workspace_max_projects: int = 3
    workspace_max_jobs: int = 5
    workspace_max_analyses: int = 5
    workspace_max_active_tasks: int = 1
    # Optional limited trial on the server's own Gemini key (0 disables it).
    trial_daily_calls: int = 0
    trial_workspace_calls: int = 40
    trial_until: str = ""
    allowed_origins: str = (
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000"
    )
    static_dir: str = ""


settings = Settings()

SERVER_DEFAULT_GEMINI_KEY: str = (os.environ.get("GEMINI_API_KEY", "") or settings.gemini_api_key).strip()
SERVER_DEFAULT_ANTHROPIC_KEY: str = (
    os.environ.get("ANTHROPIC_API_KEY", "") or settings.anthropic_api_key
).strip()
SERVER_DEFAULT_OPENAI_KEY: str = (os.environ.get("OPENAI_API_KEY", "") or settings.openai_api_key).strip()
SERVER_DEFAULT_GITHUB_TOKEN: str = (os.environ.get("GITHUB_TOKEN", "") or settings.github_token).strip()


def get_effective_gemini_key() -> str:
    if settings.hosted_mode:
        return ""
    return settings.gemini_api_key.strip() if settings.gemini_api_key else SERVER_DEFAULT_GEMINI_KEY


def get_effective_anthropic_key() -> str:
    if settings.hosted_mode:
        return ""
    return settings.anthropic_api_key.strip() if settings.anthropic_api_key else SERVER_DEFAULT_ANTHROPIC_KEY


def get_effective_openai_key() -> str:
    if settings.hosted_mode:
        return ""
    return settings.openai_api_key.strip() if settings.openai_api_key else SERVER_DEFAULT_OPENAI_KEY


def get_effective_github_token() -> str:
    if settings.hosted_mode:
        return ""
    return settings.github_token.strip() if settings.github_token else SERVER_DEFAULT_GITHUB_TOKEN


def get_allowed_origins() -> list[str]:
    raw = settings.allowed_origins
    return [o.strip() for o in raw.split(",") if o.strip()]


engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
Session = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Record(Base):
    __tablename__ = "records"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    kind: Mapped[str] = mapped_column(String, index=True)
    data: Mapped[dict] = mapped_column(JSON)


def uid():
    return uuid.uuid4().hex


def now():
    return datetime.now(UTC).isoformat()


# Workspace of the request being served (set by the API middleware, copied into worker threads).
current_workspace: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_workspace", default=None
)
PROTECTED = ("_ws", "_ts")


def save(kind, data, id=None):
    data = dict(data)
    with Session.begin() as s:
        id = id or uid()
        row = s.get(Record, id)
        if row:
            for key in PROTECTED:  # callers may rebuild a record without the bookkeeping fields
                if key in row.data and key not in data:
                    data[key] = row.data[key]
            row.data = data
        else:
            workspace = current_workspace.get()
            if workspace and "_ws" not in data:
                data["_ws"], data["_ts"] = workspace, time.time()
            s.add(Record(id=id, kind=kind, data=data))
    return {"id": id, **data}


def delete_workspace_records(workspace: str) -> int:
    with Session.begin() as s:
        rows = [r for r in s.query(Record).all() if r.data.get("_ws") == workspace]
        for r in rows:
            s.delete(r)
        return len(rows)


def purge_expired(max_age_seconds: float) -> int:
    """Deletes records created inside a visitor workspace once they are older than the retention window."""
    cutoff = time.time() - max_age_seconds
    with Session.begin() as s:
        rows = [r for r in s.query(Record).all() if r.data.get("_ws") and r.data.get("_ts", 0) < cutoff]
        for r in rows:
            s.delete(r)
        return len(rows)


def get(id, kind=None):
    with Session() as s:
        row = s.get(Record, id)
        if not row or (kind and row.kind != kind):
            raise ValueError("Record not found")
        return {"id": row.id, **row.data}


def all_records(kind):
    with Session() as s:
        return [{"id": r.id, **r.data} for r in s.query(Record).filter_by(kind=kind).all()]


def normalize(text):
    return text.replace("\r\n", "\n").replace("\r", "\n")


def redact(text, *, preserve_positions=False):
    def replacement(value, marker):
        if not preserve_positions:
            return marker + "\n" * value.count("\n")
        # Keep every character offset and newline position for posting citations.
        return "\n".join(marker[: len(line)].ljust(len(line)) for line in value.split("\n"))

    text = re.sub(
        r"-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----",
        lambda m: replacement(m.group(), "[REDACTED PRIVATE KEY]"),
        text,
        flags=re.DOTALL,
    )
    text = re.sub(
        r"(?:sk-ant-[\w-]+|AIza[0-9A-Za-z-_]{35}|gh[pousr]_[\w]+|github_pat_[\w]+|AKIA[A-Z0-9]{16})",
        lambda m: replacement(m.group(), "[REDACTED]"),
        text,
    )
    return re.sub(
        r"(?im)((?:api[_-]?key|password|secret|token)\s*[:=]\s*)([\"']?)([^\s\"']{8,})",
        lambda m: m[1] + m[2] + replacement(m[3], "[REDACTED]"),
        text,
    )


def redact_payload(value):
    """Sanitize string values before JSON escaping; preserve posting offsets."""
    if isinstance(value, str):
        return redact(value, preserve_positions=True)
    if isinstance(value, list):
        return [redact_payload(item) for item in value]
    if isinstance(value, dict):
        return {key: redact_payload(item) for key, item in value.items()}
    return value


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


Status = Literal["supported", "partial", "not_evidenced", "not_verifiable_from_code"]


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Requirement(Schema):
    id: str = Field(default_factory=uid)
    text: str = Field(min_length=1, max_length=2000)
    quote: str = ""
    offset: int | None = None
    category: str = "technology"
    priority: Literal["required", "preferred", "unspecified"] = "unspecified"
    verifiability: Literal["code", "limited", "external"] = "code"
    reviewed: bool = False
    provenance: Literal["extracted", "manual"] = "extracted"
    selected: bool = True


class Requirements(Schema):
    requirements: list[Requirement] = Field(max_length=100)


class Citation(Schema):
    chunk_id: str
    quote: str = Field(min_length=1, max_length=6000)
    relation: str = Field(max_length=2000)


class Assessment(Schema):
    status: Status
    explanation: str = Field(max_length=4000)
    limitations: list[str] = Field(max_length=20)
    evidence: list[Citation] = Field(max_length=8)
    contradictions: list[str] = Field(default_factory=list, max_length=10)


class Recommendation(Schema):
    requirement_id: str
    gap: Literal[
        "implementation",
        "documentation",
        "execution_evidence",
        "personal_contribution",
        "external_experience",
    ]
    action: str
    observable_result: str
    effort_estimate: str


class Preparation(Schema):
    questions: list[str] = Field(min_length=3, max_length=3)
    technical_points: list[str]
    decisions: list[str]
    honest_limitations: list[str]
    personal_prompts: list[str]
    recommendations: list[Recommendation]


class GeneratedCoverLetter(Schema):
    subject: str
    body: str
    key_evidence_highlighted: list[str] = Field(default_factory=list)


class CoverLetterRequest(Schema):
    language: Literal["en", "ca", "es"] = "en"
    tone: Literal["balanced", "technical", "concise"] = "balanced"
    candidate_name: str = ""


class ChatMessage(Schema):
    id: str = Field(default_factory=uid)
    role: Literal["interviewer", "candidate"]
    content: str = Field(max_length=6000)
    feedback: str = Field(default="", max_length=2000)
    created_at: str = Field(default_factory=now)


class InterviewChatReply(Schema):
    evaluation_feedback: str = Field(default="", max_length=2000)
    interviewer_reply: str = Field(max_length=4000)
    is_wrap_up: bool = False


class InterviewChatRequest(Schema):
    messages: list[ChatMessage] = Field(default_factory=list, max_length=30)
    language: Literal["en", "ca", "es"] = "en"
