#!/usr/bin/env python3
"""前后端连通性 + 核心业务冒烟测试。"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import httpx

BASE = "http://127.0.0.1:8000"
API = f"{BASE}/api/v1"


def main() -> int:
    client = httpx.Client(timeout=120.0)
    checks: list[tuple[str, bool, str]] = []

    def record(name: str, ok: bool, detail: str = "") -> None:
        checks.append((name, ok, detail))
        mark = "✓" if ok else "✗"
        print(f"  {mark} {name}" + (f" — {detail}" if detail else ""))

    print("\n=== 连通性检查 ===\n")

    try:
        r = client.get(f"{BASE}/health")
        record("GET /health", r.status_code == 200, r.text[:80])
    except Exception as exc:
        record("GET /health", False, str(exc))
        print("\n后端未启动，请先: uvicorn app.main:app --host 0.0.0.0 --port 8000")
        return 1

    login = client.post(f"{API}/auth/login", json={"email": "dev@local.test", "password": "dev123456"})
    ok = login.status_code == 200 and login.json().get("success")
    token = login.json().get("data", {}).get("access_token", "") if ok else ""
    record("POST /auth/login", ok)
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    price = client.post(
        f"{API}/pricing/price-comparison",
        json={"query": "保温杯", "platforms": ["taobao", "jd"], "price_range": {"min": 50, "max": 150}},
        headers=headers,
    )
    pdata = price.json().get("data", {}) if price.status_code == 200 else {}
    record(
        "POST /pricing/price-comparison",
        price.status_code == 200 and bool(pdata.get("summary")),
        pdata.get("data_source", ""),
    )

    overview = client.get(f"{API}/market/overview", params={"keyword": "保温杯"}, headers=headers)
    odata = overview.json().get("data", {}) if overview.status_code == 200 else {}
    record("GET /market/overview", overview.status_code == 200, odata.get("data_source", ""))

    prod = client.post(
        f"{API}/publish/products",
        json={"name": "连通性测试商品", "price": 99, "category": "家居"},
        headers=headers,
    )
    pid = prod.json().get("data", {}).get("id", "") if prod.status_code == 200 else ""
    record("POST /publish/products", bool(pid))

    if pid:
        pub = client.post(
            f"{API}/publish/publish",
            json={"product_id": pid, "platforms": ["taobao", "jd"]},
            headers=headers,
        )
        publish_id = pub.json().get("data", {}).get("publish_id", "")
        record("POST /publish/publish", bool(publish_id))
        if publish_id:
            time.sleep(0.5)
            task = client.get(f"{API}/publish/tasks/{publish_id}", headers=headers)
            tdata = task.json().get("data", {})
            link = (tdata.get("results") or [{}])[0].get("link", "")
            record("GET /publish/tasks/{id}", task.status_code == 200 and bool(link), link[:60])

    failed = sum(1 for _, ok, _ in checks if not ok)
    print(f"\n通过: {len(checks) - failed}/{len(checks)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
