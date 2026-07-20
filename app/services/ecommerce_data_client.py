"""电商数据外部 API 客户端（比价、市场、监控数据等，可选配置）。"""
from __future__ import annotations

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(get_settings().ecommerce_data_api_base.strip())


def fetch(path: str, body: dict) -> dict | None:
    """POST 到外部数据服务；未配置或失败返回 None。"""
    settings = get_settings()
    base = settings.ecommerce_data_api_base.strip().rstrip("/")
    if not base:
        return None

    url = f"{base}/{path.lstrip('/')}"
    headers = {"Content-Type": "application/json"}
    api_key = settings.ecommerce_data_api_key.strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
            response = client.post(url, json=body, headers=headers)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict) and payload.get("success") is True:
                return payload.get("data")
            if isinstance(payload, dict) and "data" in payload:
                return payload["data"]
            return payload if isinstance(payload, dict) else None
    except Exception as exc:
        logger.warning("电商数据 API 调用失败 %s: %s", path, exc)
        return None
