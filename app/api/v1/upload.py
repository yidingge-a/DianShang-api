"""文件上传接口。"""
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_or_dev
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import upload_service

router = APIRouter()


@router.post("")
def upload_file(
    file: UploadFile = File(...),
    type: str = Form("image"),
    module: str = Form("smart-design"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    """单文件上传。"""
    data = upload_service.upload_single(db, user, file, type, module)
    return ok(data)


@router.post("/batch")
def upload_batch(
    files: list[UploadFile] = File(...),
    type: str = Form("image"),
    module: str = Form("smart-design"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    """批量上传。"""
    data = upload_service.upload_batch(db, user, files, type, module)
    return ok(data)


@router.get("/list")
def list_files(
    module: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    """文件列表。"""
    data = upload_service.list_files(db, user, module, page, page_size)
    return ok(data)


@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_or_dev),
):
    """删除文件。"""
    upload_service.delete_file(db, user, file_id)
    return ok(message="删除成功")
