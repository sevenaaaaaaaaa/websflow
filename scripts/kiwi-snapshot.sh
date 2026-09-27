#!/usr/bin/env bash
# ============================================================
# WebsFlow · KiwiVM(搬瓦工)快照工具
# 用法:
#   bash scripts/kiwi-snapshot.sh            # 创建快照
#   bash scripts/kiwi-snapshot.sh status     # 查看最近快照
# 凭据:~/.kiwivm.env(不进 git):
#   export KIWI_VM_ID="<VEID>"; export KIWI_API_KEY="<KEY>"
# ============================================================
set -euo pipefail
[ -f "$HOME/.kiwivm.env" ] || { echo "缺少 ~/.kiwivm.env(KIWI_VM_ID / KIWI_API_KEY)"; exit 1; }
source "$HOME/.kiwivm.env"
: "${KIWI_VM_ID:?}"; : "${KIWI_API_KEY:?}"
API="https://api.kiwivm.64clouds.com/v1"

case "${1:-shot}" in
  shot)   curl -s "$API/execShot?veid=${KIWI_VM_ID}&api_key=${KIWI_API_KEY}" | head -c 400; echo ;;
  status) curl -s "$API/getSnapshots?veid=${KIWI_VM_ID}&api_key=${KIWI_API_KEY}" | head -c 800; echo ;;
  *) echo "用法: $0 [shot|status]"; exit 1 ;;
esac
