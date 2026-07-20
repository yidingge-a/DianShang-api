"""Celery 后台任务：上架、视频生成。"""
from __future__ import annotations

import logging
from pathlib import Path

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.task import Task
from app.models.user import User
from app.services import task_service
from app.services.publish_service import _execute_publish
from app.services.upload_service import get_user_file
from app.services import video_service

logger = logging.getLogger(__name__)


def _db():
    return SessionLocal()


@celery_app.task(name="publish.run_task", bind=True, max_retries=2)
def run_publish_task(self, task_id: str, user_id: str) -> dict:
    db = _db()
    try:
        user = db.get(User, user_id)
        task = db.get(Task, task_id)
        if not user or not task:
            return {"error": "task not found"}
        result = _execute_publish(db, user, task)
        task_service.complete_task(db, task, result)
        return result
    except Exception as exc:
        logger.exception("publish task failed: %s", exc)
        raise self.retry(exc=exc, countdown=5) from exc
    finally:
        db.close()


@celery_app.task(name="video.generate_task", bind=True, max_retries=2)
def run_video_task(self, task_id: str, user_id: str) -> dict:
    db = _db()
    try:
        user = db.get(User, user_id)
        task = db.get(Task, task_id)
        if not user or not task:
            return {"error": "task not found"}
        body = task.input_data or {}
        image_ids = body.get("image_ids") or body.get("product_images") or []
        paths = []
        for iid in image_ids:
            try:
                record = get_user_file(db, user_id, iid)
                paths.append(Path(record.file_path))
            except Exception:
                continue
        duration = int(body.get("duration", 15) or 15)
        music = bool(body.get("music", False))
        result = video_service.generate_product_video(paths, duration, music)
        payload = {
            "status": result.get("status", "completed"),
            "progress": 100,
            "result_url": result.get("result_url", ""),
            "result": {"result_url": result.get("result_url", "")},
            "mode": result.get("mode", ""),
        }
        task_service.complete_task(db, task, payload)
        return payload
    except Exception as exc:
        logger.exception("video task failed: %s", exc)
        raise self.retry(exc=exc, countdown=5) from exc
    finally:
        db.close()
