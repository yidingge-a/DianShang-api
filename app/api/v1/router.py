"""API v1 路由聚合。"""
from fastapi import APIRouter

from app.api.v1 import (
    auth,
    compliance,
    market,
    operation,
    pricing,
    publish,
    smart_design,
    upload,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(upload.router, prefix="/upload", tags=["文件上传"])
api_router.include_router(smart_design.router, prefix="/smart-design", tags=["智能美工"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["合规文案"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["定价成本"])
api_router.include_router(market.router, prefix="/market", tags=["市场分析"])
api_router.include_router(publish.router, prefix="/publish", tags=["上架发布"])
api_router.include_router(operation.router, prefix="/operation", tags=["数据运营"])
