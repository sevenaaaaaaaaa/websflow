# CLAUDE.md — WebsFlow 魔块

## 项目简介

WebsFlow 魔块：面向投放的落地页工场（出页 → 上线 → 数据回流 → 放量）。纯静态零依赖前端编辑器 + 轻量 Node API（express + sql.js），托管页 SSR 挂在 `/webflow/p/<token>`。版本号见 `VERSION`（当前 4.42.x），变更记录在 `CHANGELOG.md`。兄弟项目 OpenFlow（账号互通）。

## 技术栈

- 前端：原生 JS 单页应用（`index.html` + `js/` + `css/`），无构建步骤，`file://` 可直接打开
- 后端：Node 22（兼容 18+）+ express + sql.js（可选 better-sqlite3）+ jsonwebtoken + bcryptjs
- 存储：单文件 SQLite（`websflow.db`）
- 其他：MCP Server（`mcp/websflow-mcp.js`），`api/bin/` 下有 PHP 辅助脚本（邮件/OpenFlow 任务）

## 目录结构

```
index.html / share.html   编辑器入口 / 分享页
js/                       前端模块（schema、variants*、render、editor、console 等）
css/  assets/             样式与静态资源
api/                      Node API：server.js、db.js、auth.js、routes/（27 组路由）、lib/（业务逻辑）
mcp/                      MCP Server
scripts/                  同步部署、渲染冒烟、文档生成等脚本（部分被 .gitignore 忽略，仅本地存在）
docs/                     部署/迁移/定价/功能附录等文档（DEPLOY.md、SERVER-MIGRATION.md）
deliverables/             交付样例
data/                     运行时数据（不入库）
```

## 常用命令

根目录无 package.json，依赖只在 `api/`（npm，`package-lock.json`）。

```bash
# 安装
cd api && npm install

# 本地开发（API 同时把编辑器挂在 /webflow/，默认端口 3001）
cd api && npm run dev        # 等同 node server.js
# 或仅前端：python3 -m http.server 8080

# 构建：无（前端零构建）
# Lint：无

# 渲染冒烟测试（全模块 × 全变体，失败非零退出）
node scripts/check-render.js

# 生成模块清单文档
node scripts/gen-module-docs.js > /tmp/modules.md
```

正式测试框架：无（仅上面的渲染冒烟脚本）。

## 部署方式

- 线上：自有服务器，ssh 别名 `nownexts`，路径 `/www/wwwroot/websflow`，pm2 进程名 `websflow-api`（Node 监听 3001，宝塔/Apache 反代 `/webflow/`）。在线地址 `https://nownexts.com/webflow/`
- **双轨同步，唯一入口 `scripts/sync.sh`**：
  - GitHub 轨（公开仓库）：只推干净代码。`.gitignore` 挡住密钥/运行时数据（`api/*-config.json` 中的 payflow/notify/mail、`*.db`、`data/`、`.sync.conf`、`.env*`），提交前 gitleaks 扫描暂存区，发现泄漏即中止；只推 `main`
  - 服务器轨：rsync 工作区（不带 --delete，排除 `*-config.json`/`*.db*`/`*.log`/`data/` 等服务器运行时文件），写入前预演并需人工确认；改动涉及 `api/` 时自动 `pm2 restart` + 健康检查 `/api/health`
  - 主机配置读自 `.sync.conf`（gitignored，模板 `.sync.conf.example`）
  - 本地 `.git/hooks/pre-commit` 跑 gitleaks（不入库，新 clone 需自行安装）

```bash
bash scripts/sync.sh                    # gitleaks → commit → push main → rsync → (按需)重启
bash scripts/sync.sh "feat: 说明"        # 同上，指定提交信息（或 -m "..."）
bash scripts/sync.sh --dry-run          # 预演：gitleaks 扫描 + rsync -n，不提交/不推送/不重启
bash scripts/sync.sh --server-only      # 只发服务器（旧写法 deploy 仍可用）
bash scripts/sync.sh diff               # 只看差异
bash scripts/sync.sh from-server        # 服务器 → 本地
```

- 无 CI 自动部署；分支 `main`，push 不触发部署，部署全靠 `scripts/sync.sh`
- 其他形态：`Dockerfile` + `docker-compose.yml`（`docker compose up -d --build`，端口 3001，数据卷 `/data`），详见 `docs/DEPLOY.md`
- `scripts/kiwi-snapshot.sh`：KiwiVM（搬瓦工）快照工具，凭据在 `~/.kiwivm.env`

## 开发工具 vs 使用工具（硬性规则）

WebsFlow 既是在开发的产品，也是每天在用的工具。两类产物必须分开：

| 类别 | 例子 | 放哪 | GitHub | 服务器 |
|---|---|---|---|---|
| 开发工具（产品代码） | `api/`、`js/`、`css/`、`mcp/`、`scripts/` 等 | 原目录 | ✅ | ✅（Web 根 `/www/wwwroot/websflow`） |
| 使用工具的产物 | 运营/SEO 批处理脚本、批次文件、一次性修复脚本、导出数据 | **`ops/`** | ❌ | ✅ 仅 `/www/ops/websflow/`（Web 根之外，只增不删） |

- `/ops/` 已 gitignore，且被排除在 Web 根 rsync 之外；`scripts/sync.sh` 单独用 `rsync --update` 把它送到 `/www/ops/websflow/`（先预演、确认后写入，`--dry-run` 只预览）。
- 拿不准时按第二类处理（放 `ops/`，不进 GitHub），再问用户。

## 注意事项

- 环境变量（仅名称）：`PORT`、`JWT_SECRET`（生产必改）、`WF_DB_PATH`、`WF_DB_DRIVER`、`WEBSFLOW_ADMINS`、`WEBSFLOW_AI_KEY`、`WEBSFLOW_LARK_WEBHOOK`、`WF_RAW_EVENT_DAYS`、`WF_LLM_TIMEOUT_MS`、`WF_JOURNAL_COMPACT_MS`、`WF_JOURNAL_COMPACT_WRITES`
- 运行时配置文件不入库、不参与同步：`api/payflow-config.json`、`api/notify-config.json`、`api/mail-config.json`、`api/websflow.db*`、`*.log`、`data/`
- 服务器被视为代码真源之一，改动前先 `bash scripts/sync.sh diff` 确认两端一致
- 前端静态资源靠 `?v=` 版本号破缓存；发版时同步更新 `VERSION` 与 `CHANGELOG.md`
