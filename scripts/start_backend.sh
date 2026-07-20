#!/usr/bin/env bash
# 启动 FastAPI 后端（真实 uvicorn 进程）
set -euo pipefail
cd "$(dirname "$0")/.."

if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "安装依赖..."
  pip3 install --break-system-packages -r requirements.txt 2>/dev/null || pip3 install -r requirements.txt
fi

mkdir -p data uploads
echo "启动 uvicorn → http://0.0.0.0:8000"
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
