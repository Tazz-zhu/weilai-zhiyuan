#!/usr/bin/env bash
# 未来致远 · macOS / Linux 启动脚本
set -e
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  NODE=node
else
  echo "[错误] 未找到 Node.js，请安装 Node.js 22.5+ 并加入 PATH。"
  exit 1
fi
echo "🌅 未来致远启动中 → http://localhost:4173"
if command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:4173
elif command -v open >/dev/null 2>&1; then open http://localhost:4173
fi
exec "$NODE" server.js
