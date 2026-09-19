# 支付凭据接入指南（PayFlow → 全自动收款）

> 现状:WebsFlow 已完整接入 PayFlow 收款(下单 → 收银台 → Webhook → 自动开通/入账)。
> 当前 PayFlow 仅启用了 `manual`(人工确认到账)通道 —— 买家支付后由运营在 PayFlow 后台点「确认到账」,
> Webhook 触发后 WebsFlow **自动开通权益**,无需人工在 WebsFlow 侧操作。
>
> 补齐支付宝或微信商户凭据后,将**全自动到账**,WebsFlow 代码**无需改动**(渠道自动探测并优先使用)。

## 一、需要准备的凭据

### 支付宝（当面付 · 扫码）
| 字段 | 说明 |
|------|------|
| `app_id` | 支付宝开放平台应用 APPID |
| `private_key` | 应用私钥（PKCS8, PEM 内容或路径） |
| `alipay_public_key` | 支付宝公钥（用于回调验签） |
| `notify_url` | `https://nownexts.com/payflow/notify/alipay` |

### 微信支付（Native · 扫码）
| 字段 | 说明 |
|------|------|
| `mch_id` | 商户号 |
| `app_id` | 关联的公众号/小程序 APPID |
| `serial_no` | 商户 API 证书序列号 |
| `private_key` | 商户 API 私钥（apiclient_key.pem） |
| `api_v3_key` | APIv3 密钥（32 位） |
| `platform_cert` | 微信支付平台证书 |
| `notify_url` | `https://nownexts.com/payflow/notify/wechat` |

## 二、一次性配置（服务器）

编辑 `/www/wwwroot/payflow/data/config.json`，在 `channels` 下补充（字段名与 PayFlow 适配层一致）：

```json
{
  "channels": {
    "manual": { "enabled": true },
    "alipay": {
      "enabled": true,
      "app_id": "2021xxxxxxxxxxxx",
      "private_key": "MIIEv...（应用私钥）",
      "alipay_public_key": "MIIBIjAN...（支付宝公钥）",
      "notify_url": "https://nownexts.com/payflow/notify/alipay"
    },
    "wechat": {
      "enabled": true,
      "mch_id": "16xxxxxxxx",
      "app_id": "wxxxxxxxxxxxxxxxxx",
      "serial_no": "4F3A...",
      "api_v3_key": "32位APIv3密钥",
      "private_key": "-----BEGIN PRIVATE KEY-----...",
      "platform_cert": "-----BEGIN CERTIFICATE-----...",
      "notify_url": "https://nownexts.com/payflow/notify/wechat"
    }
  }
}
```

保存即生效（PayFlow 每次请求读取配置，无需重启）。

## 三、验证

```bash
# 1. 渠道是否被识别(WebsFlow 侧)
curl -s https://nownexts.com/webflow/api/billing/catalog -H "Authorization: Bearer <TOKEN>"
# → channels: ["manual","alipay"] , auto: true

# 2. 下一单,应直接跳到支付宝/微信扫码页
curl -s -X POST https://nownexts.com/webflow/api/billing/checkout \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"kind":"pro"}'
# → pay_url 指向 /payflow/pay/<token>,渠道为自动通道

# 3. 真实支付后,Webhook 会打到
#    https://nownexts.com/webflow/api/webhooks/payflow
#    日志可见: [webhook] order.paid PFxxxx applied pro
```

## 四、WebsFlow 侧已就绪的部分（无需改动）

- 商品：专业版月付 ¥39（订阅）、余额充值 ¥10/50/100
- 订单映射表 `payflow_orders`（order_no ↔ 用户 ↔ 权益）
- 回调验签：`hex HMAC-SHA256(webhook_secret, rawBody)`，timing-safe，幂等
- 入账：Pro 开通/续期 30 天（从较晚的到期时间起算）；余额入账
- 退款回调：`order.refunded` → 标记并通知
- 渠道自动探测：`api/lib/payflow.js → readChannels()/pickChannel()`
- 分销：被邀请人付费 → 邀请人佣金入余额（订阅/充值 10%，模板/插件 5%）

## 五、常见问题

- **为什么现在是人工确认？** 因为线上 `config.json` 里没有任何支付渠道凭据，PayFlow 回退到 `manual`。
- **凭据放哪里最安全？** 只放服务器的 `payflow/data/config.json`（已被 PayFlow 的 `.htaccess` 禁止外部访问）；
  WebsFlow 的 `api/payflow-config.json` 只保存 API Key 与 Webhook Secret。
- **手续费与结算**：由支付宝/微信商户后台结算到绑定账户；PayFlow 仅做订单与权益编排。
