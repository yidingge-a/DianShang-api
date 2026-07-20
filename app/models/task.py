"""异步任务模型（图片处理、视频生成、报告等）。"""
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Task(Base):
    __tablename__ = "tasks"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    task_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending | processing | completed | failed
    progress: Mapped[int] = mapped_column(Integer, default=0)
    input_json: Mapped[str] = mapped_column(Text, default="{}")
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def input_data(self) -> dict:
        return json.loads(self.input_json or "{}")

    @input_data.setter
    def input_data(self, value: dict) -> None:
        self.input_json = json.dumps(value, ensure_ascii=False)

    @property
    def result_data(self) -> dict | None:
        if not self.result_json:
            return None
        return json.loads(self.result_json)

    @result_data.setter
    def result_data(self, value: dict | None) -> None:
        self.result_json = json.dumps(value, ensure_ascii=False) if value else None
