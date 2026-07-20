#!/usr/bin/env bash
# 构建前端并输出到 frontend_dist（供 Nginx / Docker 使用）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

export VITE_DISABLE_NOCODE=1
export VITE_API_URL=/api/v1
# 生产默认需要登录；若联调可临时设 VITE_DISABLE_AUTH=1
export VITE_DISABLE_AUTH="${VITE_DISABLE_AUTH:-0}"

if ! command -v npm >/dev/null 2>&1; then
  echo "需要 Node.js/npm。请先安装 Node 18+"
  exit 1
fi

npm ci
npm run build

rm -rf "$ROOT/frontend_dist"
mkdir -p "$ROOT/frontend_dist"
# vite outDir 默认 build
if [ -d build ]; then
  cp -a build/. "$ROOT/frontend_dist/"
elif [ -d dist ]; then
  cp -a dist/. "$ROOT/frontend_dist/"
else
  echo "未找到 build/ 或 dist/ 产物"
  exit 1
fi

# 保证目录可被 git 跟踪占位（实际产物仍被 frontend_dist/* ignore，CVM 本地生成即可）
touch "$ROOT/frontend_dist/.gitkeep"
echo "前端已输出到 $ROOT/frontend_dist"
ls -la "$ROOT/frontend_dist" | head -20