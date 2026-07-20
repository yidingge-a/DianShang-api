"""合规文案接口。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import compliance_service

router = APIRouter()


@router.post("/detail-page/generate")
def detail_page(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(compliance_service.generate_detail_page(db, user, body))


@router.get("/platforms/{platform}/guidelines")
def guidelines(platform: str, user: User = Depends(get_current_user_or_dev)):
    return ok(compliance_service.get_platform_guidelines(platform))


@router.post("/ad-copy/generate")
def ad_copy(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(compliance_service.generate_ad_copy(db, user, body))


@router.post("/forbidden-words/check")
def check_words(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(compliance_service.check_forbidden_words(db, body.get("content", ""), body.get("platform", "taobao")))


@router.get("/forbidden-words")
def list_words(
    platform: str | None = None,
    category: str = "all",
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    return ok(compliance_service.list_forbidden_words(db, platform, category, page, page_size))
