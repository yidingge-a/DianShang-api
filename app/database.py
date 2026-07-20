"""数据库连接与会话管理。"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# SQLite 需要 check_same_thread=False
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy 模型基类。"""


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：请求级数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """创建所有表（开发环境使用；生产建议 Alembic）。"""
    from app import models  # noqa: F401 — 注册所有模型

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    (settings.upload_dir.parent / "data").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
