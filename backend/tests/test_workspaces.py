import json
import time

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import core, hosted, main, providers
from app import workspace as ws
from app.core import Base, all_records, get, save
from app.demo import load_demo
from app.main import app
from app.providers import DemoProvider, GeminiProvider

RealClient = httpx.Client  # kept before tests replace it on the shared httpx module
TOKEN_A = "a" * 40
TOKEN_B = "b" * 40
KEY_A = "AIzaSyVisitorAKeyThatMustNeverBeStored123"


@pytest.fixture(autouse=True)
def database(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path}/ws.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    monkeypatch.setattr(core, "Session", sessionmaker(engine, expire_on_commit=False))
    yield
    engine.dispose()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(core.settings, "hosted_mode", True)
    monkeypatch.setattr(core.settings, "hosted_byok", True)
    monkeypatch.setattr(main, "write_limiter", hosted.RateLimiter(10_000))
    with TestClient(app) as c:
        yield c


def wait_task(c, id, headers=None):
    for _ in range(300):
        t = c.get("/api/v1/tasks/" + id, headers=headers or {}).json()["data"]
        if t["status"] not in {"queued", "running"}:
            return t
        time.sleep(0.01)
    raise AssertionError("Worker timeout")


def h(token, key=None, provider="gemini", model=None):
    headers = {"X-Workspace": token}
    if key:
        headers.update({"X-AI-Provider": provider, "X-AI-Key": key})
        if model:
            headers["X-AI-Model"] = model
    return headers


def make_private_data(token):
    """A job + projects + snapshots that belong to one workspace (the fixture content, but not shared)."""
    reset = core.current_workspace.set(ws.workspace_from_token(token))
    try:
        d = load_demo()
        for sid in d["snapshot_ids"]:
            snap = get(sid, "snapshot")
            save("snapshot", {**snap, "demo": False}, sid)
            project = get(snap["project_id"], "project")
            save("project", {**project, "demo": False}, project["id"])
        job = get(d["job_id"], "job")
        save("job", {**job, "demo": False}, d["job_id"])
        return d
    finally:
        core.current_workspace.reset(reset)


# ------------------------------------------------------------------------------------------ identity


def test_token_to_workspace_is_a_hash_and_rejects_junk():
    assert ws.workspace_from_token(TOKEN_A) != TOKEN_A
    assert ws.workspace_from_token(TOKEN_A) == ws.workspace_from_token(TOKEN_A)
    assert ws.workspace_from_token(TOKEN_A) != ws.workspace_from_token(TOKEN_B)
    for junk in (None, "", "short", "x" * 100, "has spaces " * 4, "../../etc/passwd" * 3):
        assert ws.workspace_from_token(junk) is None


def test_credentials_are_validated_and_never_printed():
    creds = ws.credentials_from_headers("gemini", KEY_A, "gemini-3.8-flash")
    assert creds and creds.provider == "gemini"
    assert KEY_A not in repr(creds) and KEY_A not in str(creds)
    assert ws.credentials_from_headers("evil", KEY_A, None) is None
    assert ws.credentials_from_headers("gemini", "short", None) is None
    assert ws.credentials_from_headers("gemini", "has space in it 123456", None) is None
    assert ws.credentials_from_headers("gemini", KEY_A + "\n", None).key == KEY_A
    assert ws.credentials_from_headers("gemini", KEY_A, "bad model!;").model == ""


def test_save_keeps_workspace_fields_when_a_record_is_rebuilt():
    reset = core.current_workspace.set("ws-1")
    try:
        record = save("job", {"title": "t"})
    finally:
        core.current_workspace.reset(reset)
    assert get(record["id"])["_ws"] == "ws-1"
    save("job", {"title": "changed"}, record["id"])  # rebuilt without the bookkeeping fields
    assert get(record["id"])["_ws"] == "ws-1" and get(record["id"])["title"] == "changed"


# ------------------------------------------------------------------------------------------ routes


def test_workspace_routes_need_a_valid_workspace(client):
    for headers in ({}, {"X-Workspace": "short"}):
        r = client.post("/api/v1/job-postings", json={"title": "t", "text": "x" * 20}, headers=headers)
        assert r.status_code == 403 and r.json()["error"]["code"] == "workspace_required"
    r = client.post("/api/v1/job-postings", json={"title": "t", "text": "x" * 20}, headers=h(TOKEN_A))
    assert r.status_code == 200


@pytest.mark.parametrize(
    "path,body",
    [
        ("/api/v1/job-postings/fetch-url", {"url": "http://169.254.169.254/"}),
        ("/api/v1/settings", {"gemini_api_key": "AIzaStolen"}),
    ],
)
def test_server_side_capabilities_stay_blocked_even_for_a_workspace(client, path, body):
    r = client.post(path, json=body, headers=h(TOKEN_A, KEY_A))
    assert r.status_code == 403 and r.json()["error"]["code"] == "hosted_mode"


def test_server_filesystem_and_server_token_are_never_reachable(client):
    r = client.post("/api/v1/projects", json={"local_path": "/etc", "name": "x"}, headers=h(TOKEN_A))
    assert r.status_code == 400
    r = client.post("/api/v1/settings/test", json={"provider": "github", "api_key": "x"}, headers=h(TOKEN_A))
    assert r.status_code == 400


def test_cors_preflight_allows_the_workspace_headers(client):
    r = client.options(
        "/api/v1/analyses",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-workspace,x-ai-key,x-ai-provider,content-type",
        },
    )
    assert r.status_code == 200
    allowed = r.headers["access-control-allow-headers"].lower()
    assert all(name in allowed for name in ("x-workspace", "x-ai-key", "x-ai-provider"))


# ------------------------------------------------------------------------------------------ isolation


def test_workspaces_cannot_see_or_change_each_others_data(client):
    created = client.post(
        "/api/v1/job-postings",
        json={"title": "Secret role", "text": "Required: Python and the private details."},
        headers=h(TOKEN_A),
    ).json()
    jid = created["id"]
    assert [j["id"] for j in client.get("/api/v1/job-postings", headers=h(TOKEN_A)).json()] == [jid]
    assert client.get("/api/v1/job-postings", headers=h(TOKEN_B)).json() == []
    assert client.get("/api/v1/job-postings").json() == []  # no workspace at all
    for headers in (h(TOKEN_B), {}):
        assert client.get(f"/api/v1/job-postings/{jid}", headers=headers).status_code == 400
        assert client.get(f"/api/v1/job-postings/{jid}/requirements", headers=headers).status_code == 400
        r = client.put(
            f"/api/v1/job-postings/{jid}/requirements",
            json={"requirements": [], "version": 0},
            headers=headers,
        )
        assert r.status_code == 400
    # B cannot even trigger extraction on A's job
    r = client.post(
        f"/api/v1/job-postings/{jid}/extract-requirements", json={"mode": "real"}, headers=h(TOKEN_B, KEY_A)
    )
    assert r.status_code == 400


def test_internal_bookkeeping_never_reaches_a_response(client):
    client.post("/api/v1/job-postings", json={"title": "t", "text": "x" * 20}, headers=h(TOKEN_A))
    body = client.get("/api/v1/job-postings", headers=h(TOKEN_A)).text
    assert "_ws" not in body and "_ts" not in body


def test_real_analysis_is_private_end_to_end(client, monkeypatch):
    monkeypatch.setattr(main, "provider", lambda mode: DemoProvider())  # a stand-in for the visitor's model
    d = make_private_data(TOKEN_A)
    body = {**d, "mode": "real", "request_id": "r1"}
    task = client.post("/api/v1/analyses", json=body, headers=h(TOKEN_A, KEY_A)).json()
    done = wait_task(client, task["id"], h(TOKEN_A))
    assert done["status"] == "complete", done
    aid = done["analysis_id"]

    for path in (
        f"/api/v1/analyses/{aid}",
        f"/api/v1/analyses/{aid}/assessments",
        f"/api/v1/analyses/{aid}/export?format=json",
        f"/api/v1/analyses/{aid}/cover-letter",
        f"/api/v1/analyses/{aid}/interview/chat",
        f"/api/v1/tasks/{task['id']}",
    ):
        assert client.get(path, headers=h(TOKEN_A)).status_code == 200, path
        for headers in (h(TOKEN_B), {}):
            r = client.get(path, headers=headers)
            assert r.status_code == 400, (path, r.text)
    assert client.get("/api/v1/analyses", headers=h(TOKEN_B)).json() == []

    # B cannot review, cancel, chat in, or reuse A's snapshots for its own analysis
    assessment = client.get(f"/api/v1/analyses/{aid}/assessments", headers=h(TOKEN_A)).json()[0]
    review = {"status": "partial", "reason": "not yours"}
    assert (
        client.post(
            f"/api/v1/assessments/{assessment['id']}/reviews", json=review, headers=h(TOKEN_B)
        ).status_code
        == 400
    )
    assert (
        client.get(f"/api/v1/assessments/{assessment['id']}/evidence", headers=h(TOKEN_B)).status_code == 400
    )
    assert client.post(f"/api/v1/tasks/{task['id']}/cancel", json={}, headers=h(TOKEN_B)).status_code == 400
    assert client.post(f"/api/v1/analyses/{aid}/cancel", json={}, headers=h(TOKEN_B)).status_code == 400
    chat = {"messages": [], "language": "en"}
    assert (
        client.post(
            f"/api/v1/analyses/{aid}/interview/chat", json=chat, headers=h(TOKEN_B, KEY_A)
        ).status_code
        == 400
    )
    stolen = {"job_id": d["job_id"], "snapshot_ids": d["snapshot_ids"], "mode": "real", "request_id": "x"}
    assert client.post("/api/v1/analyses", json=stolen, headers=h(TOKEN_B, KEY_A)).status_code == 400
    for sid in d["snapshot_ids"]:
        assert client.get(f"/api/v1/snapshots/{sid}", headers=h(TOKEN_B)).status_code == 400
        assert client.get(f"/api/v1/snapshots/{sid}/chunks", headers=h(TOKEN_B)).status_code == 400

    # the owner can review and the review is stored on their data
    ok = client.post(f"/api/v1/assessments/{assessment['id']}/reviews", json=review, headers=h(TOKEN_A))
    assert ok.status_code == 200, ok.text
    exported = client.get(f"/api/v1/analyses/{aid}/export?format=json", headers=h(TOKEN_A)).text
    assert "_ws" not in exported and "_ts" not in exported


def test_the_visitors_key_is_never_stored(client, monkeypatch):
    monkeypatch.setattr(main, "provider", lambda mode: DemoProvider())
    d = make_private_data(TOKEN_A)
    task = client.post(
        "/api/v1/analyses", json={**d, "mode": "real", "request_id": "k"}, headers=h(TOKEN_A, KEY_A)
    ).json()
    assert wait_task(client, task["id"], h(TOKEN_A))["status"] == "complete"
    for kind in (
        "project",
        "snapshot",
        "job",
        "analysis",
        "assessment",
        "task",
        "chunk",
        "file",
        "trial_usage",
    ):
        assert KEY_A not in json.dumps(all_records(kind)), kind


def test_real_analysis_without_a_key_explains_what_to_do(client):
    d = make_private_data(TOKEN_A)
    body = {**d, "mode": "real", "request_id": "nokey"}
    for headers in (h(TOKEN_A), {**h(TOKEN_A), "X-AI-Provider": "bogus", "X-AI-Key": KEY_A}):
        r = client.post("/api/v1/analyses", json=body, headers=headers)
        assert r.status_code == 400 and "AI key" in r.json()["error"]["message"]


def test_a_failing_provider_never_echoes_the_key(monkeypatch):
    def deny(*args, **kwargs):
        return RealClient(
            transport=httpx.MockTransport(
                lambda request: httpx.Response(401, json={"error": request.headers.get("x-goog-api-key")})
            )
        )

    monkeypatch.setattr(providers.httpx, "Client", deny)
    provider = GeminiProvider(api_key=KEY_A)
    with pytest.raises(ValueError) as caught:
        provider.call("instruction", {"data": 1}, core.Requirements)
    assert KEY_A not in str(caught.value) and KEY_A not in repr(caught.value)


# ------------------------------------------------------------------------------------------ shared demo


def test_the_shared_demo_works_for_everyone_and_is_read_only(client):
    d = client.post("/api/v1/demo", json={}, headers=h(TOKEN_A)).json()
    body = {**d, "mode": "demo", "request_id": "x"}
    first = client.post("/api/v1/analyses", json=body, headers=h(TOKEN_A)).json()
    second = client.post("/api/v1/analyses", json=body, headers=h(TOKEN_B)).json()
    assert first["id"] == second["id"]
    done = wait_task(client, first["id"])
    assert done["status"] == "complete"
    aid = done["analysis_id"]
    # B can poll and read the task and the report that A started
    assert client.get(f"/api/v1/tasks/{first['id']}", headers=h(TOKEN_B)).status_code == 200
    assert client.get(f"/api/v1/analyses/{aid}", headers=h(TOKEN_B)).status_code == 200
    # but nobody can change or cancel the shared report
    row = client.get(f"/api/v1/analyses/{aid}/assessments", headers=h(TOKEN_A)).json()[0]
    review = {"status": "partial", "reason": "tampering"}
    for token in (TOKEN_A, TOKEN_B):
        assert (
            client.post(f"/api/v1/assessments/{row['id']}/reviews", json=review, headers=h(token)).status_code
            == 400
        )
        assert (
            client.post(f"/api/v1/tasks/{first['id']}/cancel", json={}, headers=h(token)).status_code == 400
        )
        letter = client.post(
            f"/api/v1/analyses/{aid}/cover-letter",
            json={"language": "en", "tone": "balanced"},
            headers=h(token),
        )
        assert letter.status_code == 200
    assert client.get(f"/api/v1/analyses/{aid}/cover-letter", headers=h(TOKEN_A)).json() is None


# ------------------------------------------------------------------------------------------ quotas, deletion, purge


def test_workspace_quotas(client, monkeypatch):
    monkeypatch.setattr(core.settings, "workspace_max_jobs", 2)
    body = {"title": "t", "text": "Required: something real."}
    assert client.post("/api/v1/job-postings", json=body, headers=h(TOKEN_A)).status_code == 200
    assert client.post("/api/v1/job-postings", json=body, headers=h(TOKEN_A)).status_code == 200
    third = client.post("/api/v1/job-postings", json=body, headers=h(TOKEN_A))
    assert third.status_code == 400 and "limit" in third.json()["error"]["message"].lower()
    assert (
        client.post("/api/v1/job-postings", json=body, headers=h(TOKEN_B)).status_code == 200
    )  # per workspace

    monkeypatch.setattr(main, "provider", lambda mode: DemoProvider())
    monkeypatch.setattr(core.settings, "workspace_max_analyses", 1)
    d = make_private_data(TOKEN_B)
    first = client.post(
        "/api/v1/analyses", json={**d, "mode": "real", "request_id": "1"}, headers=h(TOKEN_B, KEY_A)
    )
    assert first.status_code == 200
    wait_task(client, first.json()["id"], h(TOKEN_B))
    second = client.post(
        "/api/v1/analyses", json={**d, "mode": "real", "request_id": "2"}, headers=h(TOKEN_B, KEY_A)
    )
    assert second.status_code == 400


def test_a_visitor_can_erase_their_workspace(client):
    client.post("/api/v1/job-postings", json={"title": "a", "text": "Required: python."}, headers=h(TOKEN_A))
    client.post("/api/v1/job-postings", json={"title": "b", "text": "Required: python."}, headers=h(TOKEN_B))
    client.post("/api/v1/demo", json={}, headers=h(TOKEN_A))
    result = client.post("/api/v1/workspace/delete", json={}, headers=h(TOKEN_A))
    assert result.status_code == 200 and result.json()["deleted"] >= 1
    assert (
        client.get("/api/v1/job-postings", headers=h(TOKEN_A)).json() != []
    )  # only the shared fixture remains
    assert all(j["data"]["demo"] for j in client.get("/api/v1/job-postings", headers=h(TOKEN_A)).json())
    assert len(client.get("/api/v1/job-postings", headers=h(TOKEN_B)).json()) == 2  # B's own + fixture
    assert client.post("/api/v1/workspace/delete", json={}).status_code == 403


def test_expired_workspaces_are_purged_but_fixtures_and_usage_are_not(client):
    mine = ws.workspace_from_token(TOKEN_A)
    reset = core.current_workspace.set(mine)
    try:
        old = save("job", {"title": "old"})
        fresh = save("job", {"title": "fresh"})
    finally:
        core.current_workspace.reset(reset)
    save("job", {**get(old["id"]), "_ts": time.time() - 48 * 3600}, old["id"])
    client.post("/api/v1/demo", json={}, headers=h(TOKEN_B))
    save("trial_usage", {"day": "d", "total": 1, "by_workspace": {}}, "trial-usage-d")
    removed = core.purge_expired(24 * 3600)
    assert removed == 1
    ids = {j["id"] for j in all_records("job")}
    assert old["id"] not in ids and fresh["id"] in ids
    assert any(j.get("demo") for j in all_records("job"))
    assert get("trial-usage-d", "trial_usage")


def test_health_reports_byok_without_leaking_anything(client, monkeypatch):
    monkeypatch.setattr(core.settings, "gemini_api_key", "AIzaServerSecretKey123456789012345678")
    health = client.get("/api/v1/health").json()
    assert health["hosted"] is True and health["byok"] is True
    assert "Secret" not in json.dumps(health)


# ------------------------------------------------------------------------------------------ trial on the owner's key


def trial(monkeypatch, daily=3, per_workspace=2, until="", key="AIzaOwnerKeyForTheTrial1234567890123"):
    monkeypatch.setattr(core.settings, "hosted_mode", True)
    monkeypatch.setattr(core.settings, "hosted_byok", True)
    monkeypatch.setattr(core.settings, "gemini_api_key", key)
    monkeypatch.setattr(core.settings, "trial_daily_calls", daily)
    monkeypatch.setattr(core.settings, "trial_workspace_calls", per_workspace)
    monkeypatch.setattr(core.settings, "trial_until", until)


def test_trial_is_off_by_default_and_fails_closed(monkeypatch):
    monkeypatch.setattr(core.settings, "hosted_mode", True)
    monkeypatch.setattr(core.settings, "hosted_byok", True)
    monkeypatch.setattr(core.settings, "gemini_api_key", "AIzaOwnerKeyForTheTrial1234567890123")
    assert not ws.trial_active()  # daily budget 0
    trial(monkeypatch, until="2000-01-01")
    assert not ws.trial_active()  # expired
    trial(monkeypatch, until="not-a-date")
    assert not ws.trial_active()  # unparsable expiry fails closed
    trial(monkeypatch, key="")
    monkeypatch.setattr(core, "SERVER_DEFAULT_GEMINI_KEY", "")
    monkeypatch.setattr(ws, "SERVER_DEFAULT_GEMINI_KEY", "")
    assert not ws.trial_active()  # no key
    trial(monkeypatch, until="2999-01-01")
    assert ws.trial_active()


def test_trial_budget_caps_calls_per_workspace_and_per_day(monkeypatch):
    trial(monkeypatch, daily=3, per_workspace=2)
    a, b = ws.CallBudget("wsA"), ws.CallBudget("wsB")
    a.consume()
    a.consume()
    with pytest.raises(ValueError, match="trial quota"):
        a.consume()  # workspace cap
    b.consume()
    with pytest.raises(ValueError, match="trial quota"):
        b.consume()  # daily cap (3 used)
    assert ws.trial_status() == {"available": False, "remaining": 0}


def test_hosted_provider_prefers_the_visitors_key_then_the_trial_then_refuses(monkeypatch):
    trial(monkeypatch)
    reset_ws = core.current_workspace.set(ws.workspace_from_token(TOKEN_A))
    try:
        mine = ws.current_ai.set(ws.AICredentials("gemini", KEY_A))
        try:
            p = providers.provider("real")
            assert isinstance(p, GeminiProvider) and p.budget is None  # their own key is never metered
        finally:
            ws.current_ai.reset(mine)
        p = providers.provider("real")
        assert isinstance(p, GeminiProvider) and p.budget is not None  # trial on the owner's key, metered
        monkeypatch.setattr(core.settings, "trial_daily_calls", 0)
        with pytest.raises(ValueError, match="AI key"):
            providers.provider("real")
    finally:
        core.current_workspace.reset(reset_ws)


def test_trial_metering_happens_before_the_network_call(monkeypatch):
    trial(monkeypatch, daily=1, per_workspace=1)
    calls = []

    def factory(*args, **kwargs):
        return RealClient(
            transport=httpx.MockTransport(lambda request: calls.append(1) or httpx.Response(500))
        )

    monkeypatch.setattr(providers.httpx, "Client", factory)
    reset = core.current_workspace.set(ws.workspace_from_token(TOKEN_A))
    try:
        p = providers.provider("real")
        with pytest.raises(ValueError):
            p.call("i", {}, core.Requirements)  # consumes the only call, then the network answers 500
        with pytest.raises(ValueError, match="trial quota"):
            p.call("i", {}, core.Requirements)  # refused before touching the network
    finally:
        core.current_workspace.reset(reset)
    assert len(calls) <= 2  # the second call never reached the network (retries aside)
