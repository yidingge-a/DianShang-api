"""OpenAI 兼容大模型 HTTP 客户端（与 WebAIAgent / deploy/.env.example 变量名一致）。"""
from __future__ import annotations

import json
import logging
import re

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def is_llm_configured() -> bool:
    return bool(get_settings().openai_api_key.strip())


def chat(
    system: str,
    user: str,
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """调用 chat/completions；未配置 Key 或失败时返回空字符串。"""
    settings = get_settings()
    api_key = settings.openai_api_key.strip()
    if not api_key:
        return ""

    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.llm_chat_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": settings.llm_temperature if temperature is None else temperature,
        "max_tokens": max_tokens or settings.llm_max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return (data["choices"][0]["message"]["content"] or "").strip()
    except Exception as exc:
        logger.warning("LLM 调用失败: %s", exc)
        return ""


def _strip_json_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def chat_json(
    system: str,
    user: str,
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> dict | list | None:
    """要求模型返回 JSON；解析失败返回 None。"""
    raw = chat(
        system,
        f"{user}\n\n只输出合法 JSON，不要 markdown 代码块或额外说明。",
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if not raw:
        return None
    try:
        return json.loads(_strip_json_fence(raw))
    except json.JSONDecodeError:
        logger.warning("LLM 返回非 JSON: %s", raw[:200])
        return None
