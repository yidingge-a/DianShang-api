"""数据运营接口。"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.rate_limit import llm_rate_limit
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import operation_service

router = APIRouter()


@router.post("/marketing/strategies")
@llm_rate_limit()
def strategies(request: Request, body: dict, user: User = Depends(get_current_user_or_dev)):
    return ok(operation_service.generate_strategies(body))


@router.post("/promotion/effect-estimate")
@llm_rate_limit()
def effect_estimate(request: Request, body: dict, user: User = Depends(get_current_user_or_dev)):
    return ok(operation_service.effect_estimate(body))


@router.post("/monitor/setup")
def monitor_setup(
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    return ok(operation_service.setup_monitor(db, user, body))


@router.get("/monitor/{monitor_id}/data")
def monitor_data(
    monitor_id: str,
    time_range: str = "1d",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    return ok(operation_service.get_monitor_data(db, user, monitor_id, time_range))


@router.post("/monitor/optimize")
@llm_rate_limit()
def monitor_optimize(request: Request, body: dict, user: User = Depends(get_current_user_or_dev)):
    return ok(operation_service.optimize_suggestions(body))
