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
