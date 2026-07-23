"""智能美工接口。"""
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import smart_design_service

router = APIRouter()


class ImageOptimizeRequest(BaseModel):
    image_id: str
    # classic | vlm ：两组功能互斥
    feature_set: str = "classic"
    optimize_type: str | None = "all"
    intensity: float = Field(0.7, ge=0, le=1)
    # vlm 集内单选：white_background | remove_defects | auto_crop
    vlm_action: str | None = None
    white_background: bool = False
    remove_defects: bool = False
    auto_crop: bool = False


class ImageBgRemoveRequest(BaseModel):
    image_id: str
    background_type: str = "white"
    background_color: str = "#FFFFFF"
    output_format: str = "png"


class ImageRepairRequest(BaseModel):
    image_id: str
    repair_areas: list[dict] = []
    auto_detect: bool = True


class ImageBatchRequest(BaseModel):
    image_ids: list[str]
    process_type: str = "resize"
    params: dict[str, Any] = {}


@router.post("/image/optimize")
def image_optimize(body: ImageOptimizeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.optimize(db, user, body.model_dump()))


@router.post("/image/background-remove")
def background_remove(body: ImageBgRemoveRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.background_remove(db, user, body.model_dump()))


@router.post("/image/repair")
def image_repair(body: ImageRepairRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.repair(db, user, body.model_dump()))


@router.post("/image/batch")
def image_batch(body: ImageBatchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.batch_images(db, user, body.model_dump()))


@router.get("/image/models")
def image_models(user: User = Depends(get_current_user_or_dev)):
    """可选生图模型列表（万相 / Gemini）。"""
    from app.services import image_gen_router

    return ok(image_gen_router.list_models())


@router.post("/image/generate")
def image_generate(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    """文生图 / 图生图：body.prompt 必填；可选 image_model / image_id。"""
    return ok(smart_design_service.generate_ai_image(db, user, body))


@router.post("/detail-page/generate")
def detail_page(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.generate_detail_page(db, user, body))


@router.post("/video/generate")
def video_generate(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.generate_video(db, user, body))


@router.post("/poster/generate")
def poster_generate(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.generate_poster(db, user, body))


@router.post("/tools/merge-images")
def merge_images(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.merge_images(db, user, body))


@router.post("/tools/add-elements")
def add_elements(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.add_elements(db, user, body))


@router.post("/tools/crop-resize")
def crop_resize(body: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.crop_resize(db, user, body))


@router.get("/templates")
def templates(
    type: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
    user: User = Depends(get_current_user_or_dev),
):
    return ok(smart_design_service.list_templates(type, category, page, page_size))


@router.get("/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user_or_dev)):
    return ok(smart_design_service.get_task(db, user, task_id))
