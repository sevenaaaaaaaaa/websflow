# WebsFlow 部署指南

> 目标读者:学习能力强、想把自己的投放数据握在自己手里的 DRI 与 OPC。
> WebsFlow 是纯静态前端 + 轻量 Node API(sql.js 存储,无 MySQL/Redis 依赖),
> 可以跑在云服务器、NAS、家用本地服务器,甚至一台笔记本上。

## 一张图看懂架构

```
浏览器 ── /webflow/           静态编辑器(index.html + css/js,零依赖,可离线)
      └─ /webflow/api/…      Node API(express + sql.js,数据落单文件)
      └─ /webflow/p/<token>  托管 SSR 发布页(可挂广告、可分享)
```

三种部署形态,按需选择:

| 方式 | 适合 | 难度 |
|---|---|---|
| ① 零安装(纯前端) | 先体验、写页面,数据在本机浏览器 | ★ |
| ② Docker(推荐) | 云服务器 / NAS / 本地服务器,一条命令 | ★★ |
| ③ 原生 Node + 反代 | 已有宝塔/1Panel/Apache/Nginx 环境 | ★★ |

---

## ① 零安装:双击就能用

编辑器本身是零依赖单页应用,不需要安装任何东西:

```bash
# 直接双击 index.html(file:// 兼容是有意设计)
# 或者起一个静态服务:
python3 -m http.server 8080
# 打开 http://localhost:8080
```

此形态下:模块化出页、主题、四形态、单文件 HTML 导出**全部可用**;
数据保存在浏览器 localStorage。只有「云端同步 / 托管发布 / 数据看板」需要部署 API(见下)。

## ② Docker(推荐)

```bash
git clone https://github.com/sevenaaaaaaaaa/websflow.git
cd websflow

# 设置 JWT 密钥(务必改掉默认值)
export JWT_SECRET="$(openssl rand -hex 32)"

docker compose up -d --build
```

完成后:

- 编辑器:`http://服务器IP:3001/webflow/`
- 健康检查:`http://服务器IP:3001/api/health`
- 数据落盘:名为 `websflow_websflow-data` 的 Docker 卷(数据库文件 `/data/websflow.db`)

升级:

```bash
git pull
docker compose up -d --build
```

备份:直接拷贝卷里的 `websflow.db`(单文件,含全部用户/项目/事件数据)。

> 组合已有 Nginx?加一段反代即可把 80/443 流量导到容器:
>
> ```nginx
> location /webflow/ { proxy_pass http://127.0.0.1:3001; }
> ```

## ③ 原生部署(Node 18+,推荐 22 LTS)

```bash
git clone https://github.com/sevenaaaaaaaaa/websflow.git
cd websflow/api
npm install --omit=dev

JWT_SECRET=改成随机长字符串 WF_DB_PATH=/var/lib/websflow/websflow.db PORT=3001 node server.js
```

从 v4.39 起,API 进程自身就能把编辑器挂在 `/webflow/` 下(编辑器 + API + 托管页同源同端口),
**不需要**再配额外的静态服务器。想挂在 80/443,用任意反代把流量原样转给 3001 即可。

### 宝塔 / Apache

在站点配置(Apache 主 vhost 的 IncludeOptional 扩展口)加入:

```apache
ProxyPass /webflow/ http://127.0.0.1:3001/
ProxyPassReverse /webflow/ http://127.0.0.1:3001/
```

### Nginx

```nginx
location /webflow/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### systemd 开机自启(节选)

```ini
# /etc/systemd/system/websflow.service
[Service]
WorkingDirectory=/opt/websflow/api
Environment=JWT_SECRET=改成随机长字符串
Environment=WF_DB_PATH=/var/lib/websflow/websflow.db
ExecStart=/usr/bin/node server.js
Restart=always
```

## NAS(Synology / 威联通 / fnOS)

1. 在 Container Manager / Docker Station 里用「docker-compose」方式部署,内容同上节;
2. 把 `websflow-data` 卷映射到共享文件夹,方便快照与备份;
3. NAS 本地访问:`http://NAS内网IP:3001/webflow/`;外网投放请配合反代 + HTTPS。

## 可选能力(不配置也能跑,相关功能明确降级、不假成功)

| 能力 | 配置方式 | 未配置时 |
|---|---|---|
| AI 出页 / Copilot | 后台「设置」里填模型供应商 Key | 生产流水线退化为规则故事线,界面明确提示 |
| 收款(PayFlow) | `api/payflow-config.json` 商品映射 | 模板市场仅免费内容,付费目录不显示 |
| 邮件通知 | `api/mail-config.json` | 站内通知照常,不发邮件 |

## 环境变量一览

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | 3001 | API 监听端口 |
| `JWT_SECRET` | 内置默认值 | 登录态签名密钥,**生产必改** |
| `WF_DB_PATH` | `api/websflow.db` | SQLite 数据文件位置(建议挂卷) |
| `WF_DB_DRIVER` | auto | `better-sqlite3`(装了就用)/ `sql.js` |
| `WEBSFLOW_ADMINS` | 空 | 逗号分隔的管理员邮箱 |
| `WF_RAW_EVENT_DAYS` | 45 | 原始事件保留天数 |

## 升级与回滚

- 代码升级:`git pull` 后重启进程/容器即可;数据库结构自动兼容迁移;
- 备份优先:升级前拷走 `websflow.db`(sql.js 单文件,直接 cp);
- 发布页是 SSR 直出,升级期间约几秒不可见,建议低峰操作。
