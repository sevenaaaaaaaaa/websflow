/* ============================================================
 * PayFlow · 商业变现引擎接入 (payflow.js)
 *
 * 矩阵内收款引擎(https://nownexts.com/payflow):
 *   - 出站:HMAC-SHA256(timestamp\nMETHOD\nPATH\nBODY),头 X-PF-Key/X-PF-Timestamp/X-PF-Signature
 *   - 入站 Webhook:hex HMAC-SHA256(secret, rawBody) → X-PayFlow-Signature
 * 凭据来源:api/payflow-config.json(服务器侧，不入库)
 * ============================================================ */
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'payflow-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.warn('[payflow] 配置读取失败:', e.message);
  }
  return null;
}

// 渠道探测:读取同机 PayFlow 配置(同服务器可直接读文件),判断可用通道
function readChannels() {
  const candidates = [
    '/www/wwwroot/payflow/data/config.json',
    path.join(__dirname, '..', 'payflow-channels.json'),
  ];
  for (const f of candidates) {
    try {
      if (!fs.existsSync(f)) continue;
      const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
      const ch = cfg.channels || {};
      const enabled = Object.keys(ch).filter((k) => ch[k] && ch[k].enabled);
      if (enabled.length) return { enabled, auto: enabled.some((k) => k !== 'manual') };
    } catch (e) {}
  }
  return { enabled: ['manual'], auto: false };
}

// 自动选择:有自动通道(支付宝/微信/加密)优先,否则 manual
function pickChannel(preferred) {
  const { enabled } = readChannels();
  if (preferred && enabled.includes(preferred)) return preferred;
  return enabled.find((k) => k !== 'manual') || 'manual';
}

function request(method, apiPath, body, query) {
  const cfg = loadConfig();
  if (!cfg || !cfg.key_id) return Promise.reject(new Error('PayFlow 未配置(缺少 payflow-config.json)'));
  const base = new URL(cfg.base_url);
  const signPath = (cfg.base_path || '') + apiPath;           // 签名:含挂载前缀,不含查询串
  const fullPath = signPath + (query ? '?' + query : '');     // 请求:可带查询串
  const rawBody = body ? JSON.stringify(body) : '';
  const ts = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', cfg.secret)
    .update(ts + '\n' + method + '\n' + signPath + '\n' + rawBody)
    .digest('hex');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: base.hostname,
      port: base.port || 443,
      path: fullPath,                 // 对外路径同样含挂载前缀
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-PF-Key': cfg.key_id,
        'X-PF-Timestamp': String(ts),
        'X-PF-Signature': signature,
        ...(rawBody ? { 'Content-Length': Buffer.byteLength(rawBody) } : {}),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) {}
        if (res.statusCode >= 200 && res.statusCode < 300 && json) return resolve(json);
        reject(new Error((json && (json.error || json.reason)) || ('PayFlow HTTP ' + res.statusCode)));
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('PayFlow 请求超时')));
    if (rawBody) req.write(rawBody);
    req.end();
  });
}

// 创建订单,返回 { order_no, pay_url, amount_cents }
async function createCheckout(productId, email, name, channel, referral) {
  const r = await request('POST', '/api/v1/checkout', {
    product: productId, email, name, channel: pickChannel(channel),
    ...(referral ? { referral } : {}),
  });
  return { order_no: r.order.order_no, pay_url: r.pay_url, amount_cents: r.order.amount_cents, status: r.order.status, order: r.order };
}

async function getOrder(orderNo) {
  const r = await request('GET', '/api/v1/orders/' + encodeURIComponent(orderNo));
  return r.order;
}

// Webhook 验签(timing-safe,必须用原始 body)
function verifyWebhook(rawBody, signature) {
  const cfg = loadConfig();
  if (!cfg || !cfg.webhook_secret || !signature) return false;
  const expected = crypto.createHmac('sha256', cfg.webhook_secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch (e) {
    return false;
  }
}

function productMap() {
  const cfg = loadConfig();
  return (cfg && cfg.products) || {};
}

module.exports = { loadConfig, request, createCheckout, getOrder, verifyWebhook, productMap, readChannels, pickChannel };
