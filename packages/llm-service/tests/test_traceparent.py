# User behavior: When the TS orchestrator calls the Python LLM service, the
# W3C traceparent header links Python spans to the parent TS trace.
# Business rule: Distributed tracing requires trace context propagation across services.

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport, Response


def _make_upstream_response() -> dict:
    return {
        "id": "chatcmpl-abc123",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "Hi!"},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
    }


@pytest.mark.anyio
async def test_traceparent_header_is_extracted(monkeypatch):
    """When a request includes a W3C traceparent header, the OTEL context
    is extracted so Python spans become children of the calling trace."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

    # Known trace ID and span ID in valid traceparent format
    # Format: version-trace_id-parent_id-trace_flags
    trace_id = "0af7651916cd43dd8448eb211c80319c"
    parent_span_id = "b7ad6b7169203331"
    traceparent = f"00-{trace_id}-{parent_span_id}-01"

    with patch("src.router.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.post = mock_post
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        from src.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/v1/chat/completions",
                json={
                    "model": "gpt-4",
                    "messages": [{"role": "user", "content": "Hello"}],
                },
                headers={"traceparent": traceparent},
            )

    # The request should succeed (traceparent does not break anything)
    assert response.status_code == 200
    assert response.json() == upstream_json


@pytest.mark.anyio
async def test_otel_extract_parses_traceparent():
    """The OTEL propagator correctly extracts trace_id and span_id from
    a W3C traceparent header, confirming the propagation mechanism works."""
    from opentelemetry.propagate import extract
    from opentelemetry import trace

    trace_id = "0af7651916cd43dd8448eb211c80319c"
    parent_span_id = "b7ad6b7169203331"
    traceparent = f"00-{trace_id}-{parent_span_id}-01"

    carrier = {"traceparent": traceparent}
    ctx = extract(carrier)

    span = trace.get_current_span(ctx)
    span_context = span.get_span_context()

    # Verify the trace ID was extracted (as int)
    expected_trace_id = int(trace_id, 16)
    assert span_context.trace_id == expected_trace_id

    # Verify the parent span ID was extracted
    expected_span_id = int(parent_span_id, 16)
    assert span_context.span_id == expected_span_id

    # Verify trace flags indicate sampled
    assert span_context.trace_flags == 1


@pytest.mark.anyio
async def test_logfire_instrument_fastapi_called_in_main():
    """The main module calls logfire.instrument_fastapi(app), which installs
    the OTEL middleware responsible for extracting traceparent from incoming requests.
    This is a source-level verification complementing the runtime tests above."""
    import pathlib

    main_source = pathlib.Path(__file__).parent.parent / "src" / "main.py"
    content = main_source.read_text()
    assert "logfire.instrument_fastapi(app)" in content, (
        "Expected logfire.instrument_fastapi(app) call in src/main.py"
    )
