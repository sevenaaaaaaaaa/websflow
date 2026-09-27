<div align="center">

# WebsFlow 魔块

**面向投放的落地页工场 —— 单页 · 数据 · 千人千面 · 模块化 · H5**

拖模块、改文案,几分钟得到一个能投广告、能看转化数据的落地页。零依赖前端双击可用;登录后云端同步与托管发布。

[![Version](https://img.shields.io/badge/version-4.38.0-4a6cf7)](CHANGELOG.md)
[![Modules](https://img.shields.io/badge/成品模块-44-1fa971)](#核心能力)
[![Templates](https://img.shields.io/badge/场景模板-13-8b7cf6)](#核心能力)
[![Online](https://img.shields.io/badge/在线版-nownexts.com%2Fwebflow-2f6bff)](https://nownexts.com/webflow/)

[在线使用](https://nownexts.com/webflow/) · [快速上手](#快速上手) · [核心能力](#核心能力) · [定位说明](#定位说明) · [使用指南](#使用指南) · [当前边界](#当前边界)

</div>

---

**文档导航**:规划真源 [docs/PRODUCT-PLAN.md](docs/PRODUCT-PLAN.md) · 定价口径 [docs/PRICING.md](docs/PRICING.md) · 产品边界 [docs/BOUNDARY.md](docs/BOUNDARY.md) · 生态位 [POSITIONING.md](POSITIONING.md) · 变更记录 [CHANGELOG.md](CHANGELOG.md)

## 这是什么

投放的人最懂「快」值多少钱:广告计划已经建好,落地页还没影;或者页面挂上去了,不知道哪个块在转化、哪个人群在看。WebsFlow 就是为这件事造的——**只做单页,把单页做到能直接投放**。它不是全站建站工具,没有多页面站点的复杂度;从打开到产出可投放页面,只需要选模板、改文案、点发布。

打开就是画布:左侧 44 个成品模块(信任、痛点、方法、证明、价格、FAQ、倒计时、热点图……)拖进来,默认文案即可上线,换掉文字就是你的页面。想要更快,直接从 13 套场景模板起步——产品官网、电商、教育、餐饮、作品集、增长漏斗、活动 H5、课程招生、到店服务、健康、空间、品牌故事、融资路演,每套都是完整可投的成品页,配图来自自托管素材库。

页面上线只是开始。发布后每个页面自带转化埋点:点击漏斗、A/B 实验、块级人群定向(新访客 / 老访客 / 登录态 / UTM 来源)都能在数据看板里看到。手机竖版 H5 形态、底部悬浮 CTA、进度叙事,是移动投放的主战场。

适合谁来用:**投放操盘手**(今天建计划今天要有页)、**增长团队**(要数据、要 A/B、要人群分层)、**独立开发者与小店主**(不懂代码,要一个能收线索的页)。如果你要的是长期运营的企业官网和全站 SEO,请用矩阵里的 OpenFlow——那是另一个生态位。

```
选模板/拖模块 → 改文案 → 故事线 → A/B 变体 → 质检 → 交付包
     ↓                                          ↓
  发布托管(/p/<token>)或导出单文件 HTML → 投放
     ↓
  转化埋点 → 看板 / 分群归因 / 千人千面 → 沉淀为模板与模块
```

## 核心能力

- **44 个成品模块,13 套场景模板** — 单一真源契约,默认文案即可上线;8 大分类覆盖落地页叙事全场景
- **生产流水线** — 故事线(信任 → 痛点 → 方法 → 证明 → 行动)→ A/B 变体 → 质检 → 交付包,一条流水线走完
- **托管发布与单文件导出** — 服务端 SSR(`/p/<token>`)或导出零依赖单文件 HTML,自带 Meta / OG / Twitter Card / JSON-LD / 图片懒加载,可直接挂广告平台与社媒分享
- **千人千面** — 块级人群定向:同一页面,新访客看痛点、老访客看优惠、不同 UTM 来源看不同钩子——投放场景的核心武器
- **转化数据回流** — CTA 转化目标、事件埋点、转化看板、分群归因、端到端轨迹;A/B 实验后台直接发布
- **增长 Agent(人审 + 风控)** — 目标编排、页面侧自动化旅程;危险动作必须人审,越界动作按边界委派
- **商业化内建** — 免费版可用;专业版月付 ¥39 / 年付 ¥390(PayFlow 收款),配额闸门带可核验的升级对比,不写「无限」「极速」
- **工具 API + MCP** — 28 组服务端路由 + MCP server(`mcp/websflow-mcp.js`),能力目录、经验库、跨系统人审动作可被 OpenFlow / PayFlow 调用

五大差异化的开发聚焦(详见 [POSITIONING.md](POSITIONING.md)):落地页本身(单页叙事优先)、数据(每页可见的点击漏斗)、千人千面(块级人群定向)、模块化(默认文案即可上线,5 分钟出页)、H5(移动投放主战场);附加优势是**导出即投放**——零依赖单文件 HTML 自带 SEO 与分享元信息。

**定价(2026-09 现行)**

| 档位 | 价格 | 云端项目 | 发布页数 | AI 出页 |
|---|---|---|---|---|
| 免费版 | ¥0 | 3 | 1 | 20 次/日 |
| 专业版 · 月付 | ¥39/月 | 100 | 50 | 200 次/日 |
| 专业版 · 年付 | ¥390/年 | 同专业版 | 同专业版 | 同专业版 |

## 快速上手

**方式一:在线版(推荐,免安装)**

1. 打开 <https://nownexts.com/webflow/>(后台:`/webflow/#/console`)
2. 选行业模板或空白页,画布改文案、左侧拖模块
3. 登录后「同步 / 发布」,得到 `https://nownexts.com/webflow/p/<token>`,拿去投放

**方式二:本地零依赖运行**

```bash
git clone https://github.com/sevenaaaaaaaaa/websflow.git && cd websflow
open index.html          # macOS;Windows 直接双击 index.html
# 或起一个本地服务:
python3 -m http.server 8080
```

前端零依赖、双击可用;API / 托管发布 / 收款接入等云端能力见 [docs/PRODUCT-PLAN.md](docs/PRODUCT-PLAN.md)、[docs/PAYMENT-SETUP.md](docs/PAYMENT-SETUP.md)。

**本地开发纪律**

- 服务器 `/www/wwwroot/websflow` 是代码真源;本目录是镜像、规划与核查,回写前先核对远端 VERSION
- 不并行改同一文件;每周 1–2 个带完整 CHANGELOG 的批次版本
- `node_modules`、运行时 db、日志、`payflow-config.json` 一律不入库

## 定位说明

芭乐派产品矩阵分三层,WebsFlow 属于**第二层:Flow 家族(进阶层)**。

- **OpenFlow = 入口层**:TIPS all-in-one,让一人团队(OPC)与中小团队低门槛完成数字化 + AI 化。
- **Flow 家族 = 进阶层**:MFlow / inFlow / UserLoop / PayFlow / LearnFlow / WebsFlow 按需进阶,各自深耕一个场景。
- **Studio 套件 = 第三层**:偏本地工具的周边产品(ThirdC / V2HTML / InputFlow / ZeroZen 等),长期方向是作为工作台打通所有 Flow 产品。

WebsFlow 在矩阵里的生态位是**投放前线**:OpenFlow 承接全站资产与长期增长,WebsFlow 只做单页投放与快速转化。二者互补不重叠:

| 维度 | OpenFlow | WebsFlow |
|---|---|---|
| 面向场景 | SEO / GEO / 品牌官网 / 全站建站 | 广告投放 / 单一页面 / 转化实验 |
| 目标用户 | 企业站点运营者 / 增长负责人 | 投放操盘手 / 增长团队 / 独立开发者 |
| 交付形态 | 全站系统(长期运营资产) | 单文件 HTML / 托管链接 / H5 页 |
| 时间尺度 | 长期资产与增长复利 | 快速出页与单次转化 |

协同路径:WebsFlow 快速出页 → 投放试验 → 数据回流 → 优质单页沉淀为模板/模块;线索与长期站点交由 OpenFlow 承接(CRM / 自动化 / 全站增长)。导出的单页可直接嵌入 OpenFlow 站点。详见 [POSITIONING.md](POSITIONING.md)。

## 使用指南

完整使用指南见 [docs/USAGE-GUIDE.md](docs/USAGE-GUIDE.md),覆盖:

- 编辑器:模块拖放、布局变体、主题、H5 形态切换
- 出页:模板选型、故事线流水线、A/B 变体与质检交付
- 投放与数据:发布托管、转化目标、看板、分群归因、千人千面规则配置

## 当前边界

- **不做全站**:多页面站点管理、CMS、SEO/GEO 属 OpenFlow;WebsFlow 只做单页,不引入全站复杂度
- **不做业务系统**:CRM / 电商 / 课程 / 社区不做;收款、订阅、佣金、提现已整体委派 PayFlow([docs/BOUNDARY.md](docs/BOUNDARY.md)),线索档案归 OpenFlow
- **后台保持轻量**:只有概览 / 落地页 / 转化 / 人群 / 模块 / 设置,不做重型运维后台
- **本地版只有编辑器**:直接打开 `index.html` 可用全部模块、模板与单文件导出;托管发布、转化数据、千人千面等云端能力需登录在线版或自行部署服务端

## License

本仓库为芭乐派产品矩阵项目,暂未附带开源许可证;引用或二次分发前请先开 Issue 沟通。
