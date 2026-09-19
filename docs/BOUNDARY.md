# 产品边界与委派矩阵（WebsFlow × PayFlow）

> 结论:收款 / 订阅 / 会员权益 / 推荐佣金 / 提现 **属于 PayFlow 的领域**,
> WebsFlow 只负责「页面创建 → 投放 → 数据 → 千人千面」。
> 之前 WebsFlow 自建了一套商业账本(balance/plan/commission/payout/settlement/reconcile),
> 现改为**委派 PayFlow**,本地表仅作镜像与离线回退。

## 一、能力归属

| 能力 | 领域归属 | WebsFlow 现状 | 处理 |
|------|----------|---------------|------|
| 收款下单 / 收银台 / 支付通道 | PayFlow | 已委派(API v1 checkout + Webhook) | 保持 |
| 订单查询 / 退款 | PayFlow | 已委派(order get + refunded webhook) | 保持 |
| **会员权益 / 订阅** | PayFlow | 本地 plan/grace 自建 | **改读 PayFlow entitlements/subscriptions** |
| **推荐关系 / 佣金计提** | PayFlow | 本地 referral/commission/tiers | **结账透传 referral,由 PayFlow 计提** |
| **提现(申请/审核/打款)** | PayFlow | 本地 payouts + 风控 | **改走 PayFlow payouts API** |
| 余额 / 钱包 | PayFlow(无此概念) | 本地 balance | WebsFlow 侧仅保留"站内消费额度"(模板/插件),不承担提现 |
| 模板/插件市场售卖与分成 | WebsFlow(市场) | 本地 70/30 分账 | 保留(可用"卖家作为推荐人"由 PayFlow 计提,后续) |
| 结算单 / 周报 / 对账 | 报表层 | 本地 | 作为 **PayFlow 数据的报告层**保留;对账仅针对本地镜像订单 |
| 页面创建 / 模块 / 模板内容 / 插件区块 | WebsFlow | 自建 | 保持 |
| AI 生成 / Copilot / 巡检 | WebsFlow | 自建 | 保持 |
| 托管发布 / 转化埋点 / A/B / 千人千面 | WebsFlow | 自建 | 保持 |

## 二、委派开关

`api/commerce-config.json`:

```json
{
  "delegate": true,
  "minPayoutCents": 10000
}
```

- `delegate: true`(默认):会员/佣金/提现走 PayFlow;`creditReferral()` 不再本地记账
- `delegate: false`:回退本地实现(离线/兼容)

## 三、PayFlow 侧已开放的 v1 接口(本次新增)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/v1/referrals/{email}` | 推荐身份/佣金汇总/可提现/邀请链接 |
| GET | `/api/v1/entitlements?email=` | 会员等级 + 权益 + 订阅 |
| GET | `/api/v1/payouts?email=` | 提现记录 |
| POST | `/api/v1/payouts` | 申请提现(按其最低额度与风控) |
| POST | `/api/v1/payouts/{id}/action` | approve / reject / pay |

签名注意:HMAC 的 PATH **不含查询串**(`/payflow/api/v1/...`)。

## 四、WebsFlow 侧改动

- `api/lib/commerce.js`:委派适配层(ensureReferral / dashboard / entitlement / requestPayout / payouts)
- `api/lib/payflow.js`:支持查询串(签名仍只含 Path);`createCheckout` 支持 `referral`
- `/api/billing/checkout`:委派模式下把买家邀请人的 **PayFlow 推荐码**透传,佣金由 PayFlow 原生计提
- `/api/referral/me`:返回 `payoutMode` 与 `payflow`(dashboard/可提现/邀请链接)
- `/api/referral/payout`:委派模式走 PayFlow,本地仅镜像记录用于展示
- `creditReferral()`:委派模式短路(避免双记)

## 五、迁移状态(3.5.0 收口完成)

- ✅ 下单/回调、会员与佣金读取、提现委托(PayFlow payout)、结账透传推荐码、委派开关
- ✅ **本地 balance 语义收口**:改称「站内额度」,仅用于购买模板/插件;提现由 PayFlow 结算(可提现额来自 PayFlow)
- ✅ **结算单/周报纳入 PayFlow 口径**:周报附其 analytics summary(GMV/AOV/转化/漏斗),预览与生成一致
- ✅ **阶梯返佣交回 PayFlow**:委派模式不再本地计提与计率,费率显示 PayFlow 配置
- ✅ **对账数据源收口**:仅走 PayFlow 订单 API;文件降级需显式开启 `allowFileFallback`
- ⚠️ 已知:PayFlow 已切 MySQL,任何绕过其 API 的直读(文件/库)都不再可靠 —— 消费方一律走 API
