"""统一 API 响应格式（与需求文档 2.2 节一致）。"""
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ApiResponse(BaseModel, Generic[T]):
    """标准响应包装。"""

    success: bool = True
    code: int = 200
    message: str = "操作成功"
    data: T | None = None
    timestamp: str = Field(default_factory=_utc_now_iso)


def ok(data: Any = None, message: str = "操作成功", code: int = 200) -> dict[str, Any]:
    """构造成功响应。"""
    return ApiResponse(success=True, code=code, message=message, data=data).model_dump()


def fail(message: str, code: int = 400, data: Any = None) -> dict[str, Any]:
    """构造失败响应。"""
    return ApiResponse(success=False, code=code, message=message, data=data).model_dump()
