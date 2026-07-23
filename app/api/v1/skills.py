"""Skill 管理 API：列出已加载的项目 Skill。"""
from fastapi import APIRouter

from app.core.response import ok
from app.skills import get_skill_registry

router = APIRouter()


@router.get("")
def list_skills():
    skills = get_skill_registry().list_skills()
    return ok(
        [
            {
                "slug": s.slug,
                "name": s.name,
                "description": s.description,
                "version": s.version,
                "triggers": s.triggers[:20],
            }
            for s in skills
        ]
    )


@router.get("/{slug}")
def get_skill(slug: str):
    skill = get_skill_registry().get(slug)
    if not skill:
        from app.core.exceptions import AppException

        raise AppException(f"Skill 不存在: {slug}", 404)
    return ok(
        {
            "slug": skill.slug,
            "name": skill.name,
            "description": skill.description,
            "version": skill.version,
            "triggers": skill.triggers,
            "card_markdown": skill.card_markdown,
            "body_preview": skill.body_markdown[:2000],
        }
    )


@router.post("/reload")
def reload_skills():
    skills = get_skill_registry().reload()
    return ok({"reloaded": len(skills), "slugs": [s.slug for s in skills]})
