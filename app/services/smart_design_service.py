"""智能美工模块业务（字段与前端 v2 文档对齐）。"""
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.services import image_service, task_service
from app.services.ai_service import ai_service
from app.services.upload_service import get_user_file
from app.services import video_service
from app.utils.content_files import write_detail_page_html

settings = get_settings()

TEMPLATES = [
    {"template_id": "tpl-001", "name": "简约白底", "type": "poster", "category": "promotional"},
    {"template_id": "tpl-002", "name": "618 大促", "type": "poster", "category": "promotional"},
    {"template_id": "tpl-003", "name": "现代详情页", "type": "detail", "category": "modern"},
]


def _file_path(db: Session, user_id: str, image_id: str) -> Path:
    record = get_user_file(db, user_id, image_id)
    return Path(record.file_path)


def _optimize_options(body: dict) -> dict:
    """前端扁平字段 white_background 等，兼容旧版嵌套 options。"""
    opts = dict(body.get("options") or {})
    for key in ("white_background", "remove_defects", "auto_crop"):
        if key in body:
            opts[key] = body[key]
    return opts


def optimize(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    task = task_service.create_task(db, user.user_id, "image_optimize", body)
    result = image_service.optimize_image(
        path,
        body.get("optimize_type", "all"),
        body.get("intensity", 0.7),
        _optimize_options(body),
    )
    task_service.complete_task(db, task, {
        "original_url": get_user_file(db, user.user_id, body["image_id"]).file_url,
        **result,
    })
    return task_service.task_to_dict(task)


def background_remove(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    task = task_service.create_task(db, user.user_id, "background_remove", body)
    result = image_service.remove_background(
        path,
        body.get("background_type", "white"),
        body.get("background_color", "#FFFFFF"),
        body.get("output_format", "png"),
    )
    task_service.complete_task(db, task, result)
    return task_service.task_to_dict(task)


def repair(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    task = task_service.create_task(db, user.user_id, "image_repair", body)
    result = image_service.repair_image(path, body.get("auto_detect", True))
    task_service.complete_task(db, task, result)
    return task_service.task_to_dict(task)


def batch_images(db: Session, user: User, body: dict) -> dict:
    paths = [_file_path(db, user.user_id, iid) for iid in body.get("image_ids", [])]
    results = image_service.batch_process(paths, body.get("process_type", "resize"), body.get("params", {}))
    return {
        "batch_task_id": task_service.create_task(db, user.user_id, "image_batch", body).task_id,
        "total": len(paths),
        "processed": sum(1 for r in results if r.get("status") == "success"),
        "failed": sum(1 for r in results if r.get("status") != "success"),
        "results": results,
    }


def generate_detail_page(db: Session, user: User, body: dict) -> dict:
    task = task_service.create_task(db, user.user_id, "detail_page", body)
    product_name = body.get("product_name", "商品")
    product_description = body.get("product_description", "")
    style = body.get("style", "modern")
    body_html = ai_service.generate_detail_html_body(
        product_name, product_description, style, body.get("sections")
    )
    html_url = write_detail_page_html(
        task.task_id,
        product_name,
        product_description,
        style,
        body_html=body_html,
    )
    result = {
        "status": "completed",
        "html_url": html_url,
        "result": {
            "html_url": html_url,
            "preview_images": [],
            "pages_count": len(body.get("sections", [])) or 3,
        },
    }
    task_service.complete_task(db, task, result)
    return task_service.task_to_dict(task)


def generate_video(db: Session, user: User, body: dict) -> dict:
    task = task_service.create_task(db, user.user_id, "video_generate", body)
    task_service.complete_task(db, task, {
        "status": "processing",
        "progress": 0,
        "result_url": "",
        "estimated_time": 60,
    })
    if settings.celery_enabled:
        from app.tasks.worker_tasks import run_video_task
        run_video_task.delay(task.task_id, user.user_id)
    data = task_service.task_to_dict(task)
    data["status"] = "processing"
    return data


def generate_poster(db: Session, user: User, body: dict) -> dict:
    task = task_service.create_task(db, user.user_id, "poster", body)
    result = image_service.generate_poster(
        body.get("event_title", "活动"),
        body.get("colors", ["#FF0000", "#FFFFFF"]),
        body.get("output_size", {"width": 1080, "height": 1920}),
    )
    task_service.complete_task(db, task, result)
    return task_service.task_to_dict(task)


def merge_images(db: Session, user: User, body: dict) -> dict:
    paths = [_file_path(db, user.user_id, i) for i in body.get("image_ids", [])]
    return image_service.merge_images(paths, body.get("merge_mode", "horizontal"), body.get("output_size"))


def add_elements(db: Session, user: User, body: dict) -> dict:
    path = _file_path(db, user.user_id, body["image_id"])
    return image_service.add_elements(path, body.get("elements", []))


def crop_resize(db: Session, user: User, body: dict) -> dict:
    """前端传 image_ids[] + operation（v2）。"""
    image_ids = body.get("image_ids") or []
    if not image_ids and body.get("image_id"):
        image_ids = [body["image_id"]]
    if not image_ids:
        from app.core.exceptions import AppException
        raise AppException("请提供 image_ids", 400)

    operation = body.get("operation", "resize")
    paths = [_file_path(db, user.user_id, iid) for iid in image_ids]
    results = [image_service.apply_crop_operation(p, operation) for p in paths]
    return {"result_url": results[0]["result_url"]}


def list_templates(template_type: str | None, category: str | None, page: int, page_size: int) -> dict:
    items = TEMPLATES
    if template_type:
        items = [t for t in items if t["type"] == template_type]
    if category:
        items = [t for t in items if t["category"] == category]
    start = (page - 1) * page_size
    return {"items": items[start : start + page_size], "total": len(items), "page": page, "page_size": page_size}


def get_task(db: Session, user: User, task_id: str) -> dict:
    from app.core.exceptions import AppException
    from app.models.task import Task

    task = db.get(Task, task_id)
    if not task or task.user_id != user.user_id:
        raise AppException("任务不存在", 404)

    if task.task_type == "video_generate" and task.status == "processing" and not settings.celery_enabled:
        elapsed = (datetime.now(timezone.utc) - task.created_at).total_seconds()
        if elapsed >= 1:
            body = task.input_data or {}
            image_ids = body.get("image_ids") or body.get("product_images") or []
            paths = []
            for iid in image_ids:
                try:
                    record = get_user_file(db, user.user_id, iid)
                    paths.append(Path(record.file_path))
                except Exception:
                    continue

            duration = int(body.get("duration", 15) or 15)
            music = bool(body.get("music", False))
            result = video_service.generate_product_video(paths, duration, music)
            task_service.complete_task(db, task, {
                "status": result.get("status", "completed"),
                "progress": 100,
                "result_url": result.get("result_url", ""),
                "result": {"result_url": result.get("result_url", "")},
                "mode": result.get("mode", ""),
            })

    return task_service.task_to_dict(task)
