# 服务器迁移清单:CentOS 7 → Debian 12(整机农场迁移)

> 2026-09-20 勘察定稿 · 执行人:Seven + ZCode · 预估停机窗口:半天(低流量时段)
> 原则:**先快照,后动手**;每一步都有验证命令;全程可回滚。

## 一、为什么迁(结论先行)

| 项 | 现状 | 问题 |
|---|---|---|
| OS | CentOS 7(2024-06 EOL) | 无安全补丁已两年+,yum 源陆续失效,唯一红灯 |
| Node | v16.9.0(2023-09 EOL) | 被 CentOS 7 的 glibc 2.17 锁死,无法升 18+;**换 OS 是升 Node 的前置** |
| Apache / PHP / pm2 | 2.4.68(Brotli+HTTP2) / 8.3.33 / 6.x | 已现代,重装后原样搬配置即可 |

**目标态:Debian 12(bookworm)+ Node 22 LTS**(与本地开发机 v22.22.3 对齐,开发/生产同运行时)。不选 Debian 13(太新,宝塔生态未验证)。WebsFlow 用 sql.js + bcryptjs 纯 JS,**Node 16→22 零原生模块重建风险**。

## 二、迁移农场全景(勘察实测,按迁移顺序)

| 顺序 | 服务 | 落位 | 体量 | 运行方式 | 迁移动作 |
|---|---|---|---|---|---|
| 1 | OpenFlow | `/www/wwwroot/nownexts_com` | 843M | Apache + PHP-FPM 8.3 | rsync 目录 + 迁 crontab(每分钟心跳)+ MySQL 库 |
| 2 | PayFlow | `/www/wwwroot/payflow` | 1.6M | PHP 8.3 | rsync + **MySQL dump/restore**(已切 MySQL,资金真源,最先验证)+ crontab |
| 3 | WebsFlow | `/www/wwwroot/websflow` | 61M | pm2 `websflow-api`(入口 `api/server.js`,cwd `api/`) | rsync(排除 `websflow.db*`/`*-config.json` 不动?→ 不,**这些必须随迁**)、pm2 save、Node 22 |
| 4 | MFlow | `/www/wwwroot/mflow` | 555M | 反代 127.0.0.1:8088 | rsync + launchd 同款 crontab |
| 5 | LearnFlow | `/www/wwwroot/learnflow` | 2.9M | PHP 8.3 + 6 条 crontab | rsync + crontab + 数据目录 |
| 6 | UserLoop / inFlow | `/www/wwwroot/userloop` / `inflow` | 40M / 118M | 反代 :8600 / :8400 | rsync + 对应进程 |
| 7 | KB 子站 | `/www/wwwroot/kb.nownexts.com` | 16K | Apache vhost + 独立证书 | rsync + vhost + cert |
| 8 | V2HTML / thirdc | `/www/wwwroot/V2HTML` / `thirdc` | 266M / **3.9G** | 静态/媒体为主 | rsync -a(3.9G 走 screen/tmux 防断) |
| — | 数据库 | MySQL + MongoDB + Redis | — | 宝塔管理 | **mysqldump / mongodump / redis SAVE 后拷 dump.rdb** |
| — | 证书 | `vhost/cert/` 8 张 | — | — | 整目录拷贝(Let's Encrypt 证书可续期,续期任务重建) |
| — | crontab | 10+ 条(OpenFlow 心跳/ PayFlow/ LearnFlow…) | — | root crontab | `crontab -l > /root/crontab.bak` 迁移后逐条恢复 |

## 三、第 0 步:KiwiVM API 快照(所有动作的前提)

搬瓦工 KiwiVM API 只做**带外管理**(快照/重启/流量),没有防火墙与扩容 —— 够用,且是回滚保险的唯一来源。

1. 面板(kiwidemo / bandwagonhost)→ KiwiVM → API,取 `VEID` 与 `API_KEY`
2. 存本地 `~/.kiwivm.env`(**不进 git**):
   ```bash
   export KIWI_VM_ID="<VEID>"; export KIWI_API_KEY="<KEY>"
   ```
3. 快照脚本 `scripts/kiwi-snapshot.sh`(迁移前、每完成一批服务后各打一次):
   ```bash
   #!/usr/bin/env bash
   source ~/.kiwivm.env
   curl -s "https://api.kiwivm.64clouds.com/v1/execShot?veid=${KIWI_VM_ID}&api_key=${KIWI_API_KEY}"
   ```
   恢复 = 面板 → Restore snapshot(或 API `execRestore`)。

## 四、执行序列(每步含验证)

### 阶段 A · 准备(旧机,不停机)

```bash
# A1 快照(见第 0 步)
# A2 数据库全量导出(热备,不停机)
mysqldump -uroot -p --all-databases --single-transaction --routines > /root/db-all.sql
mongodump --out /root/mongo-dump
redis-cli SAVE && cp /var/lib/redis/dump.rdb /root/redis.rdb   # 路径以宝塔实际为准
# A3 crontab 与配置备份
crontab -l > /root/crontab.bak
tar czf /root/apache-vhost.tgz -C /www/server/panel/vhost apache
tar czf /root/certs.tgz -C /www/server/panel/vhost cert
# A4 把 A2/A3 产物打包拉回本地或直接 scp 到新机
```

### 阶段 B · 新机初始化(搬瓦工重装为 Debian 12)

```bash
# B1 KiwiVM → Reinstall → Debian 12 x86_64;重置 SSH key/端口
# B2 基础
apt update && apt -y upgrade && apt -y install curl git screen rsync
# B3 宝塔(装 LNMP:Nginx 按需、Apache 2.4、PHP 8.3、MySQL、phpMyAdmin)
curl -sSO https://raw.githubusercontent.com/8838/btpanel-v7.7/main/install/install_panel.sh && bash install_panel.sh
# B4 Node 22(Debian 12 原生支持 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
node -v   # 验证: v22.x
npm i -g pm2@6
# B5 固化运行时版本(开发/生产对齐)
echo 22 > /www/wwwroot/websflow/api/.nvmrc
```

### 阶段 C · 数据与代码回放(新机)

```bash
# C1 数据库恢复
mysql -uroot -p < /root/db-all.sql
mongorestore /root/mongo-dump
cp /root/redis.rdb /var/lib/redis/dump.rdb && systemctl restart redis
# C2 代码:GitHub 为主、rsync 补运行时资产
git clone git@github.com:sevenaaaaaaaaa/websflow.git /www/wwwroot/websflow
#   GitHub 不含的运行时文件从旧机 tar 包补:
#   api/websflow.db* / api/payflow-config.json / api/commerce-config.json / api/notify-config.json / .well-known/
rsync -a /root/sites/nownexts_com/ /www/wwwroot/nownexts_com/   # 其余站点同理(见第二节表)
# C3 Apache vhost + 证书原样恢复,宝塔里核对站点列表
tar xzf /root/apache-vhost.tgz -C /www/server/panel/vhost/
tar xzf /root/certs.tgz -C /www/server/panel/vhost/
# C4 crontab 逐条恢复
crontab /root/crontab.bak
```

### 阶段 D · 服务拉起与逐站验证

```bash
# D1 WebsFlow
cd /www/wwwroot/websflow/api && npm ci --omit=dev && pm2 start server.js --name websflow-api && pm2 save
# D2 MFlow / UserLoop / inFlow 进程按各自方式拉起(反代 :8088 / :8600 / :8400)
# D3 切 DNS:A 记录指向新 IP(或 Cloudflare 改源站 IP)—— TTL 先调到 300
```

**验证清单(每站一条,全绿才算完)**:

```bash
curl -sI https://nownexts.com/ | head -1                          # OpenFlow 主站 200
curl -s https://nownexts.com/api/cron.php?secret=<SECRET>         # 心跳 200
curl -sI https://nownexts.com/webflow/p/2a94240d8a58 | head -1    # WebsFlow SSR 200
curl -s http://127.0.0.1:8088/ -o /dev/null -w '%{http_code}\n'   # MFlow 200
curl -s https://nownexts.com/payflow/api/v1/ping 2>/dev/null      # PayFlow(以其实际健康路由为准)
php -r 'new PDO("mysql:host=127.0.0.1;dbname=<payflow_db>","<u>","<p>");' && echo DB_OK
```
另:后台登录 WebsFlow 控制台下一笔测试年付订单走沙箱/1 分钱验证 PayFlow→entitlements 链路;检查 LearnFlow 的 6 条 crontab 首轮执行日志。

### 阶段 E · 收尾

```bash
# E1 新机再做一次快照(干净基线)
# E2 旧系统保留 72 小时不销毁(仅停 Apache/Node,防双源写库)
# E3 观察一周:pm2 logs、/www/wwwlogs 错误日志、GSC 收录无异常
```

## 五、IPv6 / Cloudflare(迁移完成后做)

服务器已有原生 IPv6 全局地址。推荐顺序:
1. 域名 NS 迁到 **Cloudflare**(免费版):自动获得 v6 边缘 + CC 防护 + 静态缓存;源站只需在面板加 AAAA 或开启"源站 v6"
2. 若不进 CF:DNS 加 AAAA 记录,并在宝塔 Apache 监听 `[::]:80/443`
3. 验证:`dig AAAA nownexts.com +short` 与 `curl -6 -sI https://nownexts.com/ | head -1`
4. 收益:移动网络(尤其国内运营商)v6 可达性 + 免费防护层;对投放页是真实加分

## 六、风险与回滚

| 风险 | 缓解 |
|---|---|
| 迁移中数据双写 | 旧机先停写(停 Apache+pm2)再做最终 db 增量;窗口内只读 |
| 证书续期任务丢失 | 迁移后手动跑一次续期,确认 cron 存在 |
| 遗漏隐藏服务 | 以 `pm2 list` + `ps aux` + `ss -tlnp` 三份快照为准,迁移前存档 |
| 失败回滚 | KiwiVM 快照一键还原旧系统;DNS TTL 300 内可回切 |

## 七、执行检查单(打勾用)

- [ ] KiwiVM API Key 存本地并试打快照
- [ ] `ss -tlnp` / `ps aux` / `pm2 list` 三份服务快照存档
- [ ] A2 数据库导出完成并校验(行数抽查)
- [ ] 搬瓦工重装 Debian 12
- [ ] 宝塔 + PHP 8.3 + Node 22 + pm2 就位
- [ ] MySQL/Mongo/Redis 恢复并 PDO/驱动连通
- [ ] 十个站点代码落位 + 运行时配置补齐
- [ ] vhost + 8 证书恢复,httpd -t 通过
- [ ] crontab 10+ 条恢复
- [ ] 验证清单全绿(含测试年付订单)
- [ ] DNS 切换 + 观察期
- [ ] 新机干净快照 + 旧系统 72h 保留
- [ ] (可选)Cloudflare 接入 + AAAA
