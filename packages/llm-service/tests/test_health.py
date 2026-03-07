# User behavior: When a client hits /health, they get a 200 OK with status
# Business rule: The LLM service must be health-checkable for Docker

import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.anyio
async def test_health_endpoint_returns_ok():
    from src.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.anyio
async def test_logfire_is_configured(monkeypatch):
    """Verify logfire.configure is called with correct service name."""
    configure_calls: list[dict] = []
    import logfire

    def mock_configure(**kwargs):
        configure_calls.append(kwargs)

    monkeypatch.setattr(logfire, "configure", mock_configure)

    import importlib

    from src import main

    importlib.reload(main)

    assert any("editengage-llm" in str(call) for call in configure_calls)


def test_startup_span_is_sent(monkeypatch):
    """Verify a startup span is sent so Logfire dashboard shows initialization."""
    span_calls: list[str] = []
    import logfire

    original_span = logfire.span

    class FakeSpan:
        def __init__(self, name, **kwargs):
            span_calls.append(name)
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    monkeypatch.setattr(logfire, "span", lambda name, **kwargs: FakeSpan(name, **kwargs))
    monkeypatch.setattr(logfire, "info", lambda *args, **kwargs: None)
    monkeypatch.setattr(logfire, "configure", lambda **kwargs: None)
    monkeypatch.setattr(logfire, "instrument_fastapi", lambda app: None)

    import importlib
    from src import main
    importlib.reload(main)

    monkeypatch.setattr(logfire, "span", original_span)

    assert "llm_service.startup" in span_calls
