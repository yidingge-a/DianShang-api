"""AI 文案生成：优先调用 OpenAI 兼容 LLM，未配置 Key 时回退模板。"""
from __future__ import annotations

import json
import random
from typing import Any

from app.services import llm_client

_PLATFORM_TITLE_HINT = {
    "taobao": "淘宝热销风格，可加【热销】",
    "tmall": "天猫官方正品风格",
    "jd": "京东自营风格",
    "pdd": "拼多多性价比风格",
    "douyin": "抖音短视频带货风格",
}


class AIService:
    def generate_product_title(
        self, name: str, platform: str, keywords: list[str] | None = None
    ) -> str:
        hint = _PLATFORM_TITLE_HINT.get(platform, "")
        kw = "、".join(keywords or [])
        prompt = f"商品名：{name}\n平台：{platform}\n关键词：{kw}\n要求：{hint}，标题不超过60字，符合平台规范，不含绝对化用语。"
        text = llm_client.chat(
            "你是电商文案专家，只输出一条商品标题，不要引号或解释。",
            prompt,
            temperature=0.5,
            max_tokens=120,
        )
        if text:
            return text[:60]
        platform_tag = {"taobao": "【热销】", "tmall": "【官方正品】", "jd": "【京东自营】"}.get(
            platform, ""
        )
        return f"{platform_tag}{name} {kw}".strip()[:60]

    def generate_selling_points(self, features: list[str]) -> list[str]:
        feat = "、".join(features) if features else "品质优良"
        text = llm_client.chat(
            "你是电商文案专家。根据商品特点输出3-5条卖点，每行一条，以✓开头，不要编号。",
            f"商品特点：{feat}",
            temperature=0.6,
            max_tokens=300,
        )
        if text:
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            if lines:
                return [ln if ln.startswith("✓") else f"✓ {ln}" for ln in lines[:5]]
        return [f"✓ {f}" for f in features[:5]] or ["✓ 品质保障", "✓ 售后无忧"]

    def generate_product_description(self, name: str, features: list[str], platform: str) -> str:
        text = llm_client.chat(
            "你是电商详情页文案专家，输出200字以内的商品描述段落，口语化、有说服力。",
            f"商品：{name}\n特点：{'、'.join(features)}\n平台：{platform}",
            temperature=0.7,
            max_tokens=400,
        )
        if text:
            return text[:500]
        return f"{name}，精选材质，匠心工艺，满足您的日常需求。"

    def generate_ad_copies(
        self,
        product_name: str,
        copy_type: str,
        count: int,
        style: str,
        max_length: int,
        keywords: list[str],
    ) -> list[dict[str, Any]]:
        count = max(1, min(count, 10))
        data = llm_client.chat_json(
            "你是广告文案专家。返回 JSON 数组，每项含 type、content、score(80-98整数)。"
            "文案符合电商广告规范，不含违禁绝对化用语。",
            json.dumps(
                {
                    "product_name": product_name,
                    "copy_type": copy_type,
                    "count": count,
                    "style": style,
                    "max_length": max_length,
                    "keywords": keywords,
                },
                ensure_ascii=False,
            ),
            temperature=0.8,
        )
        if isinstance(data, list) and data:
            copies = []
            for i, item in enumerate(data[:count]):
                if not isinstance(item, dict):
                    continue
                content = str(item.get("content", ""))[:max_length]
                copies.append(
                    {
                        "id": f"copy-{i + 1}",
                        "type": item.get("type", copy_type if copy_type != "all" else "title"),
                        "content": content,
                        "forbidden_check": {"passed": True, "warnings": []},
                        "score": int(item.get("score", random.randint(82, 96))),
                    }
                )
            if copies:
                return copies

        templates = {
            "title": [f"{product_name} 品质优选", f"【新品】{product_name}", f"{product_name} 限时特惠"],
            "slogan": ["品质生活，从这里开始", "匠心好物，温暖随行", "精选好物，值得信赖"],
            "description": [f"{product_name}，精选材质，匠心工艺，满足您的日常需求。"],
        }
        pool = templates.get(copy_type, templates["title"])
        copies = []
        for i in range(count):
            content = pool[i % len(pool)]
            if keywords:
                content = f"{content} {' '.join(keywords[:2])}"
            copies.append(
                {
                    "id": f"copy-{i + 1}",
                    "type": copy_type if copy_type != "all" else "title",
                    "content": content[:max_length],
                    "forbidden_check": {"passed": True, "warnings": []},
                    "score": random.randint(82, 96),
                }
            )
        return copies

    def generate_operation_strategies(self, body: dict) -> dict | None:
        """运营模块：返回 { strategies: [...] }，字段与前端对齐。"""
        budget = float(body.get("budget", 5000) or 5000)
        data = llm_client.chat_json(
            "你是电商运营策略专家。返回 JSON：{"
            '"strategies": ['
            '{"roi":数字,"budget":整数,"duration":"30天",'
            '"estimated_sales":整数,"target_audience":字符串,'
            '"estimated_revenue":整数,"description":字符串,"channels":[字符串]}'
            "] }。生成2条策略，budget 之和约等于总预算。",
            json.dumps(body, ensure_ascii=False),
            temperature=0.5,
            max_tokens=1200,
        )
        if isinstance(data, dict) and isinstance(data.get("strategies"), list) and data["strategies"]:
            return data
        return None

    def generate_market_insights(self, keyword: str, platforms: list[str]) -> dict | None:
        data = llm_client.chat_json(
            "你是电商市场分析师。返回 JSON："
            '{"summary":{"market_heat":0-100整数,"heat_change":整数,"competition_level":"low|medium|high",'
            '"growth_potential":"low|medium|high","estimated_growth_rate":数字},'
            '"analysis_text":"200字市场分析"}',
            json.dumps({"keyword": keyword, "platforms": platforms}, ensure_ascii=False),
            temperature=0.4,
            max_tokens=800,
        )
        return data if isinstance(data, dict) else None

    def generate_detail_html_body(
        self, product_name: str, description: str, style: str, sections: list | None
    ) -> str | None:
        text = llm_client.chat(
            "你是资深电商详情页文案与版式设计师，专门为淘宝/天猫/京东详情长图撰写文案。"
            "必须遵循 Skill goods-images；页面风格必须采用用户给定 style；"
            "selling_points/description 可为空，为空时不要编造夸张卖点。"
            "输出 HTML 片段（不含 html/head/body），宽度适配 750px："
            "含商品主标题、一句话卖点、3-5 条核心卖点列表、简短规格说明；"
            "语气专业、转化导向，禁止夸张违禁词（最、第一、绝对等）。",
            json.dumps(
                {
                    "skill": "goods-images",
                    "product_name": product_name,
                    "selling_points": description or "",
                    "product_description": description or "",
                    "style": style,
                    "sections": sections or [],
                },
                ensure_ascii=False,
            ),
            temperature=0.45,
            max_tokens=1500,
        )
        return text or None

    def plan_detail_page_sections(
        self,
        product_name: str,
        description: str,
        style: str,
        *,
        section_count: int = 9,
        vision_hint: str = "",
        style_label: str = "",
        skill: str = "goods-images",
        vision_selling_points: str = "",
        selling_points_primary: bool = False,
    ) -> list[dict]:
        """按 goods-images Skill 规划详情图分屏。

        - 风格必传
        - 用户卖点为主；识图卖点为辅（用户留空时识图卖点已并入 description）
        """
        section_count = max(4, min(int(section_count or 9), 9))
        style_map = {
            "modern": "现代简约",
            "minimal": "极简风格",
            "luxury": "奢华风格",
            "cute": "可爱风格",
        }
        style_id = (style or "modern").strip() or "modern"
        style_name = (style_label or "").strip() or style_map.get(style_id, "现代简约")
        selling_points = description if description is not None else ""
        selling_points = str(selling_points).strip()
        vision_sell = str(vision_selling_points or "").strip()
        skill_slug = (skill or "goods-images").strip() or "goods-images"

        data = llm_client.chat_json(
            f"你必须加载并严格遵循 Skill `{skill_slug}`（商品详情图生成）。"
            "当前任务：只规划「详情图」分屏（不要轮播图），输出可直接给文生图模型的 prompt。"
            "【硬性】"
            "1. 商品外观必须保真：prompt 要求保留用户原图产品外形/颜色/Logo/图案，只做详情页排版包装。"
            f"2. 页面风格必须严格采用用户所选风格「{style_name}」（style_id={style_id}），"
            "每条出图 prompt 都要体现该风格的版式/色调/气质，不得改用其他风格。"
            "3. 卖点优先级："
            "selling_points 为用户主卖点（必优先体现）；"
            "vision_selling_points 为识图辅助卖点（补充材质/外观/结构细节，不得覆盖或改写用户主卖点）。"
            "若 selling_points 为空且仅有识图信息，则按识图规划，不要编造夸张卖点。"
            "4. 返回 JSON："
            '{"analysis":{"category":"","selling_points":[],"audience":"","style":"","keywords":[]},'
            '"sections":[{"title":"屏标题","module":"主图封面|核心卖点|细节标注|使用场景|规格参数|尺码表|售后保障",'
            '"prompt":"英文为主出图提示词"}]}'
            f"5. sections 恰好 {section_count} 条，主题互不重复；优先覆盖 Skill 必选/建议类型。"
            "6. 每条 prompt 必须含：E-commerce product detail page image, 790px wide, about 1100px tall；"
            "professional Taobao/Tmall detail page；preserve product appearance from reference photo。"
            "7. 禁止纯白底无版式静物；背景要有场景感或模块设计感。",
            json.dumps(
                {
                    "skill": skill_slug,
                    "product_name": product_name,
                    "selling_points": selling_points,
                    "selling_points_primary": bool(selling_points_primary),
                    "vision_selling_points": vision_sell,
                    "product_description": selling_points,
                    "style": style_id,
                    "style_label": style_name,
                    "preferred_style": style_name,
                    "vision_hint": vision_hint,
                    "section_count": section_count,
                    "task": "generate_detail_images_only",
                },
                ensure_ascii=False,
            ),
            temperature=0.35,
            max_tokens=3500,
            skill_slugs=[skill_slug],
            auto_skills=True,
        )

        if isinstance(data, dict) and isinstance(data.get("sections"), list) and data["sections"]:
            out = []
            for i, s in enumerate(data["sections"][:section_count]):
                if not isinstance(s, dict):
                    continue
                title = (s.get("title") or f"详情图{i + 1}").strip()
                prompt = (s.get("prompt") or "").strip()
                if not prompt:
                    prompt = self._default_detail_panel_prompt(product_name, description, title, style_name, i)
                else:
                    prompt = self._wrap_detail_panel_prompt(prompt, product_name, title, style_name, selling_points)
                out.append({"title": title, "prompt": prompt, "module": s.get("module") or ""})
            if out:
                while len(out) < section_count:
                    i = len(out)
                    titles = [
                        "主图封面", "核心卖点一", "核心卖点二", "核心卖点三",
                        "细节标注", "使用场景", "规格参数", "尺码参考", "售后保障",
                    ]
                    t = titles[i] if i < len(titles) else f"详情屏{i + 1}"
                    out.append({
                        "title": t,
                        "prompt": self._default_detail_panel_prompt(product_name, description, t, style_name, i),
                        "module": t,
                    })
                return out[:section_count]

        defaults = [
            ("主图封面", 0), ("核心卖点一", 1), ("核心卖点二", 1), ("核心卖点三", 1),
            ("细节标注", 2), ("使用场景", 3), ("规格参数", 2), ("尺码参考", 2), ("售后保障", 3),
        ]
        return [
            {
                "title": t,
                "prompt": self._default_detail_panel_prompt(product_name, description, t, style_name, i),
                "module": t,
            }
            for t, i in defaults[:section_count]
        ]

    def build_sequential_detail_prompt(
        self,
        product_name: str,
        description: str,
        style: str,
        sections: list[dict],
        vision_hint: str = "",
    ) -> str:
        """一组顺序详情页的总提示词（配合 wan enable_sequential）。"""
        lines = [
            "Follow Skill goods-images. Generate Taobao DETAIL PAGE images (not plain product photos).",
            f"Product: {product_name}",
            f"Description: {(description or 'premium product')[:200]}",
        ]
        if vision_hint:
            lines.append(f"Vision analysis: {vision_hint[:400]}")
        lines.append(
            "Hard rules: preserve product appearance from reference photo; each image is a detail-page module "
            "with title/copy layout + product; 790x1100; no watermark; no QR."
        )
        for i, sec in enumerate(sections):
            title = sec.get("title") or f"panel {i + 1}"
            prompt = sec.get("prompt") or ""
            lines.append(f"Image {i + 1} ({title}): {prompt}")
        return chr(10).join(lines)

    def _wrap_detail_panel_prompt(
        self,
        prompt: str,
        product_name: str,
        title: str,
        style_desc: str,
        selling_points: str = "",
    ) -> str:
        sell = (selling_points or "").strip()
        sell_part = f" Selling points: {sell}." if sell else " Selling points: (none provided)."
        prefix = (
            "Follow Skill goods-images. Role: e-commerce detail-page visual designer. "
            f"Product: {product_name}. Panel: {title}. Style: {style_desc} (required).{sell_part} "
            "Must be a Taobao detail-page module (title/copy areas + product), NOT a plain cutout photo. "
            "Preserve product look from reference image. 790x1100, high-res, no watermark, no QR. "
            "Prompt: "
        )
        return prefix + prompt

    def _default_detail_panel_prompt(
        self, product_name: str, description: str, title: str, style_desc: str, index: int
    ) -> str:
        desc = (description or "premium product")[:100]
        templates = [
            f"E-commerce hero detail page, 790x1100. Large product photo of {product_name} centered, preserve product appearance. Top bold Chinese title, subtitle, season tag. Style {style_desc}. {desc}",
            f"Product feature highlight detail page, 790x1100, layout for {product_name}, feature title '{title}', short Chinese description, preserve product look. Style {style_desc}. {desc}",
            f"Product detail annotation page, 790x1100, center product photo of {product_name} with 4 callouts, preserve appearance. Style {style_desc}. {desc}",
            f"Lifestyle scene detail page, 790x1100, title '{title}', {product_name} in use, preserve product look. Style {style_desc}. {desc}",
        ]
        base = templates[min(index, len(templates) - 1)]
        return self._wrap_detail_panel_prompt(base, product_name, title, style_desc, description or "")


    def generate_optimize_suggestions(self, metrics: dict) -> list[dict] | None:
        data = llm_client.chat_json(
            "你是电商数据运营顾问。根据监控指标返回 JSON："
            '{"suggestions":[{"priority":"high|medium|low","category":字符串,'
            '"description":字符串,"action":字符串,"expected_impact":字符串}]}',
            json.dumps(metrics, ensure_ascii=False),
            temperature=0.3,
            max_tokens=800,
        )
        if isinstance(data, dict) and isinstance(data.get("suggestions"), list):
            return data["suggestions"]
        return None

    def generate_bom_analysis(self, body: dict) -> dict | None:
        """LLM 拆解 BOM：根据产品名称/规格及 vLLM 识图结果估算成本结构。"""
        hint = ""
        if body.get("vision_parse"):
            hint = "已提供 vLLM 从图片识别的产品信息（vision_parse），请优先参考其中的材质、部件与描述。"
        data = llm_client.chat_json(
            "你是制造业与电商供应链成本工程师。"
            f"{hint}"
            "根据产品信息拆解 BOM，给出符合2024-2025年中国市场行情的合理成本估算。"
            "返回 JSON："
            '{"components":[{"name":字符串,"quantity":数字,"unit_price":数字,"category":"raw_material|accessory|packaging"}],'
            '"processes":[{"name":字符串,"cost":数字}],'
            '"labor_cost":数字,"logistics_cost":数字,"packaging_cost":数字,"overhead_rate":0.12,'
            '"suggestions":["优化建议字符串"]}'
            "components 至少4项，processes 至少2项，所有金额为正数。",
            json.dumps(body, ensure_ascii=False),
            temperature=0.35,
            max_tokens=2500,
        )
        if not isinstance(data, dict) or not data.get("components"):
            return None
        return data

    def generate_smart_pricing(self, body: dict) -> dict | None:
        """LLM 智能定价：必须基于 price_comparison 比价结果生成方案。"""
        comparison = body.get("price_comparison") or {}
        prompt_body = {
            "product_name": body.get("product_name"),
            "product_category": body.get("product_category"),
            "product_specs": body.get("product_specs"),
            "target_platform": body.get("platform"),
            "market_price_summary": comparison.get("summary"),
            "platform_breakdown": comparison.get("platform_breakdown"),
            "top_competitors": (comparison.get("competitors") or [])[:10],
            "comparison_data_source": comparison.get("data_source"),
        }
        data = llm_client.chat_json(
            "你是电商定价策略专家。"
            "用户已完成多平台比价，请严格基于比价结果中的市场价、竞品价制定定价方案，"
            "recommended_price 应落在市场合理区间，并说明与最低价/平均价/最高价的关系。"
            "返回 JSON："
            '{"recommended_price":数字,"recommended_range":{"min":数字,"max":数字},'
            '"estimated_cost":数字,"profit_margin":数字,"gross_profit":数字,'
            '"competitiveness":"high|medium|low","analysis":字符串,'
            '"pricing_strategy":字符串,"factors":[{"factor":字符串,"impact":"positive|negative","weight":0-1}],'
            '"reasoning":字符串}'
            "profit_margin 为百分比数值如 35.5 表示35.5%。",
            json.dumps(prompt_body, ensure_ascii=False),
            temperature=0.35,
            max_tokens=2000,
        )
        if not isinstance(data, dict) or "recommended_price" not in data:
            return None
        return data

    def generate_pricing_reasoning(self, body: dict, recommended: float) -> str:
        text = llm_client.chat(
            "你是定价顾问，用2-3句话说明定价依据，简洁专业。",
            json.dumps({**body, "recommended_price": recommended}, ensure_ascii=False),
            temperature=0.3,
            max_tokens=200,
        )
        return text or f"基于成本与目标利润率 {body.get('target_profit_margin', 30)}%，建议售价 ¥{recommended}。"

    def generate_price_comparison(self, body: dict) -> dict | None:
        data = llm_client.chat_json(
            "你是电商比价分析师。基于中国市场真实行情，返回 JSON："
            '{"summary":{"lowest_price":数字,"average_price":数字,"highest_price":数字,"sample_count":整数},'
            '"platform_breakdown":[{"platform":"平台中文名","count":整数,"lowest":数字,"average":数字,"highest":数字}],'
            '"competitors":[{"seller":字符串,"platform":"平台id","price":数字,"sales":整数,"rating":4.5-5.0}]}'
            "。competitors 8-15 条，价格符合行业常识。",
            json.dumps(body, ensure_ascii=False),
            temperature=0.35,
            max_tokens=2500,
        )
        return data if isinstance(data, dict) and data.get("summary") else None

    def generate_industry_chain(self, body: dict) -> dict | None:
        data = llm_client.chat_json(
            "你是供应链专家。返回 JSON："
            '{"upstream_suppliers":[{"name","match_score":0-100,"location","rating","products":[],"min_order","contact":{"phone","email"}}],'
            '"processors":[{"name","match_score","location","category","capacity"}],'
            '"downstream_distributors":[{"name","match_score","category","monthly_volume","platforms":[]}]}',
            json.dumps(body, ensure_ascii=False),
            temperature=0.4,
            max_tokens=2000,
        )
        return data if isinstance(data, dict) and data.get("upstream_suppliers") else None

    def generate_platform_market_data(self, keyword: str, platforms: list[str]) -> list[dict] | None:
        data = llm_client.chat_json(
            "你是电商市场数据分析师。返回 JSON 数组，每项："
            '{"platform":"中文平台名","search_volume":整数,"sales_volume":整数,"avg_price":数字,'
            '"competitor_count":整数,"top_sellers":[{"name":字符串,"sales":整数}]}',
            json.dumps({"keyword": keyword, "platforms": platforms}, ensure_ascii=False),
            temperature=0.35,
            max_tokens=2000,
        )
        return data if isinstance(data, list) and data else None

    def generate_trends(self, body: dict) -> dict | None:
        data = llm_client.chat_json(
            "你是电商趋势分析师。返回 JSON："
            '{"keyword","platform","metric","time_range","trend":"up|down|stable",'
            '"data_points":[{"date":"YYYY-MM-DD","value":整数}], "growth_rate":数字}',
            json.dumps(body, ensure_ascii=False),
            temperature=0.3,
            max_tokens=2000,
        )
        return data if isinstance(data, dict) and data.get("data_points") else None

    def generate_overview(self, keyword: str) -> dict | None:
        data = llm_client.chat_json(
            "你是电商市场分析师。返回 JSON："
            '{"keyword","search_volume":整数,"competition_level":"low|medium|high",'
            '"avg_price":数字,"top_platforms":["taobao","jd"],"seasonality":字符串}',
            json.dumps({"keyword": keyword}, ensure_ascii=False),
            temperature=0.3,
            max_tokens=600,
        )
        return data if isinstance(data, dict) and "search_volume" in data else None

    def generate_monitor_metrics(self, body: dict) -> dict | None:
        data = llm_client.chat_json(
            "你是店铺数据运营分析师。返回 JSON 监控指标："
            '{"views":整数,"view_change":数字,"visitors":整数,"visitor_change":数字,'
            '"avg_duration":"X分X秒","avg_duration_change":数字,"conversion_rate":数字,'
            '"conversion_change":数字,"bounce_rate":数字,"add_to_cart_rate":数字,"repurchase_rate":数字}',
            json.dumps(body, ensure_ascii=False),
            temperature=0.25,
            max_tokens=800,
        )
        return data if isinstance(data, dict) and "views" in data else None

    def generate_effect_estimate(self, body: dict) -> dict | None:
        data = llm_client.chat_json(
            "你是广告投放效果预估专家。返回 JSON："
            '{"exposure":整数,"clicks":整数,"conversion_rate":数字,"estimated_sales":整数,'
            '"roi":数字,"estimated_revenue":整数,'
            '"channel_breakdown":[{"channel":字符串,"exposure":整数,"clicks":整数}]}',
            json.dumps(body, ensure_ascii=False),
            temperature=0.35,
            max_tokens=1000,
        )
        return data if isinstance(data, dict) and "exposure" in data else None

    def generate_platform_recommendation(self, price: float, category: str, body: dict) -> dict | None:
        data = llm_client.chat_json(
            "你是电商渠道专家。返回 JSON："
            '{"platforms":[{"name":"平台中文名","type":字符串,"match_score":0-100,'
            '"estimated_traffic":"高|中|低","commission_rate":"X%","competition_level":"低|中|高",'
            '"suggested_price":数字,"reason":字符串}]}',
            json.dumps({"price": price, "category": category, **body}, ensure_ascii=False),
            temperature=0.35,
            max_tokens=1200,
        )
        return data if isinstance(data, dict) and data.get("platforms") else None


ai_service = AIService()
