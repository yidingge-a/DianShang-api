#!/usr/bin/env python3
"""
v2 接口契约自动化测试（对照「后端接口需求文档-前端对齐版-v2」）。

用法（在项目根目录 DianShang_project/ 下）:
    python scripts/test_api_v2.py
    python scripts/test_api_v2.py --verbose
"""
from __future__ import annotations

import argparse
import io
import os
import sys
import tempfile
from pathlib import Path

# 测试库使用独立 SQLite，避免污染开发数据
TEST_DB = Path(tempfile.gettempdir()) / "dianshang_api_v2_test.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DB}")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:8080")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.database import init_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.seed_data import seed_dev_user, seed_forbidden_words  # noqa: E402

API = "/api/v1"

passed = 0
failed = 0
errors: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        msg = f"  ✗ {name}" + (f" — {detail}" if detail else "")
        print(msg)
        errors.append(f"{name}: {detail}" if detail else name)


def assert_envelope(body: dict, name: str) -> bool:
    ok = (
        body.get("success") is True
        and body.get("code") == 200
        and "message" in body
        and "timestamp" in body
        and "data" in body
    )
    check(f"{name} 响应信封", ok, str(body)[:200])
    return ok


def make_test_image() -> tuple[str, bytes]:
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color=(255, 0, 0)).save(buf, format="JPEG")
    return "test.jpg", buf.getvalue()


def run_tests(verbose: bool = False) -> int:
    global passed, failed, errors

    if TEST_DB.exists():
        TEST_DB.unlink()

    init_db()
    seed_forbidden_words()
    seed_dev_user()

    client = TestClient(create_app())
    login_res = client.post(
        f"{API}/auth/login",
        json={"email": "dev@local.test", "password": "dev123456"},
    )
    auth_h = {"Authorization": f"Bearer {login_res.json()['data']['access_token']}"}

    def api_post(url, **kwargs):
        headers = {**auth_h, **kwargs.pop("headers", {})}
        return client.post(url, headers=headers, **kwargs)

    def api_get(url, **kwargs):
        headers = {**auth_h, **kwargs.pop("headers", {})}
        return client.get(url, headers=headers, **kwargs)

    image_id: str | None = None
    product_id: str | None = None
    monitor_id: str | None = None

    print("\n=== v2 接口契约测试 ===\n")

    # --- 健康检查 ---
    print("[基础]")
    r = client.get("/health")
    check("GET /health", r.status_code == 200 and r.json().get("status") == "ok")

    # --- 定价 ---
    print("\n[定价成本]")
    r = api_post(f"{API}/pricing/price-comparison", json={
        "query": "不锈钢保温杯",
        "platforms": ["taobao", "jd", "pdd"],
        "price_range": {"min": 50, "max": 150},
    })
    body = r.json()
    assert_envelope(body, "price-comparison")
    data = body.get("data") or {}
    check("比价 summary", "summary" in data and "lowest_price" in data["summary"])
    check("比价 platform_breakdown", isinstance(data.get("platform_breakdown"), list))
    check("比价 competitors", isinstance(data.get("competitors"), list))

    r = api_post(f"{API}/pricing/recommendation", json={
        "product_name": "304不锈钢保温杯",
        "product_category": "家居用品",
        "platform": "taobao",
        "platforms": ["taobao", "jd", "pdd"],
        "product_specs": "500ml 真空双层",
    })
    body = r.json()
    assert_envelope(body, "recommendation")
    data = body.get("data") or {}
    check("定价 recommended_price", "recommended_price" in data)
    check("定价 recommended_range", isinstance(data.get("recommended_range"), dict))
    check("定价含比价结果", isinstance(data.get("price_comparison"), dict))

    r = api_post(f"{API}/pricing/bom/analyze", json={
        "product_name": "304不锈钢保温杯",
        "product_category": "家居用品",
        "product_specs": "500ml 真空双层 304内胆",
    })
    body = r.json()
    assert_envelope(body, "bom/analyze")
    data = body.get("data") or {}
    bd = data.get("cost_breakdown") or {}
    check("BOM cost_breakdown.raw_materials", "raw_materials" in bd)
    check("BOM cost_breakdown.processes", "processes" in bd)
    check("BOM total_cost", "total_cost" in data)

    # --- 市场分析 ---
    print("\n[市场分析]")
    r = api_post(f"{API}/market/industry-chain/match", json={
        "product_category": "不锈钢保温杯",
        "product_subcategory": "保温杯",
        "location": "浙江省义乌市",
    })
    body = r.json()
    assert_envelope(body, "industry-chain/match")
    data = body.get("data") or {}
    check("产业链 upstream_suppliers", isinstance(data.get("upstream_suppliers"), list))
    check("产业链 processors", isinstance(data.get("processors"), list))
    check("产业链 downstream_distributors", isinstance(data.get("downstream_distributors"), list))
    check("产业链无 chain.upstream", "chain" not in data)

    r = api_post(f"{API}/market/analysis/report", json={
        "product_keyword": "不锈钢保温杯",
        "platforms": ["taobao", "jd"],
        "time_range": "30d",
    })
    body = r.json()
    assert_envelope(body, "analysis/report")
    data = body.get("data") or {}
    check("市场报告 summary", "summary" in data)
    check("市场报告 platform_data", isinstance(data.get("platform_data"), list))
    check("市场报告 trend_analysis", "trend_analysis" in data)

    # --- 数据运营 ---
    print("\n[数据运营]")
    r = api_post(f"{API}/operation/marketing/strategies", json={
        "product_name": "保温杯",
        "budget": "5000",
        "target_audience": "25-35岁白领",
    })
    body = r.json()
    assert_envelope(body, "marketing/strategies")
    strategies = (body.get("data") or {}).get("strategies") or []
    check("营销策略 strategies[]", len(strategies) > 0)
    if strategies:
        s0 = strategies[0]
        check("营销策略 roi/budget/channels", all(k in s0 for k in ("roi", "budget", "channels")))

    r = api_post(f"{API}/operation/promotion/effect-estimate", json={"budget": 5000})
    body = r.json()
    assert_envelope(body, "effect-estimate")
    data = body.get("data") or {}
    check("推广效果顶层 exposure", "exposure" in data)
    check("推广效果顶层 roi", "roi" in data)
    check("推广效果无嵌套 estimate", "estimate" not in data)

    r = api_post(f"{API}/operation/monitor/setup", json={"name": "测试监控", "auto_refresh": True})
    body = r.json()
    assert_envelope(body, "monitor/setup")
    monitor_id = (body.get("data") or {}).get("monitor_id")
    check("监控 setup monitor_id", bool(monitor_id))

    if monitor_id:
        r = api_get(f"{API}/operation/monitor/{monitor_id}/data", params={"time_range": "1d"})
        body = r.json()
        assert_envelope(body, "monitor/data")
        data = body.get("data") or {}
        check("监控扁平 views", "views" in data)
        check("监控扁平 visitors", "visitors" in data)
        check("监控扁平 conversion_rate", "conversion_rate" in data)
        check("监控无嵌套 metrics", "metrics" not in data)

        r = api_post(f"{API}/operation/monitor/optimize", json={
            "monitor_id": monitor_id,
            "data": {"bounce_rate": 48, "conversion_rate": 2.5},
        })
        body = r.json()
        assert_envelope(body, "monitor/optimize")
        suggestions = (body.get("data") or {}).get("suggestions") or []
        check("优化建议 suggestions[]", len(suggestions) > 0)

    # --- 上架发布 ---
    print("\n[上架发布]")
    r = api_get(f"{API}/publish/platforms")
    body = r.json()
    assert_envelope(body, "platforms")
    platforms = body.get("data")
    check("平台列表 data 为数组", isinstance(platforms, list))
    if platforms:
        check("平台含 id/commission_rate", "id" in platforms[0] and "commission_rate" in platforms[0])

    r = api_get(f"{API}/publish/products")
    body = r.json()
    assert_envelope(body, "products list")
    products = body.get("data")
    check("产品列表 data 为数组", isinstance(products, list))
    check("产品列表非 items 包装", "items" not in body)

    r = api_post(f"{API}/publish/products", json={
        "name": "304不锈钢保温杯",
        "price": 89,
        "category": "家居用品",
    })
    body = r.json()
    assert_envelope(body, "products create")
    pdata = body.get("data") or {}
    product_id = pdata.get("id")
    check("产品字段 id（非 product_id）", bool(product_id) and "product_id" not in pdata)

    r = api_post(f"{API}/publish/platform-recommendation", json={
        "product_id": product_id,
        "product_name": "304不锈钢保温杯",
    })
    body = r.json()
    assert_envelope(body, "platform-recommendation")
    rec_data = body.get("data") or {}
    plats = rec_data.get("platforms") or []
    check("平台推荐 platforms[]", isinstance(plats, list) and len(plats) > 0)
    if plats:
        check("平台推荐 match_score", "match_score" in plats[0])

    # --- 合规 ---
    print("\n[合规文案]")
    r = api_get(f"{API}/compliance/forbidden-words")
    body = r.json()
    assert_envelope(body, "forbidden-words")

    r = api_post(f"{API}/compliance/detail-page/generate", json={
        "product_info": {
            "name": "保温杯",
            "category": "家居",
            "features": ["304不锈钢"],
            "price": 89,
        },
        "platform": "taobao",
    })
    body = r.json()
    assert_envelope(body, "compliance detail-page")
    data = body.get("data") or {}
    check("合规详情 platform", data.get("platform") == "taobao")
    check("合规详情 content", isinstance(data.get("content"), dict))

    # --- 上传 & 智能美工（需 dev 用户） ---
    print("\n[上传 & 智能美工]")
    fname, img_bytes = make_test_image()
    r = api_post(
        f"{API}/upload",
        files={"file": (fname, img_bytes, "image/jpeg")},
        data={"type": "image", "module": "smart-design"},
    )
    body = r.json()
    assert_envelope(body, "upload")
    upload_data = body.get("data") or {}
    image_id = upload_data.get("file_id")
    check("上传 file_id", bool(image_id))
    check("上传 file_url 完整 URL", str(upload_data.get("file_url", "")).startswith("http"))

    if image_id:
        r = api_post(f"{API}/smart-design/image/optimize", json={
            "image_id": image_id,
            "optimize_type": "all",
            "intensity": 0.7,
            "white_background": True,
            "remove_defects": False,
            "auto_crop": True,
        })
        body = r.json()
        assert_envelope(body, "image/optimize")
        data = body.get("data") or {}
        check("图片优化 task_id", bool(data.get("task_id")))
        check("图片优化 result_url", bool(data.get("result_url")))

        r = api_post(f"{API}/smart-design/tools/crop-resize", json={
            "image_ids": [image_id],
            "operation": "resize",
        })
        body = r.json()
        assert_envelope(body, "crop-resize")
        check("crop-resize result_url", bool((body.get("data") or {}).get("result_url")))

        r = api_post(f"{API}/smart-design/detail-page/generate", json={
            "product_name": "保温杯",
            "product_images": [image_id],
            "style": "modern",
        })
        body = r.json()
        assert_envelope(body, "detail-page/generate")
        data = body.get("data") or {}
        result = data.get("result") or {}
        html_url = data.get("html_url") or result.get("html_url")
        check("详情页 html_url", bool(html_url))

    # --- 汇总 ---
    total = passed + failed
    print(f"\n{'=' * 40}")
    print(f"通过: {passed}/{total}  失败: {failed}/{total}")
    if errors and verbose:
        print("\n失败详情:")
        for e in errors:
            print(f"  - {e}")
    print()
    return 0 if failed == 0 else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="v2 API 契约测试")
    parser.add_argument("-v", "--verbose", action="store_true", help="打印失败详情")
    args = parser.parse_args()
    sys.exit(run_tests(verbose=args.verbose))


if __name__ == "__main__":
    main()
