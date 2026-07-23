"""统一生图入口：按前端选择的模型路由到万相 / Gemini / GPT-Image。"""
from __future__ import annotations

from pathlib import Path

from app.core.exceptions import AppException
from app.services import dashscope_image_client, gemini_image_client, gpt_image_client

# 前端可选值
MODEL_WAN = "wan2.7-image-pro"
MODEL_GEMINI_NANO = "nano-banana-2"
MODEL_GPT_IMAGE = "gpt-image-2"

GEMINI_ALIASES = {
    MODEL_GEMINI_NANO,
    "gemini",
    "gemini-nano-banana",
    "nano-banana",
    "nano-banana-2",
    "nano-banana-2-2k",
}

WAN_ALIASES = {
    MODEL_WAN,
    "wan",
    "dashscope",
    "wanxiang",
    "wan2.7",
}

GPT_ALIASES = {
    MODEL_GPT_IMAGE,
    "gpt-image",
    "gpt",
    "openai-image",
}


def normalize_model(model: str | None) -> str:
    raw = (model or MODEL_GPT_IMAGE).strip()
    low = raw.lower()
    if low in {a.lower() for a in GPT_ALIASES} or low.startswith("gpt-image"):
        return MODEL_GPT_IMAGE
    if low in {a.lower() for a in GEMINI_ALIASES} or "nano-banana" in low or low.startswith("gemini"):
        return MODEL_GEMINI_NANO
    if low in {a.lower() for a in WAN_ALIASES} or "wan" in low:
        return MODEL_WAN
    return raw or MODEL_WAN


def is_model_configured(model: str | None) -> bool:
    m = normalize_model(model)
    if m == MODEL_GEMINI_NANO:
        return gemini_image_client.is_configured()
    if m == MODEL_GPT_IMAGE:
        return gpt_image_client.is_configured()
    return dashscope_image_client.is_configured()


def ensure_model_configured(model: str | None) -> str:
    m = normalize_model(model)
    if m == MODEL_GEMINI_NANO:
        if not gemini_image_client.is_configured():
            raise AppException("未配置 GEMINI_IMAGE_API_KEY，无法使用 Gemini 生图", 503)
        return m
    if m == MODEL_GPT_IMAGE:
        if not gpt_image_client.is_configured():
            raise AppException("未配置 OPENAI_API_KEY，无法使用 gpt-image-2", 503)
        return m
    if not dashscope_image_client.is_configured():
        raise AppException("未配置 DASHSCOPE_API_KEY，无法使用万相生图", 503)
    return m


def list_models() -> list[dict]:
    return [
        {
            "id": MODEL_WAN,
            "name": "万相 wan2.7-image-pro",
            "provider": "dashscope",
            "configured": dashscope_image_client.is_configured(),
            "description": "阿里云万相，适合电商详情批量出图",
        },
        {
            "id": MODEL_GPT_IMAGE,
            "name": "GPT gpt-image-2",
            "provider": "openai",
            "configured": gpt_image_client.is_configured(),
            "description": "Kuaipao OpenAI 兼容生图（已验证可用）",
        },
    ]


def generate_images(
    prompt: str,
    *,
    model: str | None = None,
    n: int = 1,
    size: str = "2K",
    reference_image_paths: list[Path] | None = None,
    enable_sequential: bool = False,
    filename_prefix: str = "",
    aspect_ratio: str = "3:4",
) -> dict:
    m = ensure_model_configured(model)
    if m == MODEL_GEMINI_NANO:
        return gemini_image_client.generate_images(
            prompt,
            n=n,
            size=size,
            reference_image_paths=reference_image_paths,
            filename_prefix=filename_prefix,
            aspect_ratio=aspect_ratio,
            model=MODEL_GEMINI_NANO,
        )
    if m == MODEL_GPT_IMAGE:
        return gpt_image_client.generate_images(
            prompt,
            n=n,
            size=size,
            reference_image_paths=reference_image_paths,
            filename_prefix=filename_prefix,
            aspect_ratio=aspect_ratio,
            model=MODEL_GPT_IMAGE,
        )
    return dashscope_image_client.generate_images(
        prompt,
        n=n,
        size=size,
        reference_image_paths=reference_image_paths,
        enable_sequential=enable_sequential,
        filename_prefix=filename_prefix,
    )
