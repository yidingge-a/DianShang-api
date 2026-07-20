"""视觉 / 图像大模型客户端（vLLM 等 OpenAI 兼容多模态端点）。"""
from __future__ import annotations

import base64
import json
import logging
import re
from pathlib import Path

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def is_vision_configured() -> bool:
    settings = get_settings()
    return bool(settings.vision_api_base.strip() and settings.vision_model.strip())


def _image_mime(image_path: Path) -> str:
    ext = image_path.suffix.lower()
    if ext == ".png":
        return "image/png"
    if ext == ".gif":
        return "image/gif"
    if ext == ".webp":
        return "image/webp"
    return "image/jpeg"


def _vision_chat(image_path: Path, text_prompt: str, *, max_tokens: int = 4096) -> str:
    """调用 vLLM / OpenAI 兼容多模态 chat/completions。"""
    settings = get_settings()
    base = settings.vision_api_base.strip()
    model = settings.vision_model.strip()
    if not base or not model:
        return ""

    mime = _image_mime(image_path)
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    url = f"{base.rstrip('/')}/chat/completions"

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            }
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    headers = {"Content-Type": "application/json"}
    api_key = settings.vision_api_key.strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    with httpx.Client(timeout=settings.vision_timeout_seconds) as client:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return (content or "").strip()


def _strip_json_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_json_content(content: str) -> dict | None:
    if not content:
        return None
    try:
        data = json.loads(_strip_json_fence(content))
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            try:
                data = json.loads(match.group(0))
                return data if isinstance(data, dict) else None
            except json.JSONDecodeError:
                pass
    return None


def parse_product_image_for_bom(image_path: Path) -> dict | None:
    """
    使用 vLLM 解析产品图片，提取 BOM 拆解所需的文字信息。
    需在 .env 配置 VISION_API_BASE、VISION_MODEL（及可选 VISION_API_KEY）。
    """
    if not is_vision_configured():
        return None

    prompt = (
        "你是电商与制造业产品识别专家。请仔细观察这张产品图片，提取可用于 BOM 成本拆解的信息。"
        "只输出合法 JSON，不要 markdown："
        '{"product_name":"推测产品名称","product_category":"品类",'
        '"product_specs":"规格容量材质等","visible_materials":["材质1"],'
        '"visible_components":["部件1"],"brand_or_model":"品牌或型号",'
        '"description":"图片中可见信息的完整中文描述","confidence":"high|medium|low"}'
    )
    try:
        raw = _vision_chat(image_path, prompt, max_tokens=2048)
        data = _parse_json_content(raw)
        if not data:
            logger.warning("vLLM BOM 图片解析非 JSON: %s", (raw or "")[:200])
            return None
        data["raw_text"] = data.get("description") or raw
        data["data_source"] = "vllm_vision"
        return data
    except Exception as exc:
        logger.warning("vLLM BOM 图片解析失败: %s", exc)
        return None


def segment_foreground(image_path: Path) -> bytes | None:
    """
    调用视觉模型做前景分割，返回 PNG 字节。
    需在 .env 配置 VISION_API_BASE、VISION_MODEL（及可选 VISION_API_KEY）。
    """
    settings = get_settings()
    base = settings.vision_api_base.strip()
    model = settings.vision_model.strip()
    if not base or not model:
        return None

    mime = _image_mime(image_path)
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    url = f"{base.rstrip('/')}/chat/completions"

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "请对商品图做前景分割，只保留主体，背景透明。"
                            "以 base64 编码的 PNG 图片回复，字段名 image_base64。"
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            }
        ],
        "max_tokens": 4096,
    }
    headers = {"Content-Type": "application/json"}
    api_key = settings.vision_api_key.strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        with httpx.Client(timeout=settings.vision_timeout_seconds) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if isinstance(content, str):
                text = content.strip()
                match = re.search(r'"image_base64"\s*:\s*"([^"]+)"', text)
                if match:
                    return base64.b64decode(match.group(1))
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, dict) and parsed.get("image_base64"):
                        return base64.b64decode(parsed["image_base64"])
                except json.JSONDecodeError:
                    pass
    except Exception as exc:
        logger.warning("视觉模型调用失败，将使用本地抠图: %s", exc)

    return None
