"""Skill 注册表：进程内单例，启动时扫描 skills/。"""
from __future__ import annotations

import logging
from threading import Lock

from app.skills.loader import discover_skills
from app.skills.models import Skill

logger = logging.getLogger(__name__)


class SkillRegistry:
    def __init__(self) -> None:
        self._skills: dict[str, Skill] = {}
        self._lock = Lock()
        self._loaded = False

    def reload(self) -> list[Skill]:
        with self._lock:
            skills = discover_skills()
            self._skills = {s.slug: s for s in skills}
            self._loaded = True
            return list(self._skills.values())

    def ensure_loaded(self) -> None:
        if not self._loaded:
            self.reload()

    def list_skills(self) -> list[Skill]:
        self.ensure_loaded()
        return list(self._skills.values())

    def get(self, slug: str) -> Skill | None:
        self.ensure_loaded()
        return self._skills.get(slug)

    def match(self, text: str, *, limit: int = 3) -> list[Skill]:
        """根据用户/系统文本触发词匹配 skill。"""
        self.ensure_loaded()
        hay = (text or "").lower()
        scored: list[tuple[int, Skill]] = []
        for skill in self._skills.values():
            score = 0
            for t in skill.triggers:
                if t and t in hay:
                    score += 2 if len(t) >= 3 else 1
            if skill.slug.lower() in hay:
                score += 5
            if score:
                scored.append((score, skill))
        scored.sort(key=lambda x: -x[0])
        return [s for _, s in scored[:limit]]


_registry = SkillRegistry()


def get_skill_registry() -> SkillRegistry:
    return _registry
