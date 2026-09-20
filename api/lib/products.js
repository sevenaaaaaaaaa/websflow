/* ============================================================
 * WebsFlow · 商品目录单一真源 (products.js)
 * 目录展示 / checkout 判定 / 入账天数统一读这里;
 * PayFlow 侧只保存"商品ID映射"(payflow-config.json → products)。
 * 映射不存在的商品不会出现在目录,也无法下单(灰度上线,天然开关)。
 * ============================================================ */

const PRODUCTS = {
  pro_monthly: { kind: 'pro', name: '专业版 · 月付', amount_cents: 3900, days: 30, note: '无限云端项目 · 去角标 · AI 200 次/日' },
  pro_yearly: { kind: 'pro', name: '专业版 · 年付', amount_cents: 39000, days: 365, note: '一次付清,全年投放不断档(约 2 个月免费)' },
  balance_1000: { kind: 'balance', name: '余额充值 ¥10', amount_cents: 1000 },
  balance_5000: { kind: 'balance', name: '余额充值 ¥50', amount_cents: 5000 },
  balance_10000: { kind: 'balance', name: '余额充值 ¥100', amount_cents: 10000 },
};

// 由 PayFlow 商品ID 反查本地定义(未收录的商品返回 null → 目录隐藏 + 拒绝下单)
function findByPayflowId(payflowProductId, productMap) {
  const key = Object.keys(productMap || {}).find((k) => productMap[k] === payflowProductId);
  return key ? { key, ...PRODUCTS[key] } : null;
}

module.exports = { PRODUCTS, findByPayflowId };
