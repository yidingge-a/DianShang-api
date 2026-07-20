"""业务异常与全局异常处理。"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.response import fail


class AppException(Exception):
    """可预期的业务异常，带 HTTP 业务码。"""

    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(message)


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器。"""

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(status_code=200, content=fail(exc.message, code=exc.code))

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        # 生产环境可记录日志并隐藏细节
        return JSONResponse(
            status_code=500,
            content=fail(f"服务器内部错误: {exc}", code=500),
        )
