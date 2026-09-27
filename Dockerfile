# WebsFlow 魔块 · 自托管镜像
# 纯 JS 依赖(express/sql.js/bcryptjs),Node 22 LTS 即可,无原生模块
FROM node:22-alpine

WORKDIR /app

# 先装依赖(利用层缓存)
COPY api/package.json api/package-lock.json* /app/api/
WORKDIR /app/api
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# 再拷贝应用
WORKDIR /app
COPY api /app/api
COPY index.html share.html ./
COPY css /app/css
COPY js /app/js
COPY assets /app/assets

# 数据库与运行时配置落到 /data(挂卷持久化)
ENV WF_DB_PATH=/data/websflow.db \
    PORT=3001
VOLUME ["/data"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "api/server.js"]
