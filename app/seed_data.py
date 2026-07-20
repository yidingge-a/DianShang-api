"""初始化违禁词、开发联调用户等种子数据。"""
import json

from sqlalchemy import select

from app.core.security import get_password_hash
from app.database import SessionLocal
from app.models.forbidden_word import ForbiddenWord
from app.models.user import User

DEV_USER_ID = "00000000-0000-4000-8000-000000000001"

SEED_WORDS = [
    ("最好", "绝对化用语", "high", "禁止使用绝对化最高级表述"),
    ("第一", "绝对化用语", "high", "禁止使用排名类绝对化用语"),
    ("最佳", "绝对化用语", "high", "禁止使用绝对化表述"),
    ("国家级", "虚假宣传", "high", "禁止滥用国家级称谓"),
    ("顶级", "绝对化用语", "medium", "禁止使用绝对化表述"),
    ("100%有效", "医疗宣称", "high", "禁止绝对功效承诺"),
    ("根治", "医疗宣称", "high", "禁止医疗功效宣称"),
    ("秒杀全网", "虚假宣传", "medium", "禁止夸大宣传"),
]


def seed_forbidden_words() -> None:
    """若违禁词表为空则写入初始数据。"""
    db = SessionLocal()
    try:
        exists = db.scalar(select(ForbiddenWord).limit(1))
        if exists:
            return
        for word, category, severity, desc in SEED_WORDS:
            db.add(
                ForbiddenWord(
                    word=word,
                    category=category,
                    severity=severity,
                    platforms_json=json.dumps(["all"], ensure_ascii=False),
                    description=desc,
                )
            )
        db.commit()
    finally:
        db.close()


def seed_dev_user() -> None:
    """开发联调默认用户（无登录页时供上传等接口使用）。"""
    db = SessionLocal()
    try:
        if db.get(User, DEV_USER_ID):
            return
        db.add(
            User(
                user_id=DEV_USER_ID,
                username="dev",
                email="dev@local.test",
                password_hash=get_password_hash("dev123456"),
            )
        )
        db.commit()
    finally:
        db.close()
