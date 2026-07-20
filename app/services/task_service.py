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


def complete_task(db: Session, task: Task, result: dict, *, processing_time: float | None = None) -> Task:
    task.status = "completed"
    task.progress = 100
    task.result_data = result
    task.completed_at = utc_now()
    if processing_time is not None and task.result_data is not None:
        task.result_data = {**task.result_data, "processing_time": processing_time}
    db.commit()
    db.refresh(task)
    return task


def fail_task(db: Session, task: Task, message: str) -> Task:
    task.status = "failed"
    task.error_message = message
    task.completed_at = utc_now()
    db.commit()
    db.refresh(task)
    return task


def task_to_dict(task: Task) -> dict:
    """序列化任务，供 API 返回。"""
    data = {
        "task_id": task.task_id,
        "status": task.status,
        "progress": task.progress,
        "created_at": utc_now_iso(),
    }
    if task.result_data:
        data.update(task.result_data)
    if task.error_message:
        data["error_message"] = task.error_message
    return data
