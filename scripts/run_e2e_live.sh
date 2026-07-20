#!/usr/bin/env bash
# WSL 一键真实联调：uvicorn + Vite + Playwright 浏览器
#
# 用法:
#   bash scripts/run_e2e_live.sh
#   bash scripts/run_e2e_live.sh --no-start-backend   # 后端已手动启动时
#
# 说明:
#   - 在 WSL 里不要用 powershell 命令，用本脚本
#   - 前端优先检测 8080；未运行则尝试通过 Windows cmd 启动 npm run dev

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/scripts/e2e_logs"
mkdir -p "$LOG_DIR"

API="http://127.0.0.1:8000"
BASE="http://127.0.0.1:8080"
FRONTEND_WIN='D:\KIMI_project\电商项目\nocode\nocode'

STARTED_BACKEND=0
BACKEND_PID=""

cleanup() {
  if [[ "$STARTED_BACKEND" -eq 1 && -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_url() {
  local url="$1"
  local tries="${2:-30}"
  for _ in $(seq 1 "$tries"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# 用 Node 检测 Chromium 可执行文件是否已在 WSL 缓存中
playwright_chromium_ready() {
  node -e "
    const { chromium } = require('playwright');
    const fs = require('fs');
    const p = chromium.executablePath();
    if (fs.existsSync(p)) {
      console.log(p);
      process.exit(0);
    }
    process.exit(1);
  " 2>/dev/null
}

run_playwright_install() {
  if [[ -f "$ROOT/node_modules/playwright/cli.js" ]]; then
    node "$ROOT/node_modules/playwright/cli.js" install chromium
  else
    npx playwright install chromium
  fi
}

run_playwright_install_deps() {
  echo "安装 Chromium 系统库（libnspr4 等，需 sudo 密码）..."
  if [[ -f "$ROOT/node_modules/playwright/cli.js" ]]; then
    sudo node "$ROOT/node_modules/playwright/cli.js" install-deps chromium
  else
    sudo npx playwright install-deps chromium
  fi
}

# 实际启动一次浏览器，验证系统依赖是否齐全
playwright_chromium_can_launch() {
  node -e "
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
    })().then(() => process.exit(0)).catch(() => process.exit(1));
  " 2>/dev/null
}

# 确保 npm 包 + Chromium + 系统依赖均可运行（WSL）
ensure_playwright_chromium() {
  cd "$ROOT"

  if ! node -e "require('playwright')" 2>/dev/null; then
    echo "未安装 playwright npm 包，正在安装..."
    npm init -y >/dev/null 2>&1 || true
    npm install playwright --no-save
  fi
  chmod +x node_modules/.bin/playwright 2>/dev/null || true

  local chromium_path
  if ! chromium_path=$(playwright_chromium_ready); then
    echo "WSL 未检测到 Playwright Chromium，开始下载（首次约 150MB）..."
    if ! run_playwright_install; then
      echo "Chromium 下载失败"
      return 1
    fi
    chromium_path=$(playwright_chromium_ready) || {
      echo "安装后仍未找到 Chromium 可执行文件"
      return 1
    }
    echo "Playwright Chromium 下载完成: $chromium_path"
  else
    echo "Playwright Chromium 已存在: $chromium_path"
  fi

  if playwright_chromium_can_launch; then
    echo "Chromium 启动自检通过"
    return 0
  fi

  echo "Chromium 无法启动（常见原因: 缺少 libnspr4.so 等系统库）"
  if ! run_playwright_install_deps; then
    echo "系统依赖安装失败。请手动执行:"
    echo "  sudo npx playwright install-deps chromium"
    return 1
  fi

  if playwright_chromium_can_launch; then
    echo "安装系统依赖后，Chromium 启动自检通过"
    return 0
  fi

  echo "仍无法启动 Chromium，请检查上方错误日志"
  return 1
}

echo "=== 1. 检查后端 $API/health ==="
if curl -sf "$API/health" >/dev/null 2>&1; then
  echo "后端已在运行: $(curl -sf "$API/health")"
elif [[ "${1:-}" == "--no-start-backend" ]]; then
  echo "后端未运行。请先执行:"
  echo "  cd $ROOT && bash scripts/start_backend.sh"
  exit 1
else
  echo "启动后端 uvicorn..."
  cd "$ROOT"
  nohup bash scripts/start_backend.sh >"$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  STARTED_BACKEND=1
  if ! wait_url "$API/health" 25; then
    echo "后端启动失败，日志: $LOG_DIR/backend.log"
    tail -40 "$LOG_DIR/backend.log" || true
    exit 1
  fi
  echo "后端就绪: $(curl -sf "$API/health")"
fi

echo ""
echo "=== 2. 检查前端 $BASE ==="
if wait_url "$BASE/" 3; then
  echo "前端已在运行"
else
  echo "前端未运行，尝试通过 Windows 启动 npm run dev ..."
  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c "cd /d \"$FRONTEND_WIN\" && start \"vite\" npm run dev" >/dev/null 2>&1 || true
  else
    echo "未找到 cmd.exe，请在 Windows 终端手动执行:"
    echo "  cd $FRONTEND_WIN"
    echo "  npm run dev"
    exit 1
  fi
  if ! wait_url "$BASE/" 45; then
    echo "前端启动超时。请手动在 Windows 运行 npm run dev 后重试。"
    exit 1
  fi
  echo "前端已就绪"
fi

echo ""
echo "=== 3. 测试 Vite 代理 /api -> 后端（需登录） ==="
LOGIN_JSON=$(curl -sf -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@local.test","password":"dev123456"}') || {
  echo "登录失败，请确认 DEBUG=true 且已 seed dev 用户"
  exit 1
}
TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
PROXY_JSON=$(curl -sf -X POST "$BASE/api/v1/pricing/price-comparison" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"保温杯","platforms":["taobao"]}') || {
  echo "代理请求失败。请确认 vite.config.js 已配置 proxy 并重启 npm run dev"
  exit 1
}
if echo "$PROXY_JSON" | grep -q '"success":true'; then
  echo "代理联调 OK"
else
  echo "代理返回异常: $PROXY_JSON"
  exit 1
fi

echo ""
echo "=== 4. 检查 / 安装 Playwright Chromium（WSL）==="
if ! ensure_playwright_chromium; then
  exit 1
fi

echo ""
echo "=== 5. Playwright 浏览器 E2E ==="
node scripts/e2e_live_test.mjs --base "$BASE" | tee "$LOG_DIR/e2e_result.log"
