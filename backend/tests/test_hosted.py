import socket
from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from test_system import wait_task

from app import core, hosted, main
from app.core import Base, save
from app.main import app


@pytest.fixture(autouse=True)
def database(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path}/hosted.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    monkeypatch.setattr(core, "Session", sessionmaker(engine, expire_on_commit=False))
    yield
    engine.dispose()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(core.settings, "hosted_mode", True)
    monkeypatch.setattr(main, "write_limiter", hosted.RateLimiter(1000))
    with TestClient(app) as c:
        yield c


@pytest.mark.parametrize(
    "ip,public",
    [
        ("93.184.216.34", True),
        ("2606:4700:4700::1111", True),
        ("127.0.0.1", False),
        ("10.0.0.5", False),
        ("172.16.3.1", False),
        ("192.168.1.1", False),
        ("169.254.169.254", False),
        ("0.0.0.0", False),
        ("::1", False),
        ("fe80::1", False),
        ("::ffff:127.0.0.1", False),
        ("not-an-ip", False),
    ],
)
def test_is_public_ip(ip, public):
    assert hosted.is_public_ip(ip) is public


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/admin",
        "http://127.0.0.1:8000/api/v1/settings",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/",
        "http://[::1]/",
        "https://user:pass@93.184.216.34/",
        "ftp://93.184.216.34/",
        "file:///etc/passwd",
    ],
)
def test_url_guard_rejects_internal_targets(url):
    with pytest.raises(ValueError):
        hosted.assert_public_url(url)


def test_url_guard_accepts_public_address():
    hosted.assert_public_url("https://93.184.216.34/jobs")


def test_url_guard_rejects_names_that_resolve_privately(monkeypatch):
    monkeypatch.setattr(
        socket, "getaddrinfo", lambda host, port, *a, **k: [(socket.AF_INET, 0, 0, "", ("10.1.2.3", port))]
    )
    with pytest.raises(ValueError):
        hosted.assert_public_url("https://rebind.example/")


def test_safe_get_checks_every_redirect_hop(monkeypatch):
    addresses = {"public.example": "93.184.216.34", "internal.example": "10.0.0.5"}
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, port, *a, **k: [(socket.AF_INET, 0, 0, "", (addresses[host], port))],
    )

    class Redirect:
        is_redirect = True

        def __init__(self):
            self.headers = {"location": "http://internal.example/secret"}

    @contextmanager
    def fake_stream(method, url, **kwargs):
        assert "internal.example" not in url, "the internal hop must be rejected before it is requested"
        yield Redirect()

    monkeypatch.setattr(hosted.httpx, "stream", fake_stream)
    with pytest.raises(ValueError):
        hosted.safe_get("https://public.example/start", headers={})


def test_rate_limiter_blocks_after_limit_and_recovers(monkeypatch):
    limiter = hosted.RateLimiter(2, window=60)
    assert limiter.allow("a") and limiter.allow("a")
    assert not limiter.allow("a")
    assert limiter.allow("b")
    monkeypatch.setattr(hosted.time, "monotonic", lambda: 1e9)
    assert limiter.allow("a")


def test_client_key_uses_last_forwarded_hop():
    assert hosted.client_key("6.6.6.6, 203.0.113.9", "10.0.0.1") == "203.0.113.9"
    assert hosted.client_key(None, "10.0.0.1") == "10.0.0.1"
    assert hosted.client_key(None, None) == "unknown"


@pytest.mark.parametrize(
    "path,body",
    [
        ("/api/v1/projects", {"local_path": "/etc", "name": "x"}),
        ("/api/v1/projects", {"url": "https://github.com/a/b"}),
        ("/api/v1/projects/abc/imports", {}),
        ("/api/v1/job-postings", {"title": "t", "text": "x" * 20}),
        ("/api/v1/job-postings/fetch-url", {"url": "http://169.254.169.254/"}),
        ("/api/v1/job-postings/abc/extract-requirements", {}),
        ("/api/v1/settings", {"gemini_api_key": "AIzaStolen"}),
        ("/api/v1/settings/test", {"provider": "github", "api_key": "x"}),
        ("/api/v1/assessments/abc/reviews", {"status": "partial", "reason": "abc"}),
        ("/api/v1/tasks/abc/cancel", {}),
        ("/api/v1/analyses/abc/cancel", {}),
    ],
)
def test_hosted_blocks_server_side_capabilities(client, path, body):
    r = client.post(path, json=body)
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "hosted_mode"


def test_hosted_health_and_settings_reveal_nothing(client, monkeypatch):
    monkeypatch.setattr(core.settings, "gemini_api_key", "AIzaServerSecretKey123456789012345678")
    monkeypatch.setattr(core.settings, "github_token", "ghp_serversecrettoken1234567890123456789")
    health = client.get("/api/v1/health").json()
    assert health["hosted"] is True and health["real_provider_configured"] is False
    view = client.get("/api/v1/settings").json()
    assert not any("Secret" in str(v) or "secret" in str(v) for v in view.values())
    assert view["gemini_api_key_configured"] is False and view["github_token_configured"] is False


def test_hosted_never_uses_the_servers_keys(monkeypatch):
    monkeypatch.setattr(core.settings, "hosted_mode", True)
    monkeypatch.setattr(core.settings, "gemini_api_key", "AIzaServerSecretKey123456789012345678")
    monkeypatch.setattr(core.settings, "llm_provider", "gemini")
    from app.providers import DemoProvider, provider

    assert isinstance(provider("demo"), DemoProvider)
    with pytest.raises(ValueError):  # real mode is refused rather than silently using the server key
        provider("real")


def test_hosted_rejects_real_analyses(client):
    d = client.post("/api/v1/demo", json={}).json()
    r = client.post("/api/v1/analyses", json={**d, "mode": "real", "request_id": "r1"})
    assert r.status_code == 400


def test_hosted_demo_flow_shares_one_analysis_and_does_not_mutate_it(client):
    d = client.post("/api/v1/demo", json={}).json()
    first = client.post("/api/v1/analyses", json={**d, "mode": "demo", "request_id": "visitor-1"}).json()
    second = client.post("/api/v1/analyses", json={**d, "mode": "demo", "request_id": "visitor-2"}).json()
    assert first["id"] == second["id"]
    task = wait_task(client, first["id"])
    assert task["status"] == "complete", task
    analysis_id = task["analysis_id"]
    assert len(client.get("/api/v1/analyses").json()) == 1

    # job requirements are read-only: the PUT the UI sends is a no-op
    job = client.get("/api/v1/job-postings/" + d["job_id"]).json()["data"]
    saved = client.put(
        "/api/v1/job-postings/" + d["job_id"] + "/requirements",
        json={"requirements": job["requirements"][:1], "version": job["requirements_version"]},
    ).json()["data"]
    assert saved["requirements_version"] == job["requirements_version"]
    assert len(saved["requirements"]) == len(job["requirements"])

    # cover letter and interview work but leave the shared report untouched
    letter = client.post(
        f"/api/v1/analyses/{analysis_id}/cover-letter", json={"language": "en", "tone": "balanced"}
    )
    assert letter.status_code == 200
    assert client.get(f"/api/v1/analyses/{analysis_id}/cover-letter").json() is None
    chat = client.post(
        f"/api/v1/analyses/{analysis_id}/interview/chat",
        json={"messages": [], "language": "en"},
    )
    assert chat.status_code == 200
    assert client.get(f"/api/v1/analyses/{analysis_id}/interview/chat").json() == []
    assert client.get(f"/api/v1/analyses/{analysis_id}/export?format=json").status_code == 200


def test_hosted_hides_records_that_are_not_fixtures(client):
    job = save(
        "job",
        {
            "title": "Private role",
            "text": "secret",
            "canonical_text": "secret",
            "requirements": [],
            "requirements_version": 0,
            "demo": False,
        },
    )
    project = save("project", {"name": "private", "demo": False})
    analysis = save("analysis", {"title": "Private", "mode": "real", "status": "complete", "assessments": []})
    assert client.get("/api/v1/job-postings").json() == []
    assert client.get("/api/v1/projects").json() == []
    assert client.get("/api/v1/analyses").json() == []
    for path in (
        f"/api/v1/job-postings/{job['id']}",
        f"/api/v1/projects/{project['id']}",
        f"/api/v1/analyses/{analysis['id']}",
        f"/api/v1/analyses/{analysis['id']}/assessments",
        f"/api/v1/analyses/{analysis['id']}/export",
    ):
        assert client.get(path).status_code == 400, path


def test_hosted_rate_limits_writes(client, monkeypatch):
    monkeypatch.setattr(main, "write_limiter", hosted.RateLimiter(2))
    codes = [client.post("/api/v1/demo", json={}).status_code for _ in range(4)]
    assert codes[:2] == [200, 200]
    assert codes[2:] == [429, 429]
    assert client.get("/api/v1/health").status_code == 200


def test_local_mode_is_unchanged(monkeypatch):
    monkeypatch.setattr(core.settings, "hosted_mode", False)
    with TestClient(app) as c:
        assert c.get("/api/v1/health").json()["hosted"] is False
        r = c.post(
            "/api/v1/job-postings", json={"title": "Local role", "text": "Required: Python experience."}
        )
        assert r.status_code == 200
        assert len(c.get("/api/v1/job-postings").json()) == 1


def test_security_headers_on_every_response(client):
    for path in ("/api/v1/health", "/api/v1/projects", "/api/v1/nope"):
        r = client.get(path)
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
        assert "script-src 'self'" in r.headers["content-security-policy"]
        assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        assert "max-age" in r.headers["strict-transport-security"]
        assert r.headers["cache-control"] == "no-store"


def test_blocked_requests_also_carry_security_headers(client):
    r = client.post("/api/v1/settings", json={"gemini_api_key": "x"})
    assert r.status_code == 403
    assert r.headers["x-content-type-options"] == "nosniff"


def test_csp_forbids_inline_and_remote_scripts():
    csp = hosted.CSP
    script_src = next(d for d in csp.split("; ") if d.startswith("script-src"))
    assert script_src == "script-src 'self'"
    assert "default-src 'self'" in csp and "object-src 'none'" in csp


def test_vercel_headers_match_backend_headers():
    import json
    from pathlib import Path

    config = json.loads((Path(__file__).parents[2] / "frontend" / "vercel.json").read_text())
    declared = {h["key"]: h["value"] for rule in config["headers"] for h in rule["headers"]}
    assert declared == hosted.SECURITY_HEADERS
