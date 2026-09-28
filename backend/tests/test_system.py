import base64
import threading
import time

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import core, tasks
from app.core import Assessment, Base, Requirement, all_records, get, save
from app.demo import load_demo
from app.ingestion import GitHub, exclusion, index_file, parse_url
from app.main import app, check_requirements
from app.providers import DemoProvider, RealProvider
from app.retrieval import retrieve, validate_assessment


@pytest.fixture(autouse=True)
def database(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path}/test.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    monkeypatch.setattr(core, "Session", sessionmaker(engine, expire_on_commit=False))
    yield
    engine.dispose()


def wait_task(c, id):
    for _ in range(300):
        t = c.get("/api/v1/tasks/" + id).json()["data"]
        if t["status"] not in {"queued", "running"}:
            return t
        time.sleep(0.01)
    raise AssertionError("Worker timeout")


@pytest.mark.parametrize(
    "url",
    [
        "http://github.com/a/b",
        "https://github.com.evil/a/b",
        "https://user@github.com/a/b",
        "https://github.com/a/b?x=1",
        "https://127.0.0.1/a/b",
        "https://github.com/a/..",
        "https://github.com/a/b/tree/main",
    ],
)
def test_url_rejects_ssrf(url):
    with pytest.raises(ValueError):
        parse_url(url)


def test_url_canonical():
    assert parse_url("https://github.com/openai/example.git") == ("openai", "example")


@pytest.mark.parametrize(
    "path,mode",
    [
        (".env.production", "100644"),
        ("src/key.pem", "100644"),
        ("node_modules/x.js", "100644"),
        ("dist/a.js", "100644"),
        ("src/a.py", "120000"),
        ("submodule", "160000"),
        ("a.min.js", "100644"),
        ("a.png", "100644"),
    ],
)
def test_exclusion(path, mode):
    assert exclusion(path, mode=mode)


def test_redaction():
    text = core.redact('password="secretvalue123"\nsk-ant-api03-sensitive-secret\nhello')
    assert "secretvalue" not in text and "sk-ant-" not in text and "hello" in text


def citation_setup():
    p = save("project", {"url": "https://github.com/example/repo"})
    s = save("snapshot", {"project_id": p["id"], "sha": "a" * 40, "demo": False})
    index_file(s["id"], "src/file.py", "one\r\ntwo\r\nthree\n")
    return s, all_records("chunk")[0]


def test_citation_lines_and_commit():
    s, c = citation_setup()
    r = Assessment(
        status="supported",
        explanation="x",
        limitations=[],
        evidence=[{"chunk_id": c["id"], "quote": "two\nthree", "relation": "test"}],
    )
    e = validate_assessment(r, [c], [s["id"]], {"verifiability": "code", "category": "technology"})[
        "evidence"
    ][0]
    assert (e["start"], e["end"]) == (2, 3)
    assert "/blob/" + "a" * 40 + "/" in e["url"]
    assert get(c["file_id"])["text"] == "one\ntwo\nthree\n"


@pytest.mark.parametrize("variant", ["unknown", "altered", "wrong_snapshot", "not_sent"])
def test_invalid_citations_downgrade(variant):
    s, c = citation_setup()
    r = Assessment(
        status="supported",
        explanation="x",
        limitations=[],
        evidence=[
            {
                "chunk_id": "invented" if variant == "unknown" else c["id"],
                "quote": "altered" if variant == "altered" else "two",
                "relation": "test",
            }
        ],
    )
    v = validate_assessment(
        r,
        [] if variant == "not_sent" else [c],
        [] if variant == "wrong_snapshot" else [s["id"]],
        {"verifiability": "code", "category": "technology"},
    )
    assert v["status"] == "not_evidenced" and v["invalid_citations"]


def test_external_cannot_be_supported():
    s, c = citation_setup()
    r = Assessment(
        status="supported",
        explanation="x",
        limitations=[],
        evidence=[{"chunk_id": c["id"], "quote": "two", "relation": "test"}],
    )
    assert (
        validate_assessment(r, [c], [s["id"]], {"verifiability": "external", "category": "experience"})[
            "status"
        ]
        == "not_verifiable_from_code"
    )


def test_chunks():
    index_file("snap", "a.py", "\n".join(str(i) for i in range(90)))
    c = all_records("chunk")[1]
    assert c["start"] == 33 and c["end"] == 72 and c["text"].splitlines()[0] == "32"


def mock_github(truncated=False, error=0):
    def handle(req):
        assert req.url.host == "api.github.com"
        if error:
            return httpx.Response(error, headers={"x-ratelimit-reset": "123456"}, json={})
        p = req.url.path
        if "/commits/" in p:
            return httpx.Response(200, json={"sha": "b" * 40})
        if "/git/trees/" in p:
            return httpx.Response(
                200,
                json={
                    "truncated": truncated,
                    "tree": [
                        {"path": "src/a.py", "type": "blob", "mode": "100644", "size": 4, "sha": "c" * 40},
                        {"path": ".env", "type": "blob", "mode": "100644", "size": 8, "sha": "d" * 40},
                    ],
                },
            )
        if "/git/blobs/" in p:
            return httpx.Response(200, json={"content": base64.b64encode(b"x=1\n").decode()})
        return httpx.Response(200, json={"private": False, "default_branch": "main"})

    return httpx.Client(base_url="https://api.github.com", transport=httpx.MockTransport(handle))


def test_partial_import():
    p = save("project", {"owner": "o", "repository": "r"})
    s = GitHub(mock_github(True)).import_repo(p, "main")
    assert s["partial"] and s["file_count"] == 1 and s["sha"] == "b" * 40
    assert s["discarded"][0]["reason"] == "sensitive or generated file"


@pytest.mark.parametrize("code", [403, 429, 404, 302])
def test_github_errors(code):
    with pytest.raises(ValueError):
        GitHub(mock_github(error=code)).request("/repos/a/b")


def test_import_limit(monkeypatch):
    monkeypatch.setattr(core.settings, "max_files", 0)
    p = save("project", {"owner": "o", "repository": "r"})
    s = GitHub(mock_github()).import_repo(p, "main")
    assert s["file_count"] == 0 and s["partial"]


def test_requirements_and_version():
    with pytest.raises(ValueError):
        check_requirements([Requirement(text="Python", quote="invented", offset=0)], "Python")
    assert (
        check_requirements(
            [Requirement(text="extra", provenance="manual", quote="fake", offset=10)], "Python"
        )[0]["offset"]
        is None
    )
    with TestClient(app) as c:
        d = c.post("/api/v1/demo", json={}).json()
        j = c.get("/api/v1/job-postings/" + d["job_id"]).json()["data"]
        body = {"requirements": j["requirements"], "version": j["requirements_version"]}
        assert c.put("/api/v1/job-postings/" + d["job_id"] + "/requirements", json=body).status_code == 200
        assert c.put("/api/v1/job-postings/" + d["job_id"] + "/requirements", json=body).status_code == 409


def test_full_demo_review_export_duplicate():
    with TestClient(app) as c:
        d = c.post("/api/v1/demo", json={}).json()
        body = {**d, "mode": "demo", "request_id": "same"}
        response = c.post("/api/v1/analyses", json=body)
        assert response.status_code == 200, response.text
        t = response.json()
        assert c.post("/api/v1/analyses", json=body).json()["id"] == t["id"]
        task = wait_task(c, t["id"])
        assert task["status"] == "complete", task
        rows = c.get("/api/v1/analyses/" + task["analysis_id"] + "/assessments").json()
        assert {x["data"]["status"] for x in rows} == {
            "supported",
            "partial",
            "not_evidenced",
            "not_verifiable_from_code",
        }
        a = next(x for x in rows if x["data"]["status"] == "supported")
        r = c.post(
            "/api/v1/assessments/" + a["id"] + "/reviews",
            json={"status": "partial", "reason": "Personal contribution needs explanation."},
        ).json()["data"]
        assert r["original"]["status"] == "supported" and r["reviews"][0]["previous"] == "supported"
        exported = c.get("/api/v1/analyses/" + task["analysis_id"] + "/export?format=json").json()
        assert "source_text" not in str(exported["assessments"][0]["evidence"])
        assert c.get("/api/v1/analyses/" + task["analysis_id"] + "/export?format=markdown").status_code == 200
        assert len(all_records("analysis")) == 1


def test_injection():
    d = load_demo()
    r = get(d["job_id"])["requirements"][2]
    assert (
        DemoProvider().assess_requirements(r, retrieve(r["text"], d["snapshot_ids"])).status
        == "not_evidenced"
    )
    assert any("Ignore previous" in c["text"] for c in all_records("chunk"))


def test_missing_key(monkeypatch):
    monkeypatch.setattr(core.settings, "anthropic_api_key", "")
    with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
        RealProvider()


def test_provider_malformed(monkeypatch):
    def malformed(*args):
        return Assessment.model_validate({"status": "imaginary"})

    monkeypatch.setattr(DemoProvider, "assess_requirements", malformed)
    with TestClient(app) as c:
        d = c.post("/api/v1/demo", json={}).json()
        t = c.post("/api/v1/analyses", json={**d, "mode": "demo", "request_id": "broken"}).json()
        result = wait_task(c, t["id"])
        assert result["status"] == "failed"
        assert c.get("/api/v1/analyses/" + result["analysis_id"] + "/export").status_code == 400


def test_recovery():
    t = save("task", {"status": "running", "key": "old"})
    tasks.recover()
    assert get(t["id"])["status"] == "interrupted"


def test_cancel():
    entered = threading.Event()
    release = threading.Event()

    def work(check):
        entered.set()
        release.wait(2)
        check("next")
        raise AssertionError("Advanced")

    t = tasks.submit("test", "cancel-test", work)
    entered.wait(2)
    with tasks.lock:
        save("task", {**get(t["id"]), "cancel_requested": True}, t["id"])
    release.set()
    for _ in range(200):
        if get(t["id"])["status"] == "cancelled":
            break
        time.sleep(0.01)
    assert get(t["id"])["status"] == "cancelled"


def test_origin():
    with TestClient(app) as c:
        assert c.post("/api/v1/demo", json={}, headers={"Origin": "https://evil.example"}).status_code == 403


def test_private_key_redaction_preserves_lines():
    text = "before\n-----BEGIN PRIVATE KEY-----\nsecret material\n-----END PRIVATE KEY-----\nafter"
    redacted = core.redact(text)
    assert redacted.count("\n") == text.count("\n")
    assert "secret material" not in redacted
    assert redacted.splitlines()[4] == "after"


def test_readme_without_extension():
    assert exclusion("README") is None


def test_concurrent_duplicate_analysis():
    from concurrent.futures import ThreadPoolExecutor

    with TestClient(app) as c:
        d = c.post("/api/v1/demo", json={}).json()
        body = {**d, "mode": "demo", "request_id": "concurrent"}
        with ThreadPoolExecutor(2) as pool:
            responses = list(pool.map(lambda _: c.post("/api/v1/analyses", json=body), range(2)))
        assert responses[0].json()["id"] == responses[1].json()["id"]
        assert len(all_records("analysis")) == 1
        assert wait_task(c, responses[0].json()["id"])["status"] == "complete"


def test_employment_even_when_model_miscategorizes():
    s, c = citation_setup()
    r = Assessment(
        status="supported",
        explanation="x",
        limitations=[],
        evidence=[{"chunk_id": c["id"], "quote": "two", "relation": "test"}],
    )
    result = validate_assessment(
        r,
        [c],
        [s["id"]],
        {"text": "Three years of professional experience", "verifiability": "code", "category": "technology"},
    )
    assert result["status"] == "not_verifiable_from_code"


def test_complete_task_always_has_complete_analysis(monkeypatch):
    original_save = tasks.save
    observed = []

    def observed_save(kind, data, id=None):
        if kind == "task" and data.get("status") == "complete" and data.get("analysis_id"):
            observed.append(get(data["analysis_id"])["status"])
        return original_save(kind, data, id)

    monkeypatch.setattr(tasks, "save", observed_save)
    with TestClient(app) as c:
        d = c.post("/api/v1/demo", json={}).json()
        t = c.post("/api/v1/analyses", json={**d, "mode": "demo", "request_id": "completion-order"}).json()
        assert wait_task(c, t["id"])["status"] == "complete"
    assert observed == ["complete"]


def test_full_queue_leaves_no_orphan_analysis():
    with TestClient(app) as c:
        d = c.post("/api/v1/demo", json={}).json()
        for i in range(core.settings.task_workers * 4):
            save("task", {"status": "queued", "key": f"occupied-{i}"})
        r = c.post("/api/v1/analyses", json={**d, "mode": "demo", "request_id": "full-queue"})
        assert r.status_code == 400 and "queue is full" in r.text
        assert all_records("analysis") == []


def test_cancel_queued_work_never_calls_provider(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor

    release = threading.Event()
    called = []
    with ThreadPoolExecutor(max_workers=1) as executor:
        blocker = executor.submit(release.wait, 3)
        monkeypatch.setattr(tasks, "executor", executor)
        t = tasks.submit("test", "queued-cancel", lambda check: called.append(True))
        with tasks.lock:
            save("task", {**get(t["id"]), "cancel_requested": True}, t["id"])
        release.set()
        blocker.result()
    assert get(t["id"])["status"] == "cancelled"
    assert called == []


def test_local_dir_ingestion(tmp_path):
    # Create a dummy project structure
    project_dir = tmp_path / "sample_local_project"
    project_dir.mkdir()
    (project_dir / "README.md").write_text("# Sample Project\nA local repository for testing.", encoding="utf-8")
    src_dir = project_dir / "src"
    src_dir.mkdir()
    (src_dir / "main.py").write_text("def hello():\n    return 'world'\n", encoding="utf-8")
    # Ignored directory
    git_dir = project_dir / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_text("[core]\nrepositoryformatversion = 0\n", encoding="utf-8")

    with TestClient(app) as c:
        # Rejection of forbidden system paths
        bad = c.post("/api/v1/projects", json={"local_path": "/etc"})
        assert bad.status_code == 400
        # Valid local path
        res = c.post(
            "/api/v1/projects",
            json={"local_path": str(project_dir), "name": "Local Sample", "description": "Local test repo"},
        )
        assert res.status_code == 200
        proj = res.json()
        assert proj["data"]["local"] is True
        assert proj["data"]["name"] == "Local Sample"

        imp = c.post(f"/api/v1/projects/{proj['id']}/imports", json={"request_id": "test-local-import"})
        assert imp.status_code == 200
        task_data = wait_task(c, imp.json()["id"])
        assert task_data["status"] == "complete"

        snap = get(task_data["result"], "snapshot")
        assert snap["status"] == "complete"
        assert snap["local"] is True
        assert snap["file_count"] == 2  # README.md and src/main.py; .git is excluded


def test_settings_endpoints():
    with TestClient(app) as c:
        # GET settings
        res = c.get("/api/v1/settings")
        assert res.status_code == 200
        data = res.json()
        assert "llm_provider" in data
        assert "gemini_api_key_configured" in data
        assert "anthropic_api_key_configured" in data

        # POST settings update
        update_res = c.post(
            "/api/v1/settings",
            json={
                "llm_provider": "gemini",
                "llm_model": "gemini-2.5-flash",
                "gemini_api_key": "AIzaSyFakeTestKey1234567890abcdef",
            },
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["llm_provider"] == "gemini"
        assert updated["llm_model"] == "gemini-2.5-flash"
        assert updated["gemini_api_key_configured"] is True
        assert "..." in updated["gemini_api_key_preview"]

        # POST settings test with missing key
        test_fail = c.post(
            "/api/v1/settings/test",
            json={"provider": "anthropic", "api_key": ""},
        )
        assert test_fail.status_code == 200
        assert test_fail.json()["success"] is False
        assert "missing" in test_fail.json()["message"].lower() or "no anthropic" in test_fail.json()["message"].lower()

        # Clean up
        c.post(
            "/api/v1/settings",
            json={
                "llm_provider": "",
                "llm_model": "claude-sonnet-4-6",
                "gemini_api_key": "",
                "anthropic_api_key": "",
            },
        )


