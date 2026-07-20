"""文件上传业务。"""
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.file import FileRecord
from app.models.user import User
from app.utils import utc_now_iso
from app.utils.file_storage import save_upload_file, validate_upload


def upload_single(
    db: Session,
    user: User,
    file: UploadFile,
    file_type: str,
    module: str,
) -> dict:
    mime = validate_upload(file, file_type)
    content = file.file.read()
    file_id, path, url = save_upload_file(content, file.filename or "file", module)

    record = FileRecord(
        file_id=file_id,
        user_id=user.user_id,
        file_name=file.filename or "file",
        file_path=str(path),
        file_url=url,
        file_size=len(content),
        mime_type=mime,
        file_type=file_type,
        module=module,
    )
    db.add(record)
    db.commit()
    return {
        "file_id": record.file_id,
        "file_name": record.file_name,
        "file_url": record.file_url,
        "file_size": record.file_size,
        "mime_type": record.mime_type,
        "uploaded_at": utc_now_iso(),
    }


def upload_batch(
    db: Session,
    user: User,
    files: list[UploadFile],
    file_type: str,
    module: str,
) -> dict:
    uploaded, failed = [], []
    for f in files:
        try:
            uploaded.append(upload_single(db, user, f, file_type, module) | {"status": "success"})
        except AppException as exc:
            failed.append({"file_name": f.filename, "reason": exc.message})
        except Exception as exc:
            failed.append({"file_name": f.filename, "reason": str(exc)})
    return {"uploaded": uploaded, "failed": failed}


def list_files(db: Session, user: User, module: str | None, page: int, page_size: int) -> dict:
    base_filter = [FileRecord.user_id == user.user_id]
    if module:
        base_filter.append(FileRecord.module == module)
    total = db.scalar(select(func.count()).select_from(FileRecord).where(*base_filter)) or 0
    rows = db.scalars(
        select(FileRecord)
        .where(*base_filter)
        .order_by(FileRecord.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        {
            "file_id": r.file_id,
            "file_name": r.file_name,
            "file_url": r.file_url,
            "file_size": r.file_size,
            "module": r.module,
            "uploaded_at": utc_now_iso(),
        }
        for r in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def delete_file(db: Session, user: User, file_id: str) -> None:
    record = db.get(FileRecord, file_id)
    if not record or record.user_id != user.user_id:
        raise AppException("文件不存在", 404)
    db.delete(record)
    db.commit()


def get_user_file(db: Session, user_id: str, file_id: str) -> FileRecord:
    record = db.get(FileRecord, file_id)
    if not record or record.user_id != user_id:
        raise AppException("文件不存在或无权访问", 404)
    return record
