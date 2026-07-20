"""电商情报编排：外部数据 API 优先，否则 LLM 市场分析（比价必须走 LLM，无公式兜底）。"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.core.exceptions import AppException
from app.services import ecommerce_data_client
from app.services.ai_service import ai_service
from app.services.llm_client import is_llm_configured

_PLATFORM_LABELS = {
    "taobao": "淘宝",
    "tmall": "天猫",
    "jd": "京东",
    "pdd": "拼多多",
    "douyin": "抖音",
    "amazon": "Amazon",
    "ebay": "eBay",
}


def _label(pid: str) -> str:
    return _PLATFORM_LABELS.get(pid, pid)


def price_comparison(body: dict) -> dict:
    """全网比价：第三方数据 API 或 LLM；配置 Key 后必须 LLM 成功，不再使用公式估算。"""
    external = ecommerce_data_client.fetch("price-comparison", body)
    if external:
        external["data_source"] = "ecommerce_data_api"
        return external

    if not is_llm_configured():
        raise AppException("请先配置 OPENAI_API_KEY 后使用 AI 全网比价", 503)

    llm = ai_service.generate_price_comparison(body)
    if llm:
        llm["data_source"] = "llm_market_intelligence"
        return llm

    raise AppException("AI 全网比价失败，请稍后重试", 502)


def _price_comparison_fallback(body: dict) -> dict:
    """无 LLM 时的结构化估算（非纯随机，基于价格区间公式）。"""
    query = body.get("query") or body.get("keyword", "")
    platforms = body.get("platforms", ["taobao", "jd", "pdd"])
    price_range = body.get("price_range") or {}
    lo = float(price_range.get("min", 50))
    hi = float(price_range.get("max", 150))
    base = (lo + hi) / 2 if hi > lo else 89.0

    platform_breakdown = []
    competitors = []
    all_prices: list[float] = []

    for i, pid in enumerate(platforms):
        label = _label(pid)
        factor = 0.92 + (i % 3) * 0.05
        prices = [round(base * factor * (0.95 + j * 0.02), 2) for j in range(5)]
        all_prices.extend(prices)
        platform_breakdown.append({
            "platform": label,
            "count": len(prices),
            "lowest": min(prices),
            "average": round(sum(prices) / len(prices), 2),
            "highest": max(prices),
        })
        for j, price in enumerate(prices[:3]):
            competitors.append({
                "seller": f"{label}优选店{j + 1}",
                "platform": pid,
                "price": price,
                "sales": 1000 + j * 500,
                "rating": 4.8,
            })

    return {
        "summary": {
            "lowest_price": round(min(all_prices), 2),
            "average_price": round(sum(all_prices) / len(all_prices), 2),
            "highest_price": round(max(all_prices), 2),
            "sample_count": len(all_prices),
        },
        "platform_breakdown": platform_breakdown,
        "competitors": competitors,
        "data_source": "structured_estimate",
        "query": query,
    }


def industry_chain_match(body: dict) -> dict:
    external = ecommerce_data_client.fetch("industry-chain/match", body)
    if external:
        external["data_source"] = "ecommerce_data_api"
        return external

    llm = ai_service.generate_industry_chain(body)
    if llm:
        llm["data_source"] = "llm_market_intelligence"
        return llm

    category = body.get("product_category") or body.get("keyword", "产品")
    location = body.get("location", "浙江")
    return {
        "upstream_suppliers": [
            {
                "name": f"{category}核心原料供应商",
                "match_score": 90,
                "location": location,
                "rating": 4.7,
                "products": [f"{category}原料"],
                "min_order": "500件",
                "contact": {"phone": "", "email": ""},
            }
        ],
        "processors": [{"name": f"{category}OEM工厂", "match_score": 86, "location": "广东", "category": "加工", "capacity": "月产5万件"}],
        "downstream_distributors": [{"name": f"{category}渠道商", "match_score": 84, "category": "分销", "monthly_volume": "3000件", "platforms": ["淘宝", "京东"]}],
        "data_source": "structured_estimate",
    }


def market_platform_data(keyword: str, platforms: list[str]) -> list[dict]:
    external = ecommerce_data_client.fetch(
        "market/platform-data",
        {"keyword": keyword, "platforms": platforms},
    )
    if isinstance(external, list) and external:
        return external

    llm = ai_service.generate_platform_market_data(keyword, platforms)
    if llm:
        return llm

    result = []
    for pid in platforms:
        label = _label(pid)
        result.append({
            "platform": label,
            "search_volume": 80000,
            "sales_volume": 45000,
            "avg_price": 99.0,
            "competitor_count": 2500,
            "top_sellers": [{"name": f"{label}头部店铺", "sales": 35000}],
        })
    return result


def get_trends(keyword: str, platform: str, metric: str, time_range: str) -> dict:
    body = {"keyword": keyword, "platform": platform, "metric": metric, "time_range": time_range}
    external = ecommerce_data_client.fetch("market/trends", body)
    if external:
        external["data_source"] = "ecommerce_data_api"
        return external

    llm = ai_service.generate_trends(body)
    if llm:
        llm["data_source"] = "llm_market_intelligence"
        return llm

    days = {"7d": 7, "30d": 30, "90d": 90}.get(time_range, 30)
    today = datetime.now(timezone.utc).date()
    data_points = []
    base = 3000
    for i in range(min(days, 28)):
        d = today - timedelta(days=min(days, 28) - i)
        data_points.append({"date": d.isoformat(), "value": base + i * 80})
    return {
        "keyword": keyword,
        "platform": platform,
        "metric": metric,
        "time_range": time_range,
        "trend": "up",
        "data_points": data_points,
        "growth_rate": 12.5,
        "data_source": "structured_estimate",
    }


def get_overview(keyword: str) -> dict:
    external = ecommerce_data_client.fetch("market/overview", {"keyword": keyword})
    if external:
        external["data_source"] = "ecommerce_data_api"
        return external

    llm = ai_service.generate_overview(keyword)
    if llm:
        llm["data_source"] = "llm_market_intelligence"
        return llm

    return {
        "keyword": keyword,
        "search_volume": 50000,
        "competition_level": "medium",
        "avg_price": 89.0,
        "top_platforms": ["taobao", "jd", "pdd"],
        "seasonality": "全年平稳，大促节点走高",
        "data_source": "structured_estimate",
    }


def monitor_metrics(monitor_name: str, time_range: str, product_hint: str = "") -> dict:
    body = {"name": monitor_name, "time_range": time_range, "product": product_hint}
    external = ecommerce_data_client.fetch("operation/monitor-data", body)
    if external:
        external["data_source"] = "ecommerce_data_api"
        return external

    llm = ai_service.generate_monitor_metrics(body)
    if llm:
        llm["data_source"] = "llm_market_intelligence"
        llm["time_range"] = time_range
        return llm

    return {
        "views": 4200,
        "view_change": 8.5,
        "visitors": 1100,
        "visitor_change": 6.2,
        "avg_duration": "2分40秒",
        "avg_duration_change": 10.0,
        "conversion_rate": 2.9,
        "conversion_change": 0.3,
        "bounce_rate": 44.0,
        "add_to_cart_rate": 7.5,
        "repurchase_rate": 11.0,
        "time_range": time_range,
        "data_source": "structured_estimate",
    }


def effect_estimate(body: dict) -> dict:
    external = ecommerce_data_client.fetch("operation/effect-estimate", body)
    if external:
        external["data_source"] = "ecommerce_data_api"
        return external

    llm = ai_service.generate_effect_estimate(body)
    if llm:
        llm["data_source"] = "llm_market_intelligence"
        return llm

    budget = float(body.get("budget", 5000) or 5000)
    exposure = int(budget * 100)
    clicks = int(budget * 5)
    estimated_sales = int(budget * 0.16)
    estimated_revenue = int(estimated_sales * 89)
    roi = round(estimated_revenue / budget, 2) if budget else 0
    return {
        "exposure": exposure,
        "clicks": clicks,
        "conversion_rate": 3.2,
        "estimated_sales": estimated_sales,
        "roi": roi,
        "estimated_revenue": estimated_revenue,
        "channel_breakdown": [
            {"channel": "搜索推广", "exposure": int(exposure * 0.4), "clicks": int(clicks * 0.4)},
            {"channel": "信息流", "exposure": int(exposure * 0.35), "clicks": int(clicks * 0.35)},
            {"channel": "短视频", "exposure": int(exposure * 0.25), "clicks": int(clicks * 0.25)},
        ],
        "data_source": "structured_estimate",
    }
