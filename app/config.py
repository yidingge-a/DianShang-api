"""应用配置：从环境变量 / .env 读取，集中管理。"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# 项目根目录（DianShang_project/）
PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """全局配置项。"""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "全链路电商智能系统"
    app_env: str = "dev"  # dev | prod
    debug: bool = True
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"

    database_url: str = f"sqlite:///{PROJECT_ROOT / 'data' / 'ecommerce.db'}"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 天
    refresh_token_expire_days: int = 30

    upload_dir: Path = PROJECT_ROOT / "uploads"
    max_image_size: int = 10 * 1024 * 1024
    max_video_size: int = 100 * 1024 * 1024
    base_url: str = "http://localhost:8000"

    cors_origins: str = "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173"

    # LLM（与 WebAIAgent / deploy/.env.example 同名，可从 deploy/.env 复制 OPENAI_API_KEY）
    openai_api_key: str = ""
    openai_base_url: str = "https://kuaipao.ai/v1"
    llm_chat_model: str = "gpt-5.4"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 2048
    llm_timeout_seconds: float = 120.0

    # 视觉 / 图像模型（vLLM 或 DashScope 兼容多模态，未部署时留空，走 Pillow）
    vision_api_base: str = ""
    vision_api_key: str = ""
    vision_model: str = ""
    vision_timeout_seconds: float = 180.0

    # 阿里云 DashScope（千问 VL 识图 + 万相文生图/图生图）
    dashscope_api_key: str = ""
    dashscope_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    dashscope_image_model: str = "wan2.7-image-pro"

    # Gemini 图像（kuaipao.pro generateContent，如 nano-banana-2-2k）
    gemini_image_api_key: str = ""
    gemini_image_base_url: str = "https://kuaipao.ai"
    gemini_image_model: str = "nano-banana-2"
    gemini_image_timeout_seconds: float = 180.0

    # 视频生成（第三方 API，未配置时 ffmpeg 合成）
    video_api_base: str = ""
    video_api_key: str = ""
    video_model: str = ""

    # 电商数据（比价、市场、监控；可选第三方数据服务）
    ecommerce_data_api_base: str = ""
    ecommerce_data_api_key: str = ""

    # 平台上架（发布网关或各平台 OpenAPI）
    publish_gateway_url: str = ""
    publish_gateway_api_key: str = ""
    taobao_open_api_key: str = ""
    taobao_open_api_secret: str = ""
    jd_open_api_key: str = ""
    pdd_open_api_key: str = ""

    # Redis / Celery 异步任务
    redis_url: str = "redis://localhost:6379/0"
    celery_enabled: bool = False

    # 对象存储（local | s3）
    storage_backend: str = "local"
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    s3_public_base_url: str = ""

    # 限流
    rate_limit_enabled: bool = True
    rate_limit_default: str = "200/minute"
    rate_limit_llm: str = "30/minute"

    @property
    def is_production(self) -> bool:
        return self.app_env == "prod" or not self.debug

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def vision_enabled(self) -> bool:
        return bool(self.vision_api_base.strip() and self.vision_model.strip())

    @property
    def dashscope_enabled(self) -> bool:
        return bool(self.dashscope_api_key.strip())

    @property
    def gemini_image_enabled(self) -> bool:
        return bool(self.gemini_image_api_key.strip())

    @property
    def s3_enabled(self) -> bool:
        return self.storage_backend == "s3" and bool(self.s3_bucket.strip())

    @property
    def celery_broker(self) -> str:
        return self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
