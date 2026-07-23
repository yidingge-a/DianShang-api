"""任务状态管理（图片/视频/报告等异步任务统一落库）。"""
from sqlalchemy.orm import Session

from app.models.task import Task
from app.utils import utc_now, utc_now_iso


def create_task(db: Session, user_id: str, task_type: str, input_data: dict) -> Task:
    task = Task(user_id=user_id, task_type=task_type, status="processing", input_data=input_data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_progress(
    db: Session,
    task: Task,
    progress: int,
    *,
    message: str | None = None,
    partial: dict | None = None,
) -> Task:
    """更新进行中任务进度（供前端轮询）。"""
    task.status = "processing"
    task.progress = max(0, min(int(progress), 99))
    payload = dict(task.result_data or {})
    if message is not None:
        payload["message"] = message
    if partial:
        payload.update(partial)
    payload["status"] = "processing"
    payload["progress"] = task.progress
    task.result_data = payload
    db.commit()
    db.refresh(task)
    return task


def complete_task(db: Session, task: Task, result: dict, *, processing_time: float | None = None) -> Task:
    task.status = "completed"
    task.progress = 100
    task.result_data = result
    task.completed_at = utc_now()
    if processing_time is not None and task.result_data is not None:
        task.result_data = {**task.result_data, "processing_time": processing_time}
    db.commit()
    db.refresh(task)
    # 每个功能最多保留 10 条历史
    try:
        trim_user_task_history(db, task.user_id, task.task_type, keep=10)
    except Exception:
        pass
    return task


def fail_task(db: Session, task: Task, message: str) -> Task:
    task.status = "failed"
    task.error_message = message
    task.completed_at = utc_now()
    db.commit()
    db.refresh(task)
    return task


def get_task_by_id(db: Session, task_id: str) -> Task | None:
    return db.get(Task, task_id)


def task_to_dict(task: Task) -> dict:
    """序列化任务，供 API 返回。"""
    data = {
        "task_id": task.task_id,
        "task_type": task.task_type,
        "status": task.status,
        "progress": task.progress,
        "created_at": task.created_at.isoformat() if task.created_at else utc_now_iso(),
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }
    if task.result_data:
        # result 里的 status/progress 不应覆盖任务主状态
        merged = {k: v for k, v in task.result_data.items() if k not in ("status", "progress", "task_id")}
        data.update(merged)
    if task.error_message:
        data["error_message"] = task.error_message
    return data


def list_user_tasks(
    db: Session,
    user_id: str,
    *,
    limit: int = 10,
    task_type: str | None = None,
) -> list[Task]:
    """当前用户最近任务（默认最多 10 条，新→旧）。"""
    from sqlalchemy import select

    limit = max(1, min(int(limit or 10), 50))
    stmt = select(Task).where(Task.user_id == user_id)
    if task_type:
        stmt = stmt.where(Task.task_type == task_type)
    stmt = stmt.order_by(Task.created_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def task_history_item(task: Task) -> dict:
    """个人后台历史条目（精简字段）。"""
    rd = task.result_data or {}
    inp = task.input_data or {}
    previews = rd.get("preview_images") or rd.get("result", {}).get("preview_images") or []
    if isinstance(previews, list):
        previews = previews[:6]
    else:
        previews = []
    result_url = rd.get("result_url") or (rd.get("result") or {}).get("result_url") or ""
    if not previews and result_url:
        previews = [result_url]
    return {
        "task_id": task.task_id,
        "task_type": task.task_type,
        "status": task.status,
        "progress": task.progress,
        "product_name": rd.get("product_name") or inp.get("product_name") or "",
        "image_model": rd.get("image_model") or inp.get("image_model") or "",
        "pages_count": rd.get("pages_count") or rd.get("pages_done") or len(previews) or None,
        "preview_images": previews,
        "result_url": result_url,
        "download_zip_url": rd.get("download_zip_url") or (rd.get("result") or {}).get("download_zip_url") or "",
        "html_url": rd.get("html_url") or (rd.get("result") or {}).get("html_url") or "",
        "message": rd.get("message") or task.error_message or "",
        "error_message": task.error_message,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


def trim_user_task_history(db: Session, user_id: str, task_type: str, *, keep: int = 10) -> int:
    """每个功能类型只保留最近 keep 条，删除更旧记录。返回删除条数。"""
    from sqlalchemy import select

    keep = max(1, min(int(keep or 10), 50))
    rows = list(
        db.scalars(
            select(Task)
            .where(Task.user_id == user_id, Task.task_type == task_type)
            .order_by(Task.created_at.desc())
        ).all()
    )
    removed = 0
    for old in rows[keep:]:
        db.delete(old)
        removed += 1
    if removed:
        db.commit()
    return removed


def list_user_history_by_feature(db: Session, user_id: str, *, keep: int = 10) -> dict[str, list[Task]]:
    """按 task_type 分组，每组最多 keep 条。"""
    from sqlalchemy import select

    keep = max(1, min(int(keep or 10), 50))
    rows = list(
        db.scalars(
            select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
        ).all()
    )
    grouped: dict[str, list[Task]] = {}
    for row in rows:
        bucket = grouped.setdefault(row.task_type, [])
        if len(bucket) < keep:
            bucket.append(row)
    return grouped
