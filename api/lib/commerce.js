/* ============================================================
 * WebsFlow · 商业能力委派层 (commerce.js)
 *
 * 背景:收款/订阅/会员权益/推荐佣金/提现 属于 PayFlow 的领域。
 * WebsFlow 只应做「页面 → 投放 → 数据」;商业能力一律**委派**。
 *
 * 模式:api/commerce-config.json → { "delegate": true }
 *   - delegate=true :会员、佣金、提现读写全部走 PayFlow API
 *   - delegate=false:回退到 WebsFlow 本地实现(旧行为,兼容/离线)
 * 映射:WebsFlow 用户 ↔ PayFlow 客户(email)与推荐(email→referral)
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const payflow = require('./payflow');

const CFG = path.join(__dirname, '..', 'commerce-config.json');

function config() {
  let c = {};
  try { if (fs.existsSync(CFG)) c = JSON.parse(fs.readFileSync(CFG, 'utf8')) || {}; } catch (e) {}
  return Object.assign({ delegate: true, minPayoutCents: 10000 }, c);
}

function isDelegated() {
  return !!config().delegate;
}

// 保证用户在 PayFlow 侧有推荐身份(返回 referral + code),并本地留映射
async function ensureReferral(user) {
  try {
    const r = await payflow.request('GET', '/api/v1/referrals/' + encodeURIComponent(user.email));
    const code = r && r.referral && r.referral.code;
    if (code && user.payflow_ref_code !== code) db.setPayflowRefCode(user.id, code);
    return r;
  } catch (e) {
    console.warn('[commerce] ensureReferral 失败:', e.message);
    return null;
  }
}

async function dashboard(user) {
  try {
    const r = await payflow.request('GET', '/api/v1/referrals/' + encodeURIComponent(user.email));
    return r || null;
  } catch (e) { return null; }
}

async function entitlement(user) {
  try {
    const r = await payflow.request('GET', '/api/v1/entitlements', null, 'email=' + encodeURIComponent(user.email));
    return r || null;
  } catch (e) { return null; }
}

async function requestPayout(user, amountCents, method, account, note) {
  return await payflow.request('POST', '/api/v1/payouts', {
    email: user.email, amount_cents: amountCents, method: method || 'manual', account: account || '', note: note || '',
  });
}

async function payouts(user) {
  try {
    const r = await payflow.request('GET', '/api/v1/payouts', null, 'email=' + encodeURIComponent(user.email));
    return (r && r.payouts) || [];
  } catch (e) { return []; }
}

// 结算该用户邀请人的佣金:委派模式下由 PayFlow 在支付成功时按 referral 自动计提
function referralCodeForCheckout(buyer) {
  try {
    if (!buyer || !buyer.referred_by) return '';
    const referrer = db.findUserById(buyer.referred_by);
    return (referrer && referrer.payflow_ref_code) || '';
  } catch (e) { return ''; }
}

module.exports = { config, isDelegated, ensureReferral, dashboard, entitlement, requestPayout, payouts, referralCodeForCheckout };
