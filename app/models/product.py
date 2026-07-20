"""商品模型（上架发布模块）。"""
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(128))
    subcategory: Mapped[str | None] = mapped_column(String(128), nullable=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    images_json: Mapped[str] = mapped_column(Text, default="[]")  # file_id 列表
    specs_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="draft")  # draft | ready | published
    platforms_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)

    @property
    def images(self) -> list[str]:
        return json.loads(self.images_json or "[]")

    @images.setter
    def images(self, value: list[str]) -> None:
        self.images_json = json.dumps(value, ensure_ascii=False)

    @property
    def specs(self) -> dict:
        return json.loads(self.specs_json or "{}")

    @specs.setter
    def specs(self, value: dict) -> None:
        self.specs_json = json.dumps(value, ensure_ascii=False)

    @property
    def platforms(self) -> list[str]:
        return json.loads(self.platforms_json or "[]")

    @platforms.setter
    def platforms(self, value: list[str]) -> None:
        self.platforms_json = json.dumps(value, ensure_ascii=False)
