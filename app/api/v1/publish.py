"""上架发布接口。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import publish_service

router = APIRouter()


@router.get("/products")
def list_products(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(publish_service.list_products(db, user, page, page_size))


@router.post("/products")
def create_product(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(publish_service.create_product(db, user, body))


@router.put("/products/{product_id}")
def update_product(product_id: str, body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(publish_service.update_product(db, user, product_id, body))


@router.delete("/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    publish_service.delete_product(db, user, product_id)
    return ok(message="删除成功")


@router.post("/platform-recommendation")
def platform_recommendation(
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    return ok(publish_service.platform_recommendation(db, user, body))


@router.get("/platforms")
def platforms(user: User = Depends(get_current_user_or_dev)):
    return ok(publish_service.list_platforms())


@router.post("/publish")
def publish(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(publish_service.publish_product(db, user, body))


@router.get("/tasks/{publish_id}")
def publish_task(
    publish_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    return ok(publish_service.get_publish_task(db, user, publish_id))
