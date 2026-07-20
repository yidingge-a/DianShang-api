"""可选 S3 兼容对象存储。"""
from __future__ import annotations

import logging
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)


def upload_bytes(key: str, content: bytes, content_type: str = "application/octet-stream") -> str | None:
    """上传至 S3；未配置时返回 None。"""
    settings = get_settings()
    if not settings.s3_enabled:
        return None
    try:
        import boto3
        from botocore.client import Config

        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint or None,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
        client.put_object(Bucket=settings.s3_bucket, Key=key, Body=content, ContentType=content_type)
        base = settings.s3_public_base_url.rstrip("/") or f"{settings.s3_endpoint}/{settings.s3_bucket}"
        return f"{base}/{key}"
    except Exception as exc:
        logger.warning("S3 upload failed, fallback local: %s", exc)
        return None


def public_url_for_key(key: str) -> str:
    settings = get_settings()
    base = settings.s3_public_base_url.rstrip("/") or f"{settings.base_url.rstrip('/')}/uploads"
    return f"{base}/{key}"
