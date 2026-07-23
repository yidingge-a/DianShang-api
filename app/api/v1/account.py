"""个人后台：用户信息与使用历史。"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.response import ok
from app.database import get_db
from app.models.user import User
from app.services import auth_service, task_service

router = APIRouter()

TASK_TYPE_LABELS = {
    "detail_page": "详情页生成",
    "video_generate": "视频生成",
    "image_optimize": "图片优化（精修）",
    "image_white_bg": "白底效果",
    "image_defect_repair": "瑕疵修复",
    "image_auto_crop": "自动裁剪",
    "background_remove": "抠图换背景",
    "image_repair": "图片修复",
    "poster": "海报生成",
    "ai_image_generate": "AI 生图",
    "image_batch": "批量图片处理",
}

# 展示顺序
FEATURE_ORDER = [
    "detail_page",
    "image_optimize",
    "image_white_bg",
    "image_defect_repair",
    "image_auto_crop",
    "background_remove",
    "image_repair",
    "video_generate",
    "poster",
    "ai_image_generate",
    "image_batch",
]


@router.get("/me")
def account_me(user: User = Depends(get_current_user)):
    """个人资料。"""
    return ok(auth_service.get_me(user))


@router.get("/history")
def account_history(
    limit: int = Query(10, ge=1, le=50, description="每个功能最多返回条数"),
    task_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """当前用户功能使用历史：按功能分类，每类最多 limit 条。"""
    if task_type:
        tasks = task_service.list_user_tasks(db, user.user_id, limit=limit, task_type=task_type)
        items = []
        for t in tasks:
            item = task_service.task_history_item(t)
            item["task_type_label"] = TASK_TYPE_LABELS.get(t.task_type, t.task_type)
            # 单图结果也塞进 preview
            if not item["preview_images"] and (t.result_data or {}).get("result_url"):
                item["preview_images"] = [(t.result_data or {}).get("result_url")]
            items.append(item)
        return ok({
            "mode": "flat",
            "task_type": task_type,
            "total": len(items),
            "items": items,
            "limit": limit,
        })

    grouped = task_service.list_user_history_by_feature(db, user.user_id, keep=limit)
    categories = []
    ordered_keys = [k for k in FEATURE_ORDER if k in grouped] + [
        k for k in grouped.keys() if k not in FEATURE_ORDER
    ]
    for key in ordered_keys:
        items = []
        for t in grouped[key]:
            item = task_service.task_history_item(t)
            item["task_type_label"] = TASK_TYPE_LABELS.get(t.task_type, t.task_type)
            if not item["preview_images"] and (t.result_data or {}).get("result_url"):
                item["preview_images"] = [(t.result_data or {}).get("result_url")]
            items.append(item)
        categories.append({
            "task_type": key,
            "label": TASK_TYPE_LABELS.get(key, key),
            "count": len(items),
            "items": items,
        })
    return ok({
        "mode": "grouped",
        "limit_per_feature": limit,
        "categories": categories,
        "total_categories": len(categories),
    })
