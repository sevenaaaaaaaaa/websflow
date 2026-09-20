/* ============================================================
 * WebsFlow · 升级要约 (upgrade.js)
 * 配额闸门与设置页共用同一份可核验对比,不写"无限/极速"。
 * ============================================================ */
const payflow = require('./payflow');
const { PRODUCTS } = require('./products');

const COMPARE = [
  { feature: '云端项目', free: '3', pro: '100' },
  { feature: '已发布页面', free: '1', pro: '50' },
  { feature: 'AI 出页 / 日', free: '20', pro: '200' },
  { feature: '托管页角标', free: '有', pro: '无' },
  { feature: '千人千面', free: '可用', pro: '可用' },
];

function offer(reason) {
  const map = payflow.productMap() || {};
  const yearlyOn = !!map.pro_yearly;
  return {
    reason: reason || 'quota',
    monthly: { key: 'pro_monthly', id: map.pro_monthly || null, ...PRODUCTS.pro_monthly },
    yearly: { key: 'pro_yearly', id: map.pro_yearly || null, live: yearlyOn, ...PRODUCTS.pro_yearly },
    compare: COMPARE,
    copy: yearlyOn
      ? '专业版月付 ¥39,年付 ¥390(约 2 个月免费)。一次付清,全年投放不断档。'
      : '专业版月付 ¥39。年付即将上架。',
  };
}

function deny(code, error, reason) {
  return { ok: false, code, error, quota: true, upgrade: offer(reason) };
}

module.exports = { COMPARE, offer, deny };
