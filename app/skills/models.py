"""Skill 领域模型。"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Skill:
    """一个可被大模型加载的 Skill 包。"""

    slug: str
    name: str
    description: str
    version: str = "0.0.0"
    body_markdown: str = ""
    card_markdown: str = ""
    meta: dict = field(default_factory=dict)
    path: Path | None = None
    triggers: list[str] = field(default_factory=list)

    def to_prompt_block(self, *, max_chars: int = 12000) -> str:
        """注入 system prompt 的文本块。"""
        body = self.body_markdown.strip()
        if len(body) > max_chars:
            body = body[: max_chars - 20] + "\n\n…(skill 正文已截断)…"
        header = (
            f"### Skill `{self.slug}` (v{self.version})\n"
            f"名称：{self.name}\n"
            f"适用：{self.description}\n"
        )
        return f"{header}\n-----\n{body}\n-----"
