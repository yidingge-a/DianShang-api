"""FastAPI 应用入口。"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging_config import setup_logging
from app.core.rate_limit import limiter
from app.database import init_db
from app.seed_data import seed_dev_user, seed_forbidden_words
from app.utils.static_assets import ensure_static_assets

settings = get_settings()


def create_app() -> FastAPI:
    """应用工厂：便于测试与多环境部署。"""
    setup_logging(settings.log_level)
    app = FastAPI(title=settings.app_name, debug=settings.debug)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health")
    def health():
        return {"status": "ok", "app": settings.app_name, "env": settings.app_env}

    @app.on_event("startup")
    def on_startup():
        ensure_static_assets()
        if settings.database_url.startswith("sqlite"):
            init_db()
        seed_forbidden_words()
        if settings.debug:
            seed_dev_user()

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
