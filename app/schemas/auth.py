"""认证相关请求/响应模型。"""
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=32)
    phone: str | None = None


class LoginRequest(BaseModel):
    email: str = Field(..., description="邮箱或用户名")
    password: str


class UserOut(BaseModel):
    user_id: str
    username: str
    email: str
    avatar: str | None = None
    created_at: str | None = None
    last_login: str | None = None

    model_config = {"from_attributes": True}


class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserOut
