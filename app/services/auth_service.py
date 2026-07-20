"""认证业务逻辑。"""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import AppException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenData, UserOut
from app.utils import utc_now, utc_now_iso

settings = get_settings()


def _user_to_out(user: User) -> UserOut:
    return UserOut(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        avatar=user.avatar,
        created_at=utc_now_iso() if user.created_at else None,
        last_login=utc_now_iso() if user.last_login else None,
    )


def register_user(db: Session, body: RegisterRequest) -> UserOut:
    """用户注册。"""
    exists = db.scalar(
        select(User).where(or_(User.email == body.email, User.username == body.username))
    )
    if exists:
        raise AppException("用户名或邮箱已存在", 400)

    user = User(
        username=body.username,
        email=body.email,
        password_hash=get_password_hash(body.password),
        phone=body.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_out(user)


def login_user(db: Session, body: LoginRequest) -> TokenData:
    """用户登录，返回双 Token。"""
    user = db.scalar(
        select(User).where(
            or_(User.email == body.email, User.username == body.email),
        )
    )
    if not user or not verify_password(body.password, user.password_hash):
        raise AppException("邮箱/用户名或密码错误", 401)

    user.last_login = utc_now()
    db.commit()

    access = create_access_token(user.user_id)
    refresh = create_refresh_token(user.user_id)
    return TokenData(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=_user_to_out(user),
    )


def refresh_tokens(db: Session, user_id: str) -> TokenData:
    """用 Refresh Token 换新 Access Token。"""
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise AppException("用户不存在", 401)
    access = create_access_token(user.user_id)
    refresh = create_refresh_token(user.user_id)
    return TokenData(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=_user_to_out(user),
    )


def get_me(user: User) -> UserOut:
    return _user_to_out(user)
