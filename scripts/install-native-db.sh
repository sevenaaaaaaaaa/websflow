#!/usr/bin/env bash
# ============================================================
# WebsFlow · 原生 SQLite 驱动安装(better-sqlite3)
#
# 用途:在支持的环境(Node 18+/较新 glibc)上启用原生驱动,
#       获得 WAL 与"无需整库导出"的写入性能。
# 本机不适合时(见下方检查)保持默认 sql.js + 写入日志即可,功能一致。
#
# 用法:bash scripts/install-native-db.sh [版本,默认 8.7.0]
# ============================================================
set -e
cd "$(dirname "$0")/../api"
VER="${1:-8.7.0}"

echo "[1/4] 环境检查"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
echo "  node: $(node -v) | glibc: $(ldd --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+$' || echo unknown)"
case "$NODE_MAJOR" in
  16) ABI=93 ;;
  18) ABI=108 ;;
  20) ABI=115 ;;
  22) ABI=127 ;;
  *)  ABI="" ;;
esac
echo "  node ABI: ${ABI:-未知(将尝试源码编译)}"

echo "[2/4] 安装 JS 部分(跳过编译)"
export npm_config_cache="${TMPDIR:-/tmp}/websflow-npm-cache"
mkdir -p "$npm_config_cache"
npm install "better-sqlite3@${VER}" --no-save --ignore-scripts --no-audit --no-fund >/dev/null

echo "[3/4] 取预编译二进制(存在则跳过编译)"
if [ -n "$ABI" ]; then
  URL="https://github.com/WiseLibs/better-sqlite3/releases/download/v${VER}/better-sqlite3-v${VER}-node-v${ABI}-linux-x64.tar.gz"
  if curl -sfL "$URL" -o /tmp/bs3.tgz; then
    mkdir -p node_modules/better-sqlite3/build/Release
    tar -xzf /tmp/bs3.tgz -C /tmp/bs3-extract 2>/dev/null || { mkdir -p /tmp/bs3-extract && tar -xzf /tmp/bs3.tgz -C /tmp/bs3-extract; }
    find /tmp/bs3-extract -name 'better_sqlite3.node' -exec cp {} node_modules/better-sqlite3/build/Release/ \;
    echo "  已放置预编译二进制"
  else
    echo "  预编译不可用,尝试源码编译(需要 g++ 支持 C++17)"
    npm rebuild better-sqlite3 >/dev/null
  fi
fi

echo "[4/4] 验证"
if node -e "require('better-sqlite3'); console.log('  ✓ better-sqlite3 可加载')"; then
  echo "完成。设置 WF_DB_DRIVER=better 或保持 auto,重启 API 即可生效。"
else
  echo "✗ 该环境无法使用原生驱动:保持默认(sql.js + 写入日志),功能一致,仅写入性能有差异。"
fi
