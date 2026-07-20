"""认证接口。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_refresh_user_id
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services import auth_service

router = APIRouter()


@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """用户注册。"""
    data = auth_service.register_user(db, body)
    return ok(data, "注册成功")


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """用户登录。"""
    data = auth_service.login_user(db, body)
    return ok(data, "登录成功")


@router.post("/refresh")
def refresh(user_id: str = Depends(get_refresh_user_id), db: Session = Depends(get_db)):
    """刷新 Token。"""
    data = auth_service.refresh_tokens(db, user_id)
    return ok(data, "刷新成功")


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """获取当前用户信息。"""
    return ok(auth_service.get_me(user))
