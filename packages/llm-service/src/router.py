from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx
import logfire
from fastapi import APIRouter, HTTPException
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
    if model.startswith("sonar-") or model.startswith("perplexity/"):
        return "perplexity"
    raise HTTPException(status_code=400, detail=f"Unknown model prefix: {model}")


@router.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest) -> Any:
    provider = resolve_provider(request.model)
    config = PROVIDER_CONFIG[provider]
    api_key = os.environ.get(config["env_key"], "")

    prompt_length = sum(len(m.content) for m in request.messages)

    body = request.model_dump(exclude_none=True)

    with logfire.span(
        "llm.call",
        **{
            "llm.provider": provider,
            "llm.model": request.model,
            "llm.prompt_length": prompt_length,
        },
    ):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["url"],
                json=body,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )

    return response.json()
