"""Gemini 图像生成（kuaipao.ai /v1beta/models/{model}:generateContent）。

连接约定（newapi_channel_conn）：
  key = GEMINI_IMAGE_API_KEY
  url = GEMINI_IMAGE_BASE_URL（默认 https://kuaipao.ai）
"""
from __future__ import annotations

import base64
import logging
import mimetypes
import re
import uuid
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

from app.config import get_settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    s = get_settings()
    return bool(s.gemini_image_api_key.strip())


def _file_to_inline(path: Path) -> dict:
    mime = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    if mime not in ("image/jpeg", "image/png", "image/webp"):
        mime = "image/jpeg"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return {"mimeType": mime, "data": data}


def _save_image_bytes(raw: bytes, *, filename_prefix: str = "") -> tuple[str, str, Path]:
    settings = get_settings()
    dest_dir = settings.upload_dir / "processed"
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    prefix = f"{filename_prefix}_" if filename_prefix else ""
    dest = dest_dir / f"{prefix}{file_id}.png"

    img = Image.open(BytesIO(raw))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")
    img.save(dest, format="PNG", optimize=True)
    url = f"{settings.base_url.rstrip('/')}/uploads/processed/{dest.name}"
    return file_id, url, dest


def _download_url(url: str, *, filename_prefix: str = "") -> tuple[str, str, Path]:
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return _save_image_bytes(resp.content, filename_prefix=filename_prefix)


def _decode_inline_data(data: str, mime: str = "image/png", *, filename_prefix: str = "") -> tuple[str, str, Path]:
    payload = (data or "").strip()
    if payload.startswith("http://") or payload.startswith("https://"):
        return _download_url(payload, filename_prefix=filename_prefix)
    # data URL
    m = re.match(r"^data:([^;]+);base64,(.+)$", payload, re.I | re.S)
    if m:
        mime = m.group(1) or mime
        payload = m.group(2)
    raw = base64.b64decode(payload)
    return _save_image_bytes(raw, filename_prefix=filename_prefix)


def _extract_images_from_response(payload: dict) -> list[tuple[str, str]]:
    """返回 [(mime, data_or_url), ...]。"""
    out: list[tuple[str, str]] = []
    for cand in payload.get("candidates") or []:
        content = cand.get("content") if isinstance(cand, dict) else None
        if not isinstance(content, dict):
            continue
        for part in content.get("parts") or []:
            if not isinstance(part, dict):
                continue
            inline = part.get("inlineData") or part.get("inline_data")
            if isinstance(inline, dict) and inline.get("data"):
                out.append((inline.get("mimeType") or inline.get("mime_type") or "image/png", inline["data"]))
                continue
            # 少数网关把图放在 fileData / url
            file_data = part.get("fileData") or part.get("file_data")
            if isinstance(file_data, dict) and file_data.get("fileUri"):
                out.append(("image/png", file_data["fileUri"]))
    return out


def generate_images(
    prompt: str,
    *,
    n: int = 1,
    size: str = "2K",
    reference_image_paths: list[Path] | None = None,
    enable_sequential: bool = False,  # noqa: ARG001 — 接口对齐，Gemini 逐张调用
    filename_prefix: str = "",
    aspect_ratio: str = "3:4",
    model: str | None = None,
) -> dict:
    """
    调用 Gemini generateContent 文生图 / 图生图。
    详情页竖图默认 aspect_ratio=3:4。
    """
    settings = get_settings()
    api_key = settings.gemini_image_api_key.strip()
    if not api_key:
        raise AppException("未配置 GEMINI_IMAGE_API_KEY", 503)

    model_name = (model or settings.gemini_image_model or "nano-banana-2").strip()
    base = (settings.gemini_image_base_url or "https://kuaipao.ai").rstrip("/")
    url = f"{base}/v1beta/models/{model_name}:generateContent"

    n = max(1, min(int(n or 1), 4))
    image_size = "2K" if str(size).upper() in ("2K", "2048", "2k") else "1K"
    ratio = aspect_ratio or "3:4"

    results: list[dict] = []
    last_error = ""

    for i in range(n):
        parts: list[dict] = [{"text": prompt if n == 1 else f"{prompt}\n\n(Image {i + 1} of {n})"}]
        for path in (reference_image_paths or [])[:3]:
            if path and Path(path).is_file():
                try:
                    parts.append({"inlineData": _file_to_inline(Path(path))})
                except Exception as exc:
                    logger.warning("Gemini 参考图编码失败 %s: %s", path, exc)

        body = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "temperature": 1,
                "topP": 0.95,
                "maxOutputTokens": 8192,
                "imageConfig": {
                    "aspectRatio": ratio,
                    "imageSize": image_size,
                },
            },
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        logger.info("Gemini Image model=%s size=%s ratio=%s refs=%s", model_name, image_size, ratio, len(parts) - 1)
        try:
            with httpx.Client(timeout=settings.gemini_image_timeout_seconds) as client:
                resp = client.post(url, json=body, headers=headers)
                if resp.status_code >= 400:
                    last_error = resp.text[:500]
                    # 网关常见：模型在列表里，但当前分组无上游通道
                    if "No available channel" in last_error or "model_not_found" in last_error:
                        raise AppException(
                            f"Gemini 模型 `{model_name}` 当前在快跑网关无可用通道"
                            f"（group 无 upstream channel）。"
                            f"请到 kuaipao 控制台确认该 Key 已开通 nano-banana 通道，"
                            f"或换用已开通的模型。原始错误: {last_error}",
                            503,
                        )
                    raise AppException(f"Gemini 出图失败 HTTP {resp.status_code}: {last_error}", 502)
                payload = resp.json()
        except AppException:
            raise
        except Exception as exc:
            last_error = str(exc)
            raise AppException(f"Gemini 出图请求异常: {exc}", 502) from exc

        images = _extract_images_from_response(payload if isinstance(payload, dict) else {})
        if not images:
            last_error = str(payload)[:400]
            raise AppException(f"Gemini 未返回图片: {last_error}", 502)

        mime, data = images[0]
        prefix = filename_prefix if n == 1 else f"{filename_prefix}{i + 1:02d}"
        file_id, local_url, local_path = _decode_inline_data(data, mime, filename_prefix=prefix)
        results.append({
            "file_id": file_id,
            "result_url": local_url,
            "local_path": str(local_path),
        })

    if not results:
        raise AppException(f"Gemini 出图失败: {last_error or '无结果'}", 502)

    return {
        "status": "completed",
        "model": model_name,
        "count": len(results),
        "result_url": results[0]["result_url"],
        "local_path": results[0]["local_path"],
        "results": results,
        "data_source": "gemini_kuaipao",
    }
