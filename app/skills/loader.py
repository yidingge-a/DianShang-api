"""从项目 skills/ 目录加载 Skill 包。"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from app.config import PROJECT_ROOT
from app.skills.models import Skill

logger = logging.getLogger(__name__)

DEFAULT_SKILLS_DIR = PROJECT_ROOT / "skills"


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """解析 SKILL.md 顶部 YAML frontmatter。"""
    text = text.lstrip("\ufeff")
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta_raw, body = parts[1], parts[2]
    meta: dict = {}
    for line in meta_raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta, body.lstrip("\n")


def _extract_triggers(description: str, body: str) -> list[str]:
    triggers: list[str] = []
    # 中文短语
    for chunk in re.findall(r"[\u4e00-\u9fff]{2,12}", description or ""):
        triggers.append(chunk.lower())
    # 英文关键词：仅保留较长、业务相关的词，避免 the/use/when 等泛词污染匹配
    stop = {
        "use", "when", "the", "user", "wants", "to", "for", "or", "and", "like",
        "with", "from", "this", "that", "will", "must", "should", "have", "has",
        "are", "is", "of", "in", "on", "a", "an", "as", "by", "be", "can",
    }
    for chunk in re.findall(r"[A-Za-z][\w-]{3,24}", description or ""):
        low = chunk.lower()
        if low not in stop:
            triggers.append(low)
    for kw in (
        "详情图", "详情页", "商品图", "产品图", "电商图", "淘宝图", "轮播图", "主图",
        "detail", "carousel", "goods-images",
    ):
        if kw.lower() in (description + body).lower():
            triggers.append(kw.lower())
    seen = set()
    out = []
    for t in triggers:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


def load_skill_dir(skill_dir: Path) -> Skill | None:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        return None

    front, body = _parse_frontmatter(skill_md.read_text(encoding="utf-8"))
    meta: dict = {}
    meta_path = skill_dir / "_meta.json"
    if meta_path.is_file():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            logger.warning("Skill meta 无效 %s: %s", meta_path, exc)

    card = ""
    card_path = skill_dir / "skill-card.md"
    if card_path.is_file():
        card = card_path.read_text(encoding="utf-8")

    slug = (meta.get("slug") or front.get("name") or skill_dir.name).strip()
    name = front.get("name") or slug
    description = front.get("description") or ""
    version = str(meta.get("version") or "1.0.0")

    return Skill(
        slug=slug,
        name=name,
        description=description,
        version=version,
        body_markdown=body,
        card_markdown=card,
        meta=meta,
        path=skill_dir,
        triggers=_extract_triggers(description, body),
    )


def discover_skills(skills_dir: Path | None = None) -> list[Skill]:
    root = skills_dir or DEFAULT_SKILLS_DIR
    if not root.is_dir():
        logger.info("Skills 目录不存在: %s", root)
        return []

    skills: list[Skill] = []
    for child in sorted(root.iterdir()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        skill = load_skill_dir(child)
        if skill:
            skills.append(skill)
            logger.info("已加载 skill: %s v%s", skill.slug, skill.version)
    return skills
