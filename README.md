# WebsFlow 魔块 · 面向投放的落地页工场

> 单页 · 数据 · 千人千面 · 模块化 · H5。
> 零依赖前端可双击 `index.html` 使用;登录后走云端同步与托管发布。

**当前版本 4.38.0** · 在线: https://nownexts.com/webflow/ · 后台: /webflow/#/console

规划真源:[docs/PRODUCT-PLAN.md](docs/PRODUCT-PLAN.md) · 定价:[docs/PRICING.md](docs/PRICING.md) · 边界:[docs/BOUNDARY.md](docs/BOUNDARY.md) · 定位:[POSITIONING.md](POSITIONING.md)

## 现在能做什么

- **出页**:43 模块、布局变体、行业成品模板(增长漏斗 / 活动 H5 / 电商 / 教育 / 餐饮 / 作品集 / 到店 / 健康 / 空间 / 课程招生)、生产流水线(故事线 → A/B → 质检 → 交付包)
- **投放**:托管 SSR(`/p/<token>`)、单文件导出、千人千面、页面侧自动化旅程
- **数据**:转化看板、分群归因、A/B、增长 Agent(人审 + 风控)、目标编排、端到端轨迹
- **商业化**:free / pro 月付 ¥39 / 年付 ¥390(PayFlow 收款);配额闸门带可核验升级对比
- **平台**:工具 API + MCP、能力目录、经验库、跨系统人审动作(OpenFlow / PayFlow)

明确不做:全站 CMS、CRM/电商业务系统、重型运维后台。收款归 PayFlow,线索档案归 OpenFlow。

## 一分钟上手

```bash
open index.html
# 或
python3 -m http.server 8080
```

1. 选行业模板或空白页
2. 画布改文案,左侧拖模块
3. 登录后「同步 / 发布」,得到 `https://nownexts.com/webflow/p/<token>`

## 开发纪律(本地线)

- 服务器 `/www/wwwroot/websflow` 是代码真源;本目录是镜像、规划与核查
- 不并行改同一文件;回写服务器前先核对远端 VERSION
- 每周 1–2 个带完整 CHANGELOG 的批次版本
- `node_modules`、运行时 db、日志、`payflow-config.json` 不入库
