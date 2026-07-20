"""定价成本接口。"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.exceptions import AppException
from app.core.rate_limit import llm_rate_limit
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import pricing_service

router = APIRouter()


@router.post("/price-comparison")
@llm_rate_limit()
def price_comparison(request: Request, body: dict, user: User = Depends(get_current_user_or_dev)):
    return ok(pricing_service.price_comparison(body))


@router.post("/recommendation")
@llm_rate_limit()
def recommendation(request: Request, body: dict, user: User = Depends(get_current_user_or_dev)):
    return ok(pricing_service.price_recommendation(body))


@router.post("/bom/parse-image")
@llm_rate_limit()
def bom_parse_image(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    image_id = (body.get("image_id") or "").strip()
    if not image_id:
        raise AppException("请提供 image_id", 400)
    return ok(pricing_service.parse_bom_image(db, user, image_id))


@router.post("/bom/analyze")
@llm_rate_limit()
def bom_analyze(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    return ok(pricing_service.analyze_bom(db, user, body))


@router.post("/bom/products")
def save_bom(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(pricing_service.save_bom_product(db, user, body))


@router.get("/bom/products/{product_id}/report")
def bom_report(product_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(pricing_service.get_bom_report(db, user, product_id))


@router.get("/bom/products")
def list_bom(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(pricing_service.list_bom_products(db, user, page, page_size))
