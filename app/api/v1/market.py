"""市场分析接口。"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.rate_limit import llm_rate_limit
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import market_service

router = APIRouter()


@router.post("/industry-chain/match")
@llm_rate_limit()
def industry_match(request: Request, body: dict, user: User = Depends(get_current_user_or_dev)):
    return ok(market_service.industry_chain_match(body))


@router.post("/analysis/report")
@llm_rate_limit()
def analysis_report(request: Request, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(market_service.generate_report(db, user, body))


@router.get("/trends")
@llm_rate_limit()
def trends(
    request: Request,
    keyword: str,
    platform: str = "taobao",
    metric: str = "search_volume",
    time_range: str = "30d",
    user: User = Depends(get_current_user_or_dev),
):
    return ok(market_service.get_trends(keyword, platform, metric, time_range))


@router.get("/overview")
@llm_rate_limit()
def overview(request: Request, keyword: str, user: User = Depends(get_current_user_or_dev)):
    return ok(market_service.get_overview(keyword))
