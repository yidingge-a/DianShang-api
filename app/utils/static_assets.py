"""启动时确保占位静态资源存在。"""
from pathlib import Path

from app.config import get_settings

# 极小合法 MP4（约 1KB），供视频任务占位返回
_MINIMAL_MP4 = bytes.fromhex(
    "000000186674797069736F6D0000020069736F6D69736F32617663316D703431"
    "000000086D64617400000000"
)


def ensure_static_assets() -> None:
    settings = get_settings()
    processed = settings.upload_dir / "processed"
    processed.mkdir(parents=True, exist_ok=True)
    video = processed / "video_placeholder.mp4"
    if not video.is_file() or video.stat().st_size < 100:
        video.write_bytes(_MINIMAL_MP4)
