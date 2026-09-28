"""Exercise the installed official SDK through an in-memory HTTP transport."""

import json

import anthropic
import httpx2
import pytest
from pydantic import ValidationError

from app.core import Assessment, redact, settings
from app.main import check_requirements
from app.providers import RealProvider


def provider_with_response(monkeypatch, content, stop_reason="end_turn", status=200):
    seen = []

    def handle(request):
        seen.append(json.loads(request.content))
        if status != 200:
            return httpx2.Response(
                status,
                json={
                    "type": "error",
                    "error": {"type": "authentication_error", "message": "Invalid API key"},
                },
            )
        return httpx2.Response(
            200,
            json={
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "model": "claude-sonnet-4-6",
                "content": [{"type": "text", "text": content}],
                "stop_reason": stop_reason,
                "stop_sequence": None,
                "usage": {"input_tokens": 100, "output_tokens": 20},
            },
        )

    monkeypatch.setattr(settings, "anthropic_api_key", "test-key-never-sent-to-network")
    p = RealProvider()
    p.client.close()
    p.client = anthropic.Anthropic(
        api_key="test-only", max_retries=0, http_client=httpx2.Client(transport=httpx2.MockTransport(handle))
    )
    return p, seen


def result_json():
    return json.dumps(
        {"status": "not_evidenced", "explanation": "No relevant source.", "limitations": [], "evidence": []}
    )


def test_official_sdk_schema_usage_and_no_tools(monkeypatch):
    p, seen = provider_with_response(monkeypatch, result_json())
    try:
        result = p.assess_requirements({"text": "Python"}, [])
        assert result.status == "not_evidenced"
        assert p.usage == {"calls": 1, "input_tokens": 100, "output_tokens": 20}
        assert seen[0]["output_config"]["format"]["type"] == "json_schema"
        assert "tools" not in seen[0]
        assert seen[0]["max_tokens"] == settings.max_tokens
    finally:
        p.client.close()


def test_payload_is_valid_json_and_redacts_multiline_secrets(monkeypatch):
    p, seen = provider_with_response(monkeypatch, result_json())
    source = 'password="dont-send-this-secret"\n-----BEGIN PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----\nRequired Python.'
    try:
        p.call("Assess sources.", {"sources": [{"text": source}], "count": 1}, Assessment)
        data = json.loads(seen[0]["messages"][0]["content"])
        text = data["sources"][0]["text"]
        assert "dont-send-this-secret" not in text and "private-material" not in text
        assert text.index("Required Python.") == source.index("Required Python.")
        assert data["count"] == 1
    finally:
        p.client.close()


@pytest.mark.parametrize(
    "text",
    [
        "token=abcdefgh\nRequired Python.",
        'token="abcdefghijklmno"\nRequired Python.',
        "sk-ant-api03-example-long-token\nRequired Python.",
        "-----BEGIN PRIVATE KEY-----\n123456789\n-----END PRIVATE KEY-----\nRequired Python.",
    ],
)
def test_position_preserving_redaction(text):
    redacted = redact(text, preserve_positions=True)
    assert len(redacted) == len(text)
    assert redacted.index("Required Python.") == text.index("Required Python.")
    assert [i for i, c in enumerate(text) if c == "\n"] == [i for i, c in enumerate(redacted) if c == "\n"]
    assert redact(redacted, preserve_positions=True) == redacted


def test_extraction_offsets_after_secret_match_original(monkeypatch):
    text = 'api_key="sensitive-1234567890"\nEs valorarà Python o Java.'
    quote = "Es valorarà Python o Java."
    response = json.dumps(
        {
            "requirements": [
                {
                    "text": "Python or Java",
                    "quote": quote,
                    "offset": text.index(quote),
                    "priority": "preferred",
                }
            ]
        }
    )
    p, seen = provider_with_response(monkeypatch, response)
    try:
        output = p.extract_requirements(text)
        assert check_requirements(output.requirements, text)[0]["priority"] == "preferred"
        sent = json.loads(seen[0]["messages"][0]["content"])["job"]
        assert "sensitive-1234567890" not in sent
        assert sent.index(quote) == text.index(quote)
    finally:
        p.client.close()


@pytest.mark.parametrize("stop_reason", ["max_tokens", "refusal"])
def test_truncation_and_refusal_fail(monkeypatch, stop_reason):
    p, _ = provider_with_response(monkeypatch, result_json(), stop_reason)
    try:
        with pytest.raises(ValueError, match="incomplete or refused"):
            p.assess_requirements({"text": "Python"}, [])
    finally:
        p.client.close()


def test_malformed_schema_fails(monkeypatch):
    p, _ = provider_with_response(monkeypatch, '{"status":"invented"}')
    try:
        with pytest.raises(ValidationError):
            p.assess_requirements({"text": "Python"}, [])
    finally:
        p.client.close()


def test_authentication_error_is_not_demo_fallback(monkeypatch):
    p, _ = provider_with_response(monkeypatch, "", status=401)
    try:
        with pytest.raises(anthropic.AuthenticationError):
            p.assess_requirements({"text": "Python"}, [])
    finally:
        p.client.close()


def test_call_budget_prevents_http_request(monkeypatch):
    p, seen = provider_with_response(monkeypatch, result_json())
    p.usage["calls"] = settings.max_calls
    try:
        with pytest.raises(ValueError, match="budget"):
            p.assess_requirements({"text": "Python"}, [])
        assert seen == []
    finally:
        p.client.close()


def gemini_with_response(monkeypatch, content, finish_reason="STOP", status=200):
    seen = []

    def handle(request):
        seen.append(json.loads(request.content))
        if status != 200:
            return httpx2.Response(status, json={"error": {"code": status, "message": "API Error"}})
        return httpx2.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {"parts": [{"text": content}]},
                        "finishReason": finish_reason,
                    }
                ],
                "usageMetadata": {"promptTokenCount": 150, "candidatesTokenCount": 35},
            },
        )

    monkeypatch.setattr(settings, "gemini_api_key", "AIzaSyTestKey123456789012345678901234")
    monkeypatch.setattr(settings, "llm_provider", "gemini")
    from app.providers import GeminiProvider

    p = GeminiProvider()
    p.close()
    p.client = httpx2.Client(
        headers={"x-goog-api-key": settings.gemini_api_key},
        transport=httpx2.MockTransport(handle),
    )
    return p, seen


def test_gemini_provider_schema_usage_and_validation(monkeypatch):
    p, seen = gemini_with_response(monkeypatch, result_json())
    try:
        result = p.assess_requirements({"text": "Python"}, [])
        assert result.status == "not_evidenced"
        assert p.usage == {"calls": 1, "input_tokens": 150, "output_tokens": 35}
        assert seen[0]["generationConfig"]["response_mime_type"] == "application/json"
        assert "response_schema" in seen[0]["generationConfig"]
    finally:
        p.close()


def test_gemini_authentication_error_is_not_demo_fallback(monkeypatch):
    p, _ = gemini_with_response(monkeypatch, "", status=401)
    try:
        with pytest.raises(ValueError, match="Authentication error"):
            p.assess_requirements({"text": "Python"}, [])
    finally:
        p.close()


def test_gemini_key_redaction_in_text():
    key = "AIzaSyD-1234567890123456789012345678"
    sample = f"gemini_token={key}\nRequired Python."
    redacted = redact(sample, preserve_positions=True)
    assert key not in redacted
    assert "[REDACTED]" in redacted
    assert redacted.index("Required Python.") == sample.index("Required Python.")


def test_provider_factory_selects_gemini_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "gemini_api_key", "AIzaSyTestKey123456789012345678901234")
    monkeypatch.setattr(settings, "llm_provider", "")
    from app.providers import GeminiProvider, provider

    p = provider("real")
    assert isinstance(p, GeminiProvider)
    assert p.model == "gemini-3.8-flash"
    p.close()
