"""Skill 子系统：加载、注册、注入大模型。"""
from app.skills.context import enrich_system_prompt, resolve_skills
from app.skills.loader import discover_skills, load_skill_dir
from app.skills.models import Skill
from app.skills.registry import SkillRegistry, get_skill_registry

__all__ = [
    "Skill",
    "SkillRegistry",
    "discover_skills",
    "load_skill_dir",
    "get_skill_registry",
    "enrich_system_prompt",
    "resolve_skills",
]
