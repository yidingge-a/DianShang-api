"""API 限流（slowapi）。"""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

settings = get_settings()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_default],
    enabled=settings.rate_limit_enabled,
)


def llm_rate_limit():
    """LLM 密集型接口限流装饰器。"""
    return limiter.limit(get_settings().rate_limit_llm)
