"""文件存储与校验。"""
import mimetypes
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings
from app.core.exceptions import AppException

settings = get_settings()

# 允许的图片 / 视频 MIME
IMAGE_MIMES = {"image/jpeg", "image/png", "image/gif"}
VIDEO_MIMES = {"video/mp4", "video/quicktime"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif"}
VIDEO_EXTS = {".mp4", ".mov"}


def _guess_mime(filename: str, content_type: str | None) -> str:
    if content_type and content_type != "application/octet-stream":
        return content_type
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def validate_upload(file: UploadFile, file_type: str) -> str:
    """校验上传文件类型与大小，返回 mime_type。"""
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()
    mime = _guess_mime(filename, file.content_type)

    if file_type == "image":
        if ext not in IMAGE_EXTS and mime not in IMAGE_MIMES:
            raise AppException("图片格式不支持，仅支持 JPG、PNG、GIF", 400)
        max_size = settings.max_image_size
    elif file_type == "video":
        if ext not in VIDEO_EXTS and mime not in VIDEO_MIMES:
            raise AppException("视频格式不支持，仅支持 MP4、MOV", 400)
        max_size = settings.max_video_size
    else:
        max_size = settings.max_image_size * 2

    content = file.file.read()
    file.file.seek(0)
    if len(content) > max_size:
        raise AppException(f"文件过大，最大 {max_size // (1024 * 1024)}MB", 400)
    return mime


def save_upload_file(content: bytes, original_name: str, module: str) -> tuple[str, Path, str]:
    """
    保存文件到 uploads/年/月/日/ 目录；若配置 S3 则同步上传。
    返回：(file_id, 磁盘路径, 访问 URL)
    """
    from app.utils import utc_now
    from app.utils.object_storage import upload_bytes

    now = utc_now()
    file_id = str(uuid.uuid4())
    ext = Path(original_name).suffix.lower() or ".bin"
    rel_dir = Path(str(now.year)) / f"{now.month:02d}" / f"{now.day:02d}"
    dest_dir = settings.upload_dir / rel_dir
    dest_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{file_id}{ext}"
    dest_path = dest_dir / filename
    dest_path.write_bytes(content)

    s3_key = f"{rel_dir.as_posix()}/{filename}"
    mime = _guess_mime(original_name, None)
    s3_url = upload_bytes(s3_key, content, mime)
    if s3_url:
        file_url = s3_url
    else:
        url_path = f"/uploads/{rel_dir.as_posix()}/{filename}"
        file_url = f"{settings.base_url.rstrip('/')}{url_path}"
    return file_id, dest_path, file_url


def resolve_file_path(stored_path: str) -> Path:
    """将数据库中的路径转为绝对路径。"""
    p = Path(stored_path)
    if p.is_absolute():
        return p
    return settings.upload_dir.parent / p if not str(p).startswith("uploads") else settings.upload_dir.parent / p
