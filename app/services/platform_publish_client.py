"""平台上架客户端：优先走发布网关 / 平台 OpenAPI，否则 LLM 铺货 + 生成可访问上架页。"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings
from app.models.product import Product
from app.services.ai_service import ai_service
from app.utils.content_files import write_listing_page_html

logger = logging.getLogger(__name__)

_PLATFORM_LABELS = {
    "taobao": "淘宝",
    "tmall": "天猫",
    "jd": "京东",
    "pdd": "拼多多",
    "douyin": "抖音",
}


def _platform_credentials(platform: str) -> tuple[str, str]:
    settings = get_settings()
    mapping = {
        "taobao": (settings.taobao_open_api_key, settings.taobao_open_api_secret),
        "tmall": (settings.taobao_open_api_key, settings.taobao_open_api_secret),
        "jd": (settings.jd_open_api_key, ""),
        "pdd": (settings.pdd_open_api_key, ""),
    }
    return mapping.get(platform, ("", ""))


def _publish_via_gateway(product: Product, platform: str) -> dict[str, Any] | None:
    settings = get_settings()
    gateway = settings.publish_gateway_url.strip().rstrip("/")
    if not gateway:
        return None

    payload = {
        "platform": platform,
        "product_id": product.product_id,
        "name": product.name,
        "description": product.description or "",
        "price": float(product.price or 0),
        "category": product.category,
        "images": product.images,
    }
    headers = {"Content-Type": "application/json"}
    key = settings.publish_gateway_api_key.strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(f"{gateway}/publish", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and data.get("success") and data.get("data"):
                return data["data"]
            return data if isinstance(data, dict) else None
    except Exception as exc:
        logger.warning("发布网关调用失败: %s", exc)
        return None


def _publish_via_platform_api(product: Product, platform: str) -> dict[str, Any] | None:
    api_key, api_secret = _platform_credentials(platform)
    if not api_key:
        return None

    settings = get_settings()
    base = settings.publish_gateway_url.strip() or f"https://open.{platform}.com/api"
    payload = {
        "app_key": api_key,
        "app_secret": api_secret,
        "product": {
            "title": product.name,
            "price": product.price,
            "description": product.description,
            "images": product.images,
        },
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(f"{base.rstrip('/')}/item/publish", json=payload)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict):
                return {
                    "success": True,
                    "link": data.get("item_url") or data.get("link", ""),
                    "listing_id": data.get("item_id") or data.get("listing_id", ""),
                    "message": data.get("message", "平台上架成功"),
                }
    except Exception as exc:
        logger.warning("%s OpenAPI 上架失败: %s", platform, exc)
    return None


def publish_to_platform(product: Product, platform: str, publish_id: str) -> dict[str, Any]:
    """单平台上架，返回前端 results[] 单项结构。"""
    label = _PLATFORM_LABELS.get(platform, platform)

    gateway_result = _publish_via_gateway(product, platform)
    if gateway_result:
        return {
            "platform": label,
            "success": bool(gateway_result.get("success", True)),
            "message": gateway_result.get("message", f"{label}上架成功"),
            "link": gateway_result.get("link", ""),
            "listing_id": gateway_result.get("listing_id", ""),
            "mode": "gateway",
        }

    api_result = _publish_via_platform_api(product, platform)
    if api_result and api_result.get("link"):
        return {
            "platform": label,
            "success": True,
            "message": api_result.get("message", f"{label}上架成功"),
            "link": api_result["link"],
            "listing_id": api_result.get("listing_id", ""),
            "mode": "platform_api",
        }

    title = ai_service.generate_product_title(product.name, platform, [product.category])
    description = product.description or ai_service.generate_product_description(
        product.name, [product.category], platform
    )
    selling_points = ai_service.generate_selling_points([product.category, product.name])
    listing_url = write_listing_page_html(
        publish_id=publish_id,
        product_id=product.product_id,
        platform=platform,
        title=title,
        price=float(product.price or 0),
        description=description,
        selling_points=selling_points,
        image_ids=product.images,
    )
    return {
        "platform": label,
        "success": True,
        "message": f"{label}智能铺货完成，已生成上架页",
        "link": listing_url,
        "listing_id": f"{product.product_id}-{platform}",
        "mode": "smart_listing",
    }
