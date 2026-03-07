# User behavior: When a client sends a chat completion request, the service
# routes it to the correct LLM provider and returns the upstream response.
# Business rule: Model prefix determines provider routing; unknown models are rejected.

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport, Response
from typing import Optional


def _make_request_body(
    model: str = "gpt-4",
    messages: Optional[list[dict[str, str]]] = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> dict:
    return {
        "model": model,
        "messages": messages or [{"role": "user", "content": "Hello"}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }


def _make_upstream_response() -> dict:
    return {
        "id": "chatcmpl-abc123",
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "Hi there!"},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12},
    }


@pytest.mark.anyio
async def test_unknown_model_returns_400(monkeypatch):
    """Unknown model prefix should return 400 with an error message."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    from src.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/v1/chat/completions",
            json=_make_request_body(model="unknown-model-xyz"),
        )
    assert response.status_code == 400
    body = response.json()
    assert "detail" in body


@pytest.mark.anyio
async def test_gpt_model_routes_to_openai(monkeypatch):
    """Models starting with 'gpt-' route to OpenAI."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-openai")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

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
                json=_make_request_body(model="gpt-4"),
            )

    assert response.status_code == 200
    assert response.json() == upstream_json

    call_kwargs = mock_post.call_args
    assert "https://api.openai.com/v1/chat/completions" in str(call_kwargs)
    headers = call_kwargs.kwargs.get("headers", {})
    assert headers["Authorization"] == "Bearer sk-test-openai"


@pytest.mark.anyio
async def test_anthropic_prefix_routes_to_openrouter(monkeypatch):
    """Models starting with 'anthropic/' route to OpenRouter."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

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
                json=_make_request_body(model="anthropic/claude-3-opus"),
            )

    assert response.status_code == 200
    call_kwargs = mock_post.call_args
    assert "https://openrouter.ai/api/v1/chat/completions" in str(call_kwargs)
    headers = call_kwargs.kwargs.get("headers", {})
    assert headers["Authorization"] == "Bearer sk-or-test-key"


@pytest.mark.anyio
async def test_claude_prefix_routes_to_openrouter(monkeypatch):
    """Models starting with 'claude-' route to OpenRouter."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

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
                json=_make_request_body(model="claude-3-sonnet"),
            )

    assert response.status_code == 200
    call_kwargs = mock_post.call_args
    assert "https://openrouter.ai/api/v1/chat/completions" in str(call_kwargs)


@pytest.mark.anyio
async def test_sonar_prefix_routes_to_perplexity(monkeypatch):
    """Models starting with 'sonar-' route to Perplexity."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "pplx-test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

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
                json=_make_request_body(model="sonar-medium-online"),
            )

    assert response.status_code == 200
    call_kwargs = mock_post.call_args
    assert "https://api.perplexity.ai/chat/completions" in str(call_kwargs)
    headers = call_kwargs.kwargs.get("headers", {})
    assert headers["Authorization"] == "Bearer pplx-test-key"


@pytest.mark.anyio
async def test_perplexity_prefix_routes_to_perplexity(monkeypatch):
    """Models starting with 'perplexity/' route to Perplexity."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "pplx-test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

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
                json=_make_request_body(model="perplexity/sonar-pro"),
            )

    assert response.status_code == 200
    call_kwargs = mock_post.call_args
    assert "https://api.perplexity.ai/chat/completions" in str(call_kwargs)


@pytest.mark.anyio
async def test_request_body_forwarded_to_upstream(monkeypatch):
    """The full request body is forwarded to the upstream provider."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

    request_body = _make_request_body(
        model="gpt-4",
        messages=[{"role": "user", "content": "What is TDD?"}],
        temperature=0.5,
        max_tokens=512,
    )

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
                json=request_body,
            )

    call_kwargs = mock_post.call_args
    sent_json = call_kwargs.kwargs.get("json", {})
    assert sent_json["model"] == "gpt-4"
    assert sent_json["messages"] == [{"role": "user", "content": "What is TDD?"}]
    assert sent_json["temperature"] == 0.5
    assert sent_json["max_tokens"] == 512


@pytest.mark.anyio
async def test_logfire_span_created_with_attributes(monkeypatch):
    """A logfire span is created with provider, model, and prompt_length attributes."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

    mock_span = MagicMock()
    mock_span.__enter__ = MagicMock(return_value=mock_span)
    mock_span.__exit__ = MagicMock(return_value=False)

    with patch("src.router.httpx.AsyncClient") as MockClient, \
         patch("src.router.logfire.span", return_value=mock_span) as mock_logfire_span:
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
                json=_make_request_body(model="gpt-4"),
            )

    mock_logfire_span.assert_called_once()
    call_kwargs = mock_logfire_span.call_args
    # First positional arg is span name
    assert call_kwargs.args[0] == "llm.call"
    # Check attributes
    span_attrs = call_kwargs.kwargs
    assert span_attrs["llm.provider"] == "openai"
    assert span_attrs["llm.model"] == "gpt-4"
    assert "llm.prompt_length" in span_attrs


@pytest.mark.anyio
async def test_llama_prefix_routes_to_perplexity(monkeypatch):
    """Models starting with 'llama-' route to Perplexity (e.g. llama-3.1-sonar-large-128k-online)."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "pplx-test-key")

    upstream_json = _make_upstream_response()
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

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
                json=_make_request_body(model="llama-3.1-sonar-large-128k-online"),
            )

    assert response.status_code == 200
    call_kwargs = mock_post.call_args
    assert "https://api.perplexity.ai/chat/completions" in str(call_kwargs)
    headers = call_kwargs.kwargs.get("headers", {})
    assert headers["Authorization"] == "Bearer pplx-test-key"


@pytest.mark.anyio
async def test_upstream_error_returns_error_status(monkeypatch):
    """When upstream provider returns non-2xx, the error status is forwarded to the caller
    and logged on the Logfire span."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    error_body = {"error": {"message": "Rate limit exceeded", "type": "rate_limit_error"}}
    mock_response = Response(429, json=error_body)
    mock_post = AsyncMock(return_value=mock_response)

    mock_span = MagicMock()
    mock_span.__enter__ = MagicMock(return_value=mock_span)
    mock_span.__exit__ = MagicMock(return_value=False)
    mock_span.set_attribute = MagicMock()

    with patch("src.router.httpx.AsyncClient") as MockClient, \
         patch("src.router.logfire.span", return_value=mock_span):
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
                json=_make_request_body(model="gpt-4"),
            )

    assert response.status_code == 429
    assert response.json() == error_body

    # Verify span recorded the error status
    mock_span.set_attribute.assert_any_call("llm.response_status", 429)


@pytest.mark.anyio
async def test_token_usage_recorded_on_span(monkeypatch):
    """When upstream response includes usage field, token counts are recorded on the span."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    upstream_json = _make_upstream_response()
    # _make_upstream_response already includes usage with prompt_tokens=5, completion_tokens=7, total_tokens=12
    mock_response = Response(200, json=upstream_json)
    mock_post = AsyncMock(return_value=mock_response)

    mock_span = MagicMock()
    mock_span.__enter__ = MagicMock(return_value=mock_span)
    mock_span.__exit__ = MagicMock(return_value=False)
    mock_span.set_attribute = MagicMock()

    with patch("src.router.httpx.AsyncClient") as MockClient, \
         patch("src.router.logfire.span", return_value=mock_span):
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
                json=_make_request_body(model="gpt-4"),
            )

    assert response.status_code == 200

    # Verify token usage attributes were set on span
    set_attr_calls = {call.args[0]: call.args[1] for call in mock_span.set_attribute.call_args_list}
    assert set_attr_calls["llm.usage.prompt_tokens"] == 5
    assert set_attr_calls["llm.usage.completion_tokens"] == 7
    assert set_attr_calls["llm.usage.total_tokens"] == 12


@pytest.mark.anyio
async def test_missing_messages_returns_422(monkeypatch):
    """Request without messages field should return 422 validation error."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "test-key")

    from src.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/v1/chat/completions",
            json={"model": "gpt-4"},  # missing messages
        )
    assert response.status_code == 422
