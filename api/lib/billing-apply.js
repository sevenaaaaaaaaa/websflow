/* ============================================================
 * WebsFlow · 支付入账 (billing-apply.js)
 * PayFlow 订单确认到账后的权益发放(幂等)
 *   - pro     → 开通/续期 30 天
 *   - balance → 余额入账
 * ============================================================ */
const db = require('../db');
const { notify } = require('./notify');
const { creditReferral } = require('./referral');

function applyPaidOrder(orderNo) {
  const r = db.applyPayflowOrder(orderNo);
  if (!r.ok) return r;
  if (r.already) return r;
  if (r.kind === 'pro') {
    db.grantPlan(r.userId, 30);
    notify(r.userId, 'sale', '专业版已开通 30 天', `支付订单 ${orderNo} 已确认到账`, '#/console');
    creditReferral(r.userId, r.amount_cents || 3900, 'pro', orderNo);
  } else {
    const amount = (r.amount_cents || 0) / 100;
    db.addBalance(r.userId, amount);
    notify(r.userId, 'sale', `余额充值已到账 ¥${amount.toFixed(2)}`, `支付订单 ${orderNo}`, '#/console');
    creditReferral(r.userId, r.amount_cents || 0, 'balance', orderNo);
  }
  return r;
}

function applyRefundedOrder(orderNo) {
  const row = db.getPayflowOrder(orderNo);
  if (!row) return { ok: false };
  db.markPayflowRefunded(orderNo);
  notify(row.user_id, 'sale', '订单已退款', `支付订单 ${orderNo} 已退款,权益将按规则回收`, '#/console');
  return { ok: true, userId: row.user_id };
}

module.exports = { applyPaidOrder, applyRefundedOrder };
