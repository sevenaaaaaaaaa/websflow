/* ============================================================
 * WebsFlow · 支付回调 (webhooks.js)
 * POST /api/webhooks/payflow  ← PayFlow 出站 Webhook(HMAC 验签)
 * 事件:order.paid / order.refunded / subscription.*
 * 幂等:按 order_no 去重
 * ============================================================ */
const express = require('express');
const router = express.Router();
const payflow = require('../lib/payflow');
const { applyPaidOrder, applyRefundedOrder } = require('../lib/billing-apply');

router.post('/payflow', express.raw({ type: '*/*', limit: '256kb' }), (req, res) => {
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body || '');
  const sig = req.get('X-PayFlow-Signature') || '';
  const event = req.get('X-PayFlow-Event') || '';
  if (!payflow.verifyWebhook(raw, sig)) {
    console.warn('[webhook] PayFlow 验签失败', { event, sigLen: sig.length });
    return res.status(401).json({ ok: false, error: 'invalid signature' });
  }
  let payload = {};
  try { payload = JSON.parse(raw); } catch (e) {}
  const data = payload.data || {};
  const orderNo = data.order_no || '';
  const traceId = req.headers['x-trace-id'] || data.trace_id || null;
  if (traceId && orderNo) { try { require('../db').setOrderTrace(orderNo, traceId); } catch (e) {} }
  // 身份打通:支付侧标识(email / 客户 ref)归并到同一个 identity
  let identityId = null;
  try {
    if (data.email || data.customer_ref || data.ref) {
      const idn = require('../lib/identity').resolveIdentity({
        email: data.email, payflow_ref: data.customer_ref || data.ref,
      }, data.email ? { email: data.email } : {});
      identityId = idn && idn.identity ? idn.identity.id : null;
      if (identityId && orderNo) require('../db').setOrderIdentity(orderNo, identityId);
    }
  } catch (e) { console.error('[webhook] 身份归并失败:', e.message); }
  try {
    if (event === 'order.paid' && orderNo) {
      const r = applyPaidOrder(orderNo);
      console.log('[webhook] order.paid', orderNo, r.already ? '(already)' : 'applied', r.kind || '');
    } else if (event === 'order.refunded' && orderNo) {
      applyRefundedOrder(orderNo);
      console.log('[webhook] order.refunded', orderNo);
    } else if (event === 'subscription.renewed') {
      // 续订成功 → 延长 30 天(按 email 定位用户)
      const db = require('../db');
      const u = data.email ? db.findUserByEmail(data.email) : null;
      if (u) {
        db.grantPlan(u.id, 30);
        db.clearGrace(u.id);
        require('../lib/notify').notify(u.id, 'sale', '订阅已续费,专业版延长 30 天', `周期至 ${new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)}`, '#/console');
        console.log('[webhook] subscription.renewed', data.email);
      }
    } else if (event === 'subscription.payment_failed') {
      // 续费失败 → 进入宽限期并提醒
      const db = require('../db');
      const u = data.email ? db.findUserByEmail(data.email) : null;
      if (u) {
        db.startGrace(u.id, 3);
        require('../lib/notify').notify(u.id, 'review', '订阅续费失败,已进入 3 天宽限期', '请检查支付方式或手动续费,宽限期结束将切回免费版', '#/console');
        console.log('[webhook] subscription.payment_failed', data.email);
      }
    } else if (event === 'subscription.canceled') {
      const db = require('../db');
      const u = data.email ? db.findUserByEmail(data.email) : null;
      if (u) {
        db.clearGrace(u.id); // 取消订阅 → 到期即降级(不再宽限)
        require('../lib/notify').notify(u.id, 'review', '订阅已取消', '当前周期结束后将切回免费版,期间权益不受影响', '#/console');
        console.log('[webhook] subscription.canceled', data.email);
      }
    }
  } catch (e) {
    console.error('[webhook] 处理失败:', e.message);
  }
  res.json({ ok: true });
});

module.exports = router;
