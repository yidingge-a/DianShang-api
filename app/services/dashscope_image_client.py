"""阿里云 DashScope 万相出图（wan2.7）：文生图 / 图生图。"""
from __future__ import annotations

import base64
import logging
import mimetypes
import uuid
from pathlib import Path

from app.config import get_settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(get_settings().dashscope_api_key.strip())


def _extract_image_urls(rsp) -> list[str]:
    urls: list[str] = []
    if getattr(rsp, "status_code", None) != 200:
        return urls
    output = getattr(rsp, "output", None)
    if not output:
        return urls
    choices = getattr(output, "choices", None) or []
    for choice in choices:
        message = choice.get("message") if isinstance(choice, dict) else getattr(choice, "message", None)
        if message is None:
            continue
        content = message.get("content") if isinstance(message, dict) else getattr(message, "content", None)
        if not content:
            continue
        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "image" and item.get("image"):
                urls.append(item["image"])
            elif item.get("image") and not item.get("text"):
                urls.append(item["image"])
    return urls


def _file_to_data_url(path: Path) -> str:
    """本地文件 → data URL（云端 API 无法读 file://，必须 base64）。"""
    mime = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _download_to_uploads(remote_url: str, *, filename_prefix: str = "") -> tuple[str, str, Path]:
    """下载远程图并统一存为 PNG（保证 ZIP 里是详情页 png）。"""
    from io import BytesIO

    import httpx
    from PIL import Image

    settings = get_settings()
    dest_dir = settings.upload_dir / "processed"
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    prefix = f"{filename_prefix}_" if filename_prefix else ""
    dest = dest_dir / f"{prefix}{file_id}.png"

    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        resp = client.get(remote_url)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        img.save(dest, format="PNG", optimize=True)

    url = f"{settings.base_url.rstrip('/')}/uploads/processed/{dest.name}"
    return file_id, url, dest


def generate_images(
    prompt: str,
    *,
    n: int = 1,
    size: str = "2K",
    reference_image_paths: list[Path] | None = None,
    enable_sequential: bool = False,
    filename_prefix: str = "",
) -> dict:
    """
    调用 wan 文生图 / 图编辑。
    参考图一律转 base64 data URL，避免云端读不到本地 file://。
    """
    settings = get_settings()
    api_key = settings.dashscope_api_key.strip()
    if not api_key:
        raise AppException("未配置 DASHSCOPE_API_KEY", 503)

    try:
        import dashscope
        from dashscope.aigc.image_generation import ImageGeneration
        from dashscope.api_entities.dashscope_response import Message
    except ImportError as exc:
        raise AppException("请先安装 dashscope：pip install dashscope", 503) from exc

    dashscope.base_http_api_url = settings.dashscope_base_url.strip() or "https://dashscope.aliyuncs.com/api/v1"

    content: list[dict] = [{"text": prompt}]
    for path in reference_image_paths or []:
        if path and path.is_file():
            try:
                content.append({"image": _file_to_data_url(path)})
            except Exception as exc:
                logger.warning("参考图编码失败 %s: %s", path, exc)

    message = Message(role="user", content=content)
    model = settings.dashscope_image_model.strip() or "wan2.7-image-pro"
    n = max(1, min(int(n or 1), 4))

    kwargs = {
        "model": model,
        "api_key": api_key,
        "messages": [message],
        "n": n,
        "size": size or "2K",
        "watermark": False,
    }
    if enable_sequential:
        kwargs["enable_sequential"] = True

    logger.info("DashScope ImageGeneration model=%s n=%s size=%s refs=%s", model, n, size, len(content) - 1)
    rsp = ImageGeneration.call(**kwargs)
    if getattr(rsp, "status_code", None) != 200:
        msg = getattr(rsp, "message", None) or getattr(rsp, "code", None) or "万相出图失败"
        raise AppException(f"DashScope 出图失败: {msg}", 502)

    remote_urls = _extract_image_urls(rsp)
    if not remote_urls:
        raise AppException("DashScope 未返回图片 URL", 502)

    results = []
    for remote in remote_urls:
        file_id, local_url, local_path = _download_to_uploads(remote, filename_prefix=filename_prefix)
        results.append({
            "file_id": file_id,
            "result_url": local_url,
            "remote_url": remote,
            "local_path": str(local_path),
        })

    return {
        "status": "completed",
        "model": model,
        "count": len(results),
        "result_url": results[0]["result_url"],
        "local_path": results[0]["local_path"],
        "results": results,
        "data_source": "dashscope_wan",
    }
