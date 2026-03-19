from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx
import logfire
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


router = APIRouter()

PROVIDER_CONFIG: Dict[str, Dict[str, str]] = {
    "openai": {
        "url": "https://api.openai.com/v1/chat/completions",
        "env_key": "OPENAI_API_KEY",
    },
    "openrouter": {
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "env_key": "OPENROUTER_API_KEY",
    },
    "perplexity": {
        "url": "https://api.perplexity.ai/chat/completions",
        "env_key": "PERPLEXITY_API_KEY",
    },
}


def resolve_provider(model: str) -> str:
    if model.startswith("gpt-"):
        return "openai"
    if model.startswith("anthropic/") or model.startswith("claude-"):
        return "openrouter"
    if model.startswith("sonar-") or model.startswith("perplexity/") or model.startswith("llama-"):
        return "perplexity"
    raise HTTPException(status_code=400, detail=f"Unknown model prefix: {model}")


@router.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest) -> Any:
    provider = resolve_provider(request.model)
    config = PROVIDER_CONFIG[provider]
    env_key = config["env_key"]
    api_key = os.environ.get(env_key, "").strip()

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=f"LLM provider '{provider}' not configured: {env_key} environment variable is empty or missing",
        )

    prompt_length = sum(len(m.content) for m in request.messages)

    body = request.model_dump(exclude_none=True)

    with logfire.span(
        "llm.call",
        **{
            "llm.provider": provider,
            "llm.model": request.model,
            "llm.prompt_length": prompt_length,
        },
    ) as span:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                if provider == "openrouter":
                    headers["HTTP-Referer"] = "https://editengage.com"
                    headers["X-Title"] = "EditEngage"
                response = await client.post(
                    config["url"],
                    json=body,
                    headers=headers,
                )
        except httpx.HTTPError as exc:
            span.set_attribute("llm.response_status", "error")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to reach {provider} API at {config['url']}: {exc}",
            ) from exc

        if response.status_code != 200:
            span.set_attribute("llm.response_status", response.status_code)
            try:
                error_body = response.json()
            except Exception:
                error_body = {"raw": response.text[:500]}
            print(f"[llm-service] {provider} returned {response.status_code} for model={request.model}: {error_body}")
            return JSONResponse(
                status_code=response.status_code,
                content={"error": error_body, "provider": provider, "model": request.model},
            )

        response_data = response.json()
        usage = response_data.get("usage")
        if usage:
            for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
                if key in usage:
                    span.set_attribute(f"llm.usage.{key}", usage[key])

    return response_data
