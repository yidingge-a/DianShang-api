#!/usr/bin/env bash
# 从项目根 deploy/.env 同步密钥到 DianShang_project/.env（不覆盖已有非空值）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPLOY_ENV="$ROOT/deploy/.env"
TARGET="$ROOT/DianShang_project/.env"
EXAMPLE="$ROOT/DianShang_project/.env.example"

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "缺少 $DEPLOY_ENV"
  exit 1
fi

if [[ ! -f "$TARGET" ]]; then
  cp "$EXAMPLE" "$TARGET"
fi

KEYS=(
  OPENAI_API_KEY
  OPENAI_BASE_URL
  LLM_CHAT_MODEL
  LLM_TEMPERATURE
  LLM_MAX_TOKENS
  DASHSCOPE_API_KEY
  VISION_API_BASE
  VISION_API_KEY
  VISION_MODEL
  VIDEO_API_BASE
  VIDEO_API_KEY
  VIDEO_MODEL
  ECOMMERCE_DATA_API_BASE
  ECOMMERCE_DATA_API_KEY
  PUBLISH_GATEWAY_URL
  PUBLISH_GATEWAY_API_KEY
  TAOBAO_OPEN_API_KEY
  TAOBAO_OPEN_API_SECRET
  JD_OPEN_API_KEY
  PDD_OPEN_API_KEY
)

get_val() {
  local key="$1"
  grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true
}

get_target_val() {
  local key="$1"
  grep -E "^${key}=" "$TARGET" 2>/dev/null | head -1 | cut -d= -f2- || true
}

set_or_append() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$TARGET"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$TARGET"
  else
    echo "${key}=${val}" >> "$TARGET"
  fi
}

for key in "${KEYS[@]}"; do
  src="$(get_val "$key")"
  [[ -z "$src" ]] && continue
  cur="$(get_target_val "$key")"
  if [[ -z "$cur" ]]; then
    set_or_append "$key" "$src"
    echo "synced: $key"
  fi
done

echo "完成：$TARGET"
