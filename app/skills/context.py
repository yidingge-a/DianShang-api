"""把 Skill 注入大模型 system prompt。"""
from __future__ import annotations

from app.skills.models import Skill
from app.skills.registry import get_skill_registry


SKILL_PREAMBLE = (
    "【Skill 工具箱】以下是本系统已加载的专业 Skill。"
    "当你的任务与某个 Skill 匹配时，必须严格遵循该 Skill 的角色、流程、输出规范与质量要求执行；"
    "不要忽略 Skill 中的硬性规则（例如商品保真、逐张出图、传入原图等）。\n"
)


def resolve_skills(
    *,
    user_text: str = "",
    system_text: str = "",
    skill_slugs: list[str] | None = None,
    auto_match: bool = True,
) -> list[Skill]:
    reg = get_skill_registry()
    selected: list[Skill] = []
    seen: set[str] = set()

    for slug in skill_slugs or []:
        skill = reg.get(slug)
        if skill and skill.slug not in seen:
            selected.append(skill)
            seen.add(skill.slug)

    if auto_match:
        for skill in reg.match(f"{system_text}\n{user_text}"):
            if skill.slug not in seen:
                selected.append(skill)
                seen.add(skill.slug)

    return selected


def enrich_system_prompt(
    system: str,
    user: str = "",
    *,
    skill_slugs: list[str] | None = None,
    auto_match: bool = True,
    max_chars_per_skill: int = 12000,
) -> str:
    """在原 system 前注入匹配到的 Skill 正文。"""
    skills = resolve_skills(
        user_text=user,
        system_text=system,
        skill_slugs=skill_slugs,
        auto_match=auto_match,
    )
    if not skills:
        return system

    blocks = [SKILL_PREAMBLE]
    for skill in skills:
        blocks.append(skill.to_prompt_block(max_chars=max_chars_per_skill))
    blocks.append("【原任务指令】\n" + (system or ""))
    return "\n\n".join(blocks)
