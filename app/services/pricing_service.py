"""定价成本模块：BOM 拆解与智能定价均由 LLM 驱动，用户只需提供产品描述。"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.product import Product
from app.models.user import User
from app.services import ecommerce_intel_service
from app.services.llm_client import is_llm_configured
from app.services.ai_service import ai_service
from app.services.upload_service import get_user_file
from app.services.vision_client import is_vision_configured, parse_product_image_for_bom
from app.utils import utc_now_iso


def _product_input(body: dict) -> dict:
    vision = body.get("vision_parse") or {}
    name = (
        body.get("product_name")
        or body.get("name")
        or body.get("query")
        or vision.get("product_name")
        or ""
    ).strip()
    if not name:
        raise AppException("请提供产品名称，或上传产品图片由 vLLM 识别", 400)
    category = (
        body.get("product_category") or body.get("category") or vision.get("product_category") or ""
    ).strip()
    specs = (
        body.get("product_specs") or body.get("specs") or body.get("description") or ""
    ).strip()
    if vision:
        spec_parts = [specs]
        if vision.get("product_specs"):
            spec_parts.append(str(vision["product_specs"]))
        if vision.get("description"):
            spec_parts.append(str(vision["description"]))
        materials = vision.get("visible_materials") or []
        if materials:
            spec_parts.append("可见材质：" + "、".join(str(m) for m in materials))
        components = vision.get("visible_components") or []
        if components:
            spec_parts.append("可见部件：" + "、".join(str(c) for c in components))
        if vision.get("brand_or_model"):
            spec_parts.append(f"品牌/型号：{vision['brand_or_model']}")
        specs = "\n".join(p.strip() for p in spec_parts if p and str(p).strip())

    return {
        "product_name": name,
        "product_category": category,
        "product_specs": specs,
    }


def _pct(part: float, total: float) -> float:
    return round(part / total * 100, 1) if total else 0.0


def _compute_bom_totals(structure: dict) -> dict:
    """将 LLM 返回的 BOM 结构汇总为前端 cost_breakdown。"""
    components = structure.get("components") or []
    processes = structure.get("processes") or []

    raw_items = []
    raw_total = 0.0
    for c in components:
        qty = float(c.get("quantity", 1) or 1)
        unit = float(c.get("unit_price", 0) or 0)
        cost = round(qty * unit, 2)
        raw_total += cost
        raw_items.append({
            "name": c.get("name", ""),
            "cost": cost,
            "percentage": 0,
            "quantity": qty,
            "unit_price": unit,
            "category": c.get("category", "raw_material"),
        })

    process_items = []
    process_total = 0.0
    for p in processes:
        cost = round(float(p.get("cost", 0) or 0), 2)
        process_total += cost
        process_items.append({"name": p.get("name", ""), "cost": cost, "percentage": 0})

    labor = round(float(structure.get("labor_cost", 0) or 0), 2)
    logistics = round(float(structure.get("logistics_cost", 0) or 0), 2)
    packaging = round(float(structure.get("packaging_cost", 0) or 0), 2)
    overhead_rate = float(structure.get("overhead_rate", 0.15) or 0.15)
    overhead_rate = min(max(overhead_rate, 0.05), 0.35)

    subtotal = raw_total + process_total + labor + logistics + packaging
    overhead = round(subtotal * overhead_rate, 2)
    total_cost = round(subtotal + overhead, 2)

    breakdown = {
        "raw_materials": {"total": round(raw_total, 2), "percentage": 0, "items": raw_items},
        "processes": {"total": round(process_total, 2), "percentage": 0, "items": process_items},
        "labor": {"total": labor, "percentage": 0, "items": []},
        "logistics": {"total": logistics, "percentage": 0, "items": []},
        "packaging": {"total": packaging, "percentage": 0, "items": []},
        "overhead": {"total": overhead, "percentage": 0, "items": []},
    }
    for key, block in breakdown.items():
        block["percentage"] = _pct(block["total"], total_cost)
        for item in block.get("items", []):
            item["percentage"] = _pct(item["cost"], total_cost)

    suggestions = structure.get("suggestions") or []
    if not suggestions:
        suggestions = ["建议结合供应商报价进一步校准 AI 估算成本"]

    return {
        "total_cost": total_cost,
        "cost_breakdown": breakdown,
        "suggestions": suggestions,
        "components": components,
        "processes": processes,
        "labor_cost": labor,
        "logistics_cost": logistics,
        "packaging_cost": packaging,
        "overhead_rate": overhead_rate,
    }


def _require_llm() -> None:
    if not is_llm_configured():
        raise AppException("请先配置 OPENAI_API_KEY 后使用 AI 成本拆解与智能定价", 503)


def price_comparison(body: dict) -> dict:
    """全网比价（LLM 驱动）。"""
    _require_llm()
    query = (body.get("query") or body.get("product_name") or body.get("keyword") or "").strip()
    if not query:
        raise AppException("请提供比价关键词或产品名称", 400)
    compare_body = {
        "query": query,
        "platforms": body.get("platforms") or ["taobao", "jd", "pdd"],
        "price_range": body.get("price_range"),
    }
    return ecommerce_intel_service.price_comparison(compare_body)


def _run_price_comparison_for_product(body: dict, product: dict) -> dict:
    """为定价流程执行 LLM 比价（步骤一）。"""
    if body.get("compare_result"):
        return body["compare_result"]
    if body.get("price_comparison"):
        return body["price_comparison"]

    platforms = body.get("platforms") or []
    platform = body.get("platform", "taobao")
    if platform and platform not in platforms:
        platforms = [platform, *platforms]
    if not platforms:
        platforms = ["taobao", "jd", "pdd"]

    return price_comparison({
        "query": product["product_name"],
        "platforms": platforms,
        "product_category": product.get("product_category"),
        "product_specs": product.get("product_specs"),
    })


def _normalize_pricing(data: dict, body: dict) -> dict:
    recommended = round(float(data.get("recommended_price", 0) or 0), 2)
    cost = round(float(data.get("estimated_cost", 0) or 0), 2)
    margin = float(data.get("profit_margin", 0) or 0)
    if 0 < margin <= 1:
        margin = round(margin * 100, 1)
    else:
        margin = round(margin, 1)

    rng = data.get("recommended_range") or {}
    min_p = round(float(rng.get("min", recommended * 0.9) or recommended * 0.9), 2)
    max_p = round(float(rng.get("max", recommended * 1.1) or recommended * 1.1), 2)
    gross = data.get("gross_profit")
    if gross is None and cost > 0:
        gross = round(recommended - cost, 2)
    else:
        gross = round(float(gross or 0), 2)

    competitiveness = data.get("competitiveness", "medium")
    if competitiveness not in ("high", "medium", "low"):
        competitiveness = "medium"

    factors = data.get("factors") or []
    if not isinstance(factors, list):
        factors = []

    analysis = data.get("analysis") or data.get("reasoning") or ""
    strategy = data.get("pricing_strategy") or data.get("price_strategy") or "AI智能定价"

    return {
        "recommended_price": recommended,
        "recommended_range": {"min": min_p, "max": max_p},
        "estimated_cost": cost,
        "profit_margin": margin,
        "gross_profit": gross,
        "competitiveness": competitiveness,
        "analysis": analysis,
        "pricing_strategy": strategy,
        "factors": factors,
        "reasoning": data.get("reasoning") or analysis,
        "platform": body.get("platform", "taobao"),
        "product_name": body.get("product_name", ""),
        "data_source": "llm",
        "price_comparison": body.get("price_comparison"),
        # 兼容旧字段
        "min_price": min_p,
        "max_price": max_p,
        "price_strategy": strategy,
    }


def price_recommendation(body: dict) -> dict:
    """智能定价：必须先完成平台比价，再基于比价结果生成定价方案。"""
    _require_llm()
    product = _product_input(body)

    compare_result = _run_price_comparison_for_product(body, product)
    if not compare_result.get("summary"):
        raise AppException("比价数据无效，请重新执行全网比价", 400)

    llm_body = {
        **product,
        "platform": body.get("platform", "taobao"),
        "price_comparison": compare_result,
    }

    data = ai_service.generate_smart_pricing(llm_body)
    if not data:
        raise AppException("AI 智能定价失败，请稍后重试", 502)

    result = _normalize_pricing(
        data,
        {**product, "platform": llm_body["platform"], "price_comparison": compare_result},
    )
    result["price_comparison"] = compare_result
    return result


def parse_bom_image(db: Session, user: User, image_id: str) -> dict:
    """使用 vLLM 解析产品图片，返回结构化文字信息供前端展示与 BOM 拆解。"""
    if not is_vision_configured():
        raise AppException(
            "请先在 .env 配置 VISION_API_BASE、VISION_MODEL（及 VISION_API_KEY）以启用 vLLM 识图",
            503,
        )
    record = get_user_file(db, user.user_id, image_id)
    path = Path(record.file_path)
    if not path.is_file():
        raise AppException("图片文件不存在", 404)

    parsed = parse_product_image_for_bom(path)
    if not parsed:
        raise AppException("vLLM 图片解析失败，请检查视觉模型服务是否可用", 502)

    return {
        "image_id": image_id,
        "file_url": record.file_url,
        "file_name": record.file_name,
        "vision_parse": parsed,
    }


def analyze_bom(db: Session, user: User, body: dict) -> dict:
    """BOM 成本拆解：支持 vLLM 识图 + LLM 拆解 BOM。"""
    _require_llm()

    image_id = (body.get("image_id") or "").strip()
    vision_parse = body.get("vision_parse")

    if image_id and not vision_parse:
        vision_parse = parse_bom_image(db, user, image_id)["vision_parse"]
        body = {**body, "vision_parse": vision_parse, "image_id": image_id}

    product = _product_input(body)
    llm_body = {**product}
    if vision_parse:
        llm_body["vision_parse"] = vision_parse
    if image_id:
        llm_body["image_id"] = image_id

    structure = ai_service.generate_bom_analysis(llm_body)
    if not structure:
        raise AppException("AI 成本拆解失败，请稍后重试", 502)

    result = _compute_bom_totals(structure)
    result.update(product)
    result["bom_detail"] = structure
    result["data_source"] = "llm"
    if vision_parse:
        result["vision_parse"] = vision_parse
    if image_id:
        result["image_id"] = image_id
    return result


def save_bom_product(db: Session, user: User, body: dict) -> dict:
    product_info = _product_input(body)
    if body.get("total_cost") is not None and body.get("cost_breakdown"):
        result = {
            "total_cost": body["total_cost"],
            "cost_breakdown": body["cost_breakdown"],
            "suggestions": body.get("suggestions", []),
            "bom_detail": body.get("bom_detail") or body,
        }
    else:
        result = analyze_bom(db, user, body)

    product = Product(
        user_id=user.user_id,
        name=product_info["product_name"],
        category=product_info["product_category"] or "未分类",
        cost=result["total_cost"],
        price=body.get("suggested_price", 0),
        status="draft",
    )
    product.specs = {**product_info, **result}
    db.add(product)
    db.commit()
    return {"id": product.product_id, "product_id": product.product_id, "created_at": utc_now_iso()}


def get_bom_report(db: Session, user: User, product_id: str) -> dict:
    product = db.get(Product, product_id)
    if not product or product.user_id != user.user_id:
        raise AppException("产品不存在", 404)
    return {
        "product_id": product.product_id,
        "name": product.name,
        "cost": product.cost,
        "price": product.price,
        "margin": round((product.price - product.cost) / product.price, 4) if product.price else 0,
        "bom_detail": product.specs,
    }


def list_bom_products(db: Session, user: User, page: int, page_size: int) -> dict:
    base = Product.user_id == user.user_id
    total = db.scalar(select(func.count()).select_from(Product).where(base)) or 0
    rows = db.scalars(
        select(Product).where(base).offset((page - 1) * page_size).limit(page_size)
    ).all()
    items = [{"product_id": p.product_id, "name": p.name, "cost": p.cost, "price": p.price} for p in rows]
    return {"items": items, "total": total, "page": page, "page_size": page_size}
