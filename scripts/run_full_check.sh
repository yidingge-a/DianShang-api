#!/usr/bin/env bash
# 一键检查：契约测试 + 健康检查
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== API 契约测试 ==="
python3 scripts/test_api_v2.py

echo ""
echo "=== 健康检查 ==="
if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  curl -sf http://127.0.0.1:8000/health
  echo ""
else
  echo "（后端未启动，跳过在线健康检查）"
fi

echo "全部检查完成"
