"""Per-visitor workspaces and bring-your-own-key for hosted mode.

A visitor is identified only by a random token generated in their browser (`X-Workspace`). The server keeps its
SHA-256 digest on every record the visitor creates, so one visitor can never read or change another's data, and
deletes everything after a retention window. AI keys arrive per request (`X-AI-*`), are held in memory for the
duration of the request or background task, and are never stored or logged.
"""

import contextvars
import hashlib
import re
import threading
from dataclasses import dataclass
from datetime import UTC, date, datetime

from .core import (
    SERVER_DEFAULT_GEMINI_KEY,
    all_records,
    current_workspace,
    get,
    save,
    settings,
)
from .hosted import is_demo_record

TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{32,64}$")
KEY_RE = re.compile(r"^[\x21-\x7e]{8,400}$")  # printable ASCII, no spaces
MODEL_RE = re.compile(r"^[A-Za-z0-9._:/-]{1,80}$")
PROVIDERS = {"gemini", "anthropic", "openai"}

NEED_KEY_MESSAGE = (
    "This action needs an AI key. Open Settings and add your own key (the free Gemini key from Google AI Studio "
    "works), or use the fixture demo."
)


@dataclass(frozen=True)
class AICredentials:
    provider: str
    key: str
    model: str = ""

    def __repr__(self) -> str:  # never let the key reach a log line or a traceback
        return f"AICredentials(provider={self.provider!r}, key='***', model={self.model!r})"


current_ai: contextvars.ContextVar[AICredentials | None] = contextvars.ContextVar("current_ai", default=None)


def workspace_from_token(token: str | None) -> str | None:
    if not token or not TOKEN_RE.fullmatch(token):
        return None
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def credentials_from_headers(
    provider: str | None, key: str | None, model: str | None
) -> AICredentials | None:
    if not provider or not key:
        return None
    provider = provider.strip().lower()
    key = key.strip()
    model = (model or "").strip()
    if provider not in PROVIDERS or not KEY_RE.fullmatch(key):
        return None
    if model and not MODEL_RE.fullmatch(model):
        model = ""
    return AICredentials(provider, key, model)


def enabled() -> bool:
    return settings.hosted_mode and settings.hosted_byok


# ---------------------------------------------------------------------------------------------- visibility


def can_see(kind: str, row: dict) -> bool:
    """Fixture data is public; everything else belongs to the workspace that created it."""
    if not settings.hosted_mode:
        return True
    if is_demo_record(kind, row):
        return True
    workspace = current_workspace.get()
    if kind == "task" and row.get("analysis_id"):
        try:
            return can_see("analysis", get(row["analysis_id"], "analysis"))
        except ValueError:
            return False
    return bool(enabled() and workspace and row.get("_ws") == workspace)


def can_write(kind: str, row: dict) -> bool:
    """Only the creating workspace may change a record, and never the shared fixtures."""
    if not settings.hosted_mode:
        return True
    if is_demo_record(kind, row):
        return False
    workspace = current_workspace.get()
    return bool(enabled() and workspace and row.get("_ws") == workspace)


def owned(kind: str) -> list[dict]:
    workspace = current_workspace.get()
    if not workspace:
        return []
    return [r for r in all_records(kind) if r.get("_ws") == workspace]


def check_quota(kind: str, limit: int, label: str) -> None:
    if settings.hosted_mode and len(owned(kind)) >= limit:
        raise ValueError(f"Workspace limit reached: at most {limit} {label}. They are deleted automatically.")


def check_active_tasks() -> None:
    active = [t for t in owned("task") if t.get("status") in {"queued", "running"}]
    if settings.hosted_mode and len(active) >= settings.workspace_max_active_tasks:
        raise ValueError("You already have a task running. Wait for it to finish.")


# ---------------------------------------------------------------------------------------------- trial budget


def trial_active() -> bool:
    """The limited trial on the server's own Gemini key is on, not expired and the key exists."""
    if not (settings.hosted_mode and settings.trial_daily_calls > 0 and trial_key()):
        return False
    if settings.trial_until:
        try:
            if datetime.now(UTC).date() > date.fromisoformat(settings.trial_until):
                return False
        except ValueError:
            return False  # an unparsable expiry fails closed
    return True


def trial_key() -> str:
    return (settings.gemini_api_key or SERVER_DEFAULT_GEMINI_KEY or "").strip()


_budget_lock = threading.Lock()


class CallBudget:
    """Counts provider calls against a daily global cap and a daily per-workspace cap, persisted in the database."""

    def __init__(self, workspace: str | None):
        self.workspace = workspace or "anonymous"

    def consume(self) -> None:
        today = datetime.now(UTC).date().isoformat()
        record_id = f"trial-usage-{today}"
        with _budget_lock:
            try:
                usage = get(record_id, "trial_usage")
            except ValueError:
                usage = {"day": today, "total": 0, "by_workspace": {}}
            used_here = usage["by_workspace"].get(self.workspace, 0)
            if usage["total"] >= settings.trial_daily_calls or used_here >= settings.trial_workspace_calls:
                raise ValueError(
                    "The free trial quota for today is used up. Add your own AI key in Settings to keep going."
                )
            usage["total"] += 1
            usage["by_workspace"][self.workspace] = used_here + 1
            reset = current_workspace.set(None)  # shared bookkeeping must outlive any workspace
            try:
                save("trial_usage", usage, record_id)
            finally:
                current_workspace.reset(reset)


def trial_status() -> dict:
    if not trial_active():
        return {"available": False, "remaining": 0}
    today = datetime.now(UTC).date().isoformat()
    try:
        used = get(f"trial-usage-{today}", "trial_usage")["total"]
    except ValueError:
        used = 0
    return {
        "available": used < settings.trial_daily_calls,
        "remaining": max(settings.trial_daily_calls - used, 0),
    }
