import base64
import os
import re
from pathlib import PurePosixPath
from urllib.parse import quote

import httpx

from .core import digest, get, get_effective_github_token, normalize, now, redact, save, settings

URL = re.compile(r"https://github\.com/([A-Za-z0-9][A-Za-z0-9-]{0,38})/([A-Za-z0-9_.-]{1,100})/?$")
SHORT_REPO = re.compile(r"^([A-Za-z0-9][A-Za-z0-9-]{0,38})/([A-Za-z0-9_.-]{1,100})$")


def parse_url(url: str):
    raw = url.strip()
    match = URL.fullmatch(raw)
    if match:
        owner, repo = match[1], match[2].removesuffix(".git")
        if repo not in {".", ".."}:
            return owner, repo
    short_match = SHORT_REPO.fullmatch(raw)
    if short_match:
        owner, repo = short_match[1], short_match[2].removesuffix(".git")
        if repo not in {".", ".."}:
            return owner, repo
    raise ValueError("Use https://github.com/owner/repository without query or credentials.")


def exclusion(path, size=0, mode="100644", custom_excludes=None):
    p = PurePosixPath(path)
    lower = path.lower()
    if mode not in {"100644", "100755"}:
        return "symlink or submodule"
    if any(
        x in {"node_modules", ".git", "venv", ".venv", "dist", "build", "__pycache__", "vendor", "coverage"}
        for x in p.parts
    ):
        return "generated or dependency directory"
    if custom_excludes:
        for pat in custom_excludes:
            clean_pat = pat.strip().lower()
            if clean_pat and (clean_pat in lower or any(clean_pat == part.lower() for part in p.parts)):
                return "custom user exclusion"
    if any(
        x in lower
        for x in (
            ".env",
            "credential",
            "id_rsa",
            "id_ed25519",
            ".pem",
            ".key",
            "secret",
            ".min.",
            "lock.json",
            "yarn.lock",
            "uv.lock",
        )
    ):
        return "sensitive or generated file"
    if size > settings.max_file_bytes:
        return "file size limit"
    if p.suffix.lower() not in {
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".md",
        ".txt",
        ".json",
        ".toml",
        ".yaml",
        ".yml",
        ".sql",
        ".ini",
        ".cfg",
        ".sh",
        ".go",
        ".rs",
        ".java",
        ".css",
        ".html",
    } and p.name not in {"Dockerfile", "Makefile", "README", "LICENSE"}:
        return "unsupported or binary format"
    return None


def source_type(path):
    p = path.lower()
    if p.rsplit("/", 1)[-1].startswith("requirements") and p.endswith(".txt"):
        return "configuration"
    if "test" in p or "spec." in p:
        return "test"
    if p.endswith((".md", ".txt")) or p.rsplit("/", 1)[-1] in {"readme", "license"}:
        return "documentation"
    if p.endswith((".json", ".toml", ".yaml", ".yml", ".ini", ".cfg")) or "dockerfile" in p:
        return "configuration"
    return "code"


def index_file(snapshot_id, path, content):
    content = redact(normalize(content))
    lines = content.splitlines()
    kind = source_type(path)
    f = save(
        "file",
        {
            "snapshot_id": snapshot_id,
            "path": path,
            "text": content,
            "hash": digest(content),
            "line_count": len(lines),
            "type": kind,
        },
    )
    for start in range(0, len(lines), 32):
        end = min(start + 40, len(lines))
        save(
            "chunk",
            {
                "file_id": f["id"],
                "snapshot_id": snapshot_id,
                "path": path,
                "start": start + 1,
                "end": end,
                "text": "\n".join(lines[start:end]),
                "type": kind,
            },
        )
    return len(content.encode())


class GitHub:
    def __init__(self, client=None):
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        token = get_effective_github_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.client = client or httpx.Client(
            base_url="https://api.github.com",
            headers=headers,
            timeout=settings.external_timeout,
            follow_redirects=False,
        )

    def request(self, path, params=None):
        response = self.client.get(path, params=params)
        if response.status_code in {403, 429}:
            reset = response.headers.get(
                "x-ratelimit-reset", response.headers.get("retry-after", "not supplied")
            )
            raise ValueError(
                f"GitHub request limited or forbidden. Retry time (Unix timestamp or seconds): {reset}"
            )
        if response.status_code != 200:
            raise ValueError(
                f"GitHub returned {response.status_code}. Check public repository and reference; retry import explicitly."
            )
        return response.json()

    def import_repo(self, project, ref, checkpoint=lambda stage: None):
        base = f"/repos/{project['owner']}/{project['repository']}"
        meta = self.request(base)
        if not get_effective_github_token() and (
            meta.get("private") or meta.get("visibility", "public") != "public"
        ):
            raise ValueError(
                "Private repositories require a configured GitHub Personal Access Token in Settings."
            )
        checkpoint("Resolving commit")
        commit = self.request(base + "/commits/" + quote(ref or meta["default_branch"], safe=""))
        sha = commit["sha"]
        if not re.fullmatch("[0-9a-f]{40}", sha):
            raise ValueError("Invalid commit returned by GitHub")
        tree = self.request(base + "/git/trees/" + sha, {"recursive": "1"})
        snap = save(
            "snapshot",
            {
                "project_id": project["id"],
                "sha": sha,
                "requested_ref": ref,
                "created_at": now(),
                "status": "importing",
                "file_count": 0,
                "bytes": 0,
                "discarded": [],
                "partial": bool(tree.get("truncated")),
                "importer_version": "1.1",
                "demo": False,
            },
        )
        custom_excludes = [x.strip() for x in project.get("excludes", "").split(",") if x.strip()]
        try:
            entries = sorted(
                tree["tree"],
                key=lambda e: (
                    0 if "readme" in e["path"].lower() else 1 if "test" in e["path"].lower() else 2,
                    e["path"],
                ),
            )
            for entry in entries:
                if entry["type"] == "tree":
                    continue
                checkpoint("Importing files")
                path = entry["path"]
                reason = exclusion(path, entry.get("size", 0), entry.get("mode", ""), custom_excludes)
                if not reason and (
                    snap["file_count"] >= settings.max_files
                    or snap["bytes"] + entry.get("size", 0) > settings.max_project_bytes
                ):
                    reason = "project import limit"
                if reason:
                    snap["discarded"].append({"path": path, "reason": reason})
                    snap["partial"] = True
                    continue
                blob = self.request(base + "/git/blobs/" + entry["sha"])
                raw = base64.b64decode(blob.get("content", ""), validate=False)
                if (
                    len(raw) > settings.max_file_bytes
                    or snap["bytes"] + len(raw) > settings.max_project_bytes
                ):
                    reason = "byte limit"
                else:
                    try:
                        content = raw.decode("utf-8")
                        if "\x00" in content:
                            raise UnicodeError()
                    except UnicodeError:
                        reason = "binary or non UTF-8"
                if reason:
                    snap["discarded"].append({"path": path, "reason": reason})
                    snap["partial"] = True
                    continue
                index_file(snap["id"], path, content)
                snap["bytes"] += len(raw)
                snap["file_count"] += 1
            snap["status"] = "complete"
            return save("snapshot", snap, snap["id"])
        except Exception:
            snap["status"] = "incomplete"
            save("snapshot", snap, snap["id"])
            raise
        finally:
            self.client.close()


FORBIDDEN_PREFIXES = (
    "/etc",
    "/bin",
    "/sbin",
    "/usr",
    "/System",
    "/private/etc",
    "/private/var/root",
    "/private/var/db",
)


def is_excluded_dir(path: str) -> bool:
    p = PurePosixPath(path)
    return any(
        x in {"node_modules", ".git", "venv", ".venv", "dist", "build", "__pycache__", "vendor", "coverage"}
        for x in p.parts
    )


def import_local_dir(project, directory_path, checkpoint=lambda stage: None):
    abs_dir = os.path.abspath(directory_path)
    if not os.path.isdir(abs_dir):
        raise ValueError(f"Directory not found: {directory_path}")
    if any(abs_dir == p or abs_dir.startswith(p + "/") for p in FORBIDDEN_PREFIXES):
        raise ValueError("System directories cannot be imported.")

    checkpoint("Scanning local directory")
    snap = save(
        "snapshot",
        {
            "project_id": project["id"],
            "sha": "local-" + digest(abs_dir)[:34],
            "requested_ref": "local",
            "created_at": now(),
            "status": "importing",
            "file_count": 0,
            "bytes": 0,
            "discarded": [],
            "partial": False,
            "importer_version": "1.1",
            "demo": False,
            "local": True,
        },
    )
    file_hashes = []
    try:
        entries = []
        for root, dirs, files in os.walk(abs_dir):
            rel_root = os.path.relpath(root, abs_dir).replace("\\", "/")
            dirs[:] = [d for d in dirs if not is_excluded_dir(d if rel_root == "." else f"{rel_root}/{d}")]
            if rel_root != "." and is_excluded_dir(rel_root):
                continue
            for f in files:
                rel_f = f if rel_root == "." else f"{rel_root}/{f}"
                entries.append((rel_f, os.path.join(root, f)))

        entries.sort(
            key=lambda item: (
                0 if "readme" in item[0].lower() else 1 if "test" in item[0].lower() else 2,
                item[0],
            )
        )

        custom_excludes = [x.strip() for x in project.get("excludes", "").split(",") if x.strip()]

        for rel_path, full_path in entries:
            checkpoint("Importing files")
            try:
                size = os.path.getsize(full_path)
            except OSError:
                continue
            reason = exclusion(rel_path, size, "100644", custom_excludes)
            if not reason and (
                snap["file_count"] >= settings.max_files or snap["bytes"] + size > settings.max_project_bytes
            ):
                reason = "project import limit"
            if reason:
                snap["discarded"].append({"path": rel_path, "reason": reason})
                snap["partial"] = True
                continue
            try:
                with open(full_path, "rb") as fh:
                    raw = fh.read(settings.max_file_bytes + 1)
                if (
                    len(raw) > settings.max_file_bytes
                    or snap["bytes"] + len(raw) > settings.max_project_bytes
                ):
                    reason = "byte limit"
                else:
                    content = raw.decode("utf-8")
                    if "\x00" in content:
                        raise UnicodeError()
            except (UnicodeError, OSError):
                reason = "binary or non UTF-8"

            if reason:
                snap["discarded"].append({"path": rel_path, "reason": reason})
                snap["partial"] = True
                continue

            index_file(snap["id"], rel_path, content)
            file_hashes.append(digest(content))
            snap["bytes"] += len(raw)
            snap["file_count"] += 1

        content_hash = digest("".join(sorted(file_hashes)))[:40] if file_hashes else "0" * 40
        snap["sha"] = content_hash
        snap["status"] = "complete"
        return save("snapshot", snap, snap["id"])
    except Exception:
        snap["status"] = "incomplete"
        save("snapshot", snap, snap["id"])
        raise


def stable_url(chunk, start, end):
    snap = get(chunk["snapshot_id"], "snapshot")
    if snap.get("demo") or snap.get("local"):
        return None
    project = get(snap["project_id"], "project")
    return f"{project['url']}/blob/{snap['sha']}/{quote(chunk['path'], safe='/')}#L{start}-L{end}"
