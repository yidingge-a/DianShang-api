"""商品视频生成：优先第三方 API，否则 ffmpeg 幻灯片合成真实 mp4。"""
from __future__ import annotations

import base64
import logging
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def _save_video(dest_dir: Path, source: Path) -> str:
    settings = get_settings()
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    dest = dest_dir / f"{file_id}.mp4"
    shutil.copy2(source, dest)
    return f"{settings.base_url.rstrip('/')}/uploads/processed/{dest.name}"


def _generate_via_api(image_paths: list[Path], duration: int, music: bool) -> str | None:
    settings = get_settings()
    base = settings.video_api_base.strip().rstrip("/")
    if not base or not settings.video_model.strip():
        return None

    files = []
    for p in image_paths:
        files.append(("images", (p.name, p.read_bytes(), "image/jpeg")))
    data = {"model": settings.video_model, "duration": str(duration), "music": str(music).lower()}
    headers = {}
    key = settings.video_api_key.strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"

    try:
        with httpx.Client(timeout=settings.vision_timeout_seconds) as client:
            response = client.post(f"{base}/videos/generate", data=data, files=files, headers=headers)
            response.raise_for_status()
            payload = response.json()
            url = payload.get("url") or payload.get("result_url")
            if url:
                return url
            b64 = payload.get("video_base64")
            if b64:
                out = settings.upload_dir / "processed" / f"{uuid.uuid4()}.mp4"
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(base64.b64decode(b64))
                return f"{settings.base_url.rstrip('/')}/uploads/processed/{out.name}"
    except Exception as exc:
        logger.warning("视频 API 调用失败: %s", exc)
    return None


def _generate_via_ffmpeg(image_paths: list[Path], duration: int) -> Path | None:
    if not image_paths or not shutil.which("ffmpeg"):
        return None

    per_image = max(1, duration // max(len(image_paths), 1))
    tmp = Path(tempfile.mkdtemp())
    list_file = tmp / "inputs.txt"
    lines = []
    for img in image_paths:
        lines.append(f"file '{img.resolve()}'")
        lines.append(f"duration {per_image}")
    lines.append(f"file '{image_paths[-1].resolve()}'")
    list_file.write_text("\n".join(lines), encoding="utf-8")

    output = tmp / "out.mp4"
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(output),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)
        if output.is_file() and output.stat().st_size > 500:
            return output
    except Exception as exc:
        logger.warning("ffmpeg 合成视频失败: %s", exc)
    return None


def generate_product_video(image_paths: list[Path], duration: int = 15, music: bool = False) -> dict:
    settings = get_settings()
    processed = settings.upload_dir / "processed"

    api_url = _generate_via_api(image_paths, duration, music)
    if api_url:
        return {"status": "completed", "result_url": api_url, "mode": "video_api"}

    ffmpeg_out = _generate_via_ffmpeg(image_paths, duration)
    if ffmpeg_out:
        url = _save_video(processed, ffmpeg_out)
        return {"status": "completed", "result_url": url, "mode": "ffmpeg"}

    placeholder = processed / "video_placeholder.mp4"
    if placeholder.is_file():
        url = f"{settings.base_url.rstrip('/')}/uploads/processed/video_placeholder.mp4"
        return {"status": "completed", "result_url": url, "mode": "placeholder"}

    return {"status": "failed", "result_url": "", "message": "请安装 ffmpeg 或配置 VIDEO_API_*"}
