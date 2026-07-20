"""FastAPI 依赖注入：数据库会话、当前用户。"""
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.exceptions import AppException
from app.core.security import decode_token
from app.database import get_db
from app.models.user import User
from app.seed_data import DEV_USER_ID

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    """从 Bearer Token 解析当前登录用户。"""
    if not credentials or not credentials.credentials:
        raise AppException("未登录或 Token 缺失", 401)
    try:
        payload = decode_token(credentials.credentials)
    except JWTError as exc:
        raise AppException("Token 无效或已过期", 401) from exc
    if payload.get("type") != "access":
        raise AppException("请使用 Access Token", 401)
    user_id = payload.get("sub")
    if not user_id:
        raise AppException("Token 无效", 401)
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise AppException("用户不存在或已禁用", 401)
    return user


def get_current_user_or_dev(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    """仅 DEBUG=true 时允许无 Token 使用 dev 用户；生产环境等同 get_current_user。"""
    if not get_settings().debug:
        return get_current_user(db, credentials)
    if credentials and credentials.credentials:
        return get_current_user(db, credentials)
    user = db.get(User, DEV_USER_ID)
    if user and user.is_active:
        return user
    raise AppException("未登录或 Token 缺失", 401)


def get_refresh_user_id(
    authorization: str | None = Header(None),
) -> str:
    """刷新 Token 接口：从 Authorization 头解析 refresh token 的 user_id。"""
    if not authorization or not authorization.startswith("Bearer "):
        raise AppException("缺少 Refresh Token", 401)
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise AppException("Refresh Token 无效", 401) from exc
    if payload.get("type") != "refresh":
        raise AppException("请使用 Refresh Token", 401)
    user_id = payload.get("sub")
    if not user_id:
        raise AppException("Token 无效", 401)
    return user_id
