import json
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import Field

from . import tasks
from .core import (
    Requirement,
    Requirements,
    Schema,
    Status,
    all_records,
    get,
    normalize,
    now,
    save,
    settings,
    uid,
)
from .demo import load_demo
from .ingestion import GitHub, parse_url
from .providers import PROMPT_VERSION, provider
from .retrieval import retrieve, validate_assessment

PIPELINE = "1.1"


@asynccontextmanager
async def lifespan(app):
    tasks.recover()
    yield


app = FastAPI(title="JobProof local API", version=PIPELINE, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def protect(request: Request, call_next):
    if request.method in {"POST", "PUT", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin not in {
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8000",
        }:
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
    model: str
    demo_available: bool
    limits: dict[str, int]


@app.get("/health", response_model=Health)
@app.get("/api/v1/health", response_model=Health)
def health():
    is_gemini = settings.llm_provider == "gemini" or (
        not settings.anthropic_api_key and bool(settings.gemini_api_key)
    )
    configured = bool(settings.gemini_api_key) if is_gemini else bool(settings.anthropic_api_key)
    model = (
        settings.llm_model
        if (settings.llm_model and (not is_gemini or settings.llm_model.startswith("gemini-")))
        else ("gemini-2.5-flash" if is_gemini else "claude-sonnet-4-6")
    )
    return Health(
        status="ok",
        real_provider_configured=configured,
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


class ProjectInput(Schema):
    url: str = Field(max_length=300)
    name: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=2000)
    contribution: str = Field(default="", max_length=4000)


@app.post("/api/v1/projects", response_model=Document)
def project_create(body: ProjectInput):
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
