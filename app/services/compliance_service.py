"""合规文案模块业务。"""
import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.forbidden_word import ForbiddenWord
from app.models.user import User
from app.services.ai_service import ai_service
from app.services.task_service import complete_task, create_task, task_to_dict

# 各平台文案规范（静态知识库，可扩展为数据库配置）
PLATFORM_GUIDELINES: dict[str, dict] = {
    "taobao": {
        "title_max_length": 60,
        "description_max_length": 5000,
        "image_requirements": {
            "main_image": {"width": 800, "height": 800, "format": "jpg"},
            "detail_image": {"width": 750, "max_height": 15000},
        },
        "recommended_keywords": ["包邮", "正品", "新款"],
        "forbidden_patterns": ["第一", "最佳", "国家级"],
    },
    "tmall": {
        "title_max_length": 60,
        "description_max_length": 5000,
        "image_requirements": {"main_image": {"width": 800, "height": 800, "format": "jpg"}},
        "recommended_keywords": ["官方", "正品", "旗舰店"],
        "forbidden_patterns": ["最好", "第一", "顶级"],
    },
    "jd": {
        "title_max_length": 50,
        "description_max_length": 3000,
        "image_requirements": {"main_image": {"width": 800, "height": 800, "format": "jpg"}},
        "recommended_keywords": ["京东", "自营", "正品"],
        "forbidden_patterns": ["国家级", "最佳"],
    },
}


def get_platform_guidelines(platform: str) -> dict:
    base = PLATFORM_GUIDELINES.get(platform, PLATFORM_GUIDELINES["taobao"])
    return {"platform": platform, **base}


def generate_detail_page(db: Session, user: User, body: dict) -> dict:
    info = body.get("product_info", {})
    platform = body.get("platform", "taobao")
    task = create_task(db, user.user_id, "compliance_detail", body)
    features = info.get("features", [])
    content = {
        "title": ai_service.generate_product_title(info.get("name", ""), platform, features),
        "selling_points": ai_service.generate_selling_points(features),
        "description": info.get("description")
        or ai_service.generate_product_description(info.get("name", ""), features, platform),
        "keywords": info.get("features", [])[:5],
        "layout_suggestions": {
            "recommended_font_size": 14,
            "recommended_image_width": 750,
            "color_scheme": "#FFFFFF,#000000,#FF6600",
        },
    }
    complete_task(db, task, {"status": "completed", "platform": platform, "content": content})
    return task_to_dict(task)


def generate_ad_copy(db: Session, user: User, body: dict) -> dict:
    copies = ai_service.generate_ad_copies(
        body.get("product_name", ""),
        body.get("copy_type", "title"),
        body.get("count", 3),
        body.get("style", "professional"),
        body.get("max_length", 60),
        body.get("keywords", []),
    )
    # 违禁词复检
    for c in copies:
        check = check_forbidden_words(db, c["content"], body.get("target_platform", "taobao"))
        c["forbidden_check"] = {"passed": check["passed"], "warnings": [v["word"] for v in check["violations"]]}
    return {"copies": copies}


def check_forbidden_words(db: Session, content: str, platform: str) -> dict:
    words = db.scalars(select(ForbiddenWord)).all()
    violations = []
    for w in words:
        platforms = json.loads(w.platforms_json or '["all"]')
        if "all" not in platforms and platform not in platforms:
            continue
        if w.word in content:
            violations.append({
                "word": w.word,
                "type": w.category,
                "severity": w.severity,
                "position": content.find(w.word),
                "suggestion": f"建议删除或替换「{w.word}」",
            })
    return {
        "passed": len(violations) == 0,
        "total_words": len(violations),
        "violations": violations,
        "cleaned_content": content if violations else content,
    }


def list_forbidden_words(db: Session, platform: str | None, category: str | None, page: int, page_size: int) -> dict:
    q = select(ForbiddenWord)
    if category and category != "all":
        q = q.where(ForbiddenWord.category == category)
    rows = db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all()
    if platform:
        rows = [r for r in rows if platform in json.loads(r.platforms_json or "[]") or "all" in json.loads(r.platforms_json or "[]")]
    total = db.scalar(select(func.count()).select_from(ForbiddenWord)) or 0
    items = [
        {
            "word_id": r.word_id,
            "word": r.word,
            "category": r.category,
            "severity": r.severity,
            "platforms": json.loads(r.platforms_json or "[]"),
            "description": r.description,
        }
        for r in rows
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}
