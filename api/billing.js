/* ============================================================
 * WebsFlow · 计费路由 (billing.js)
 * GET  /api/billing/me       套餐 / 余额 / 用量
 * POST /api/billing/redeem   激活码兑换(Pro 或余额)
 * GET  /api/billing/orders   我的订单
 * GET  /api/billing/earnings 我作为模板作者的收益
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const payflow = require('../lib/payflow');
const { applyPaidOrder } = require('../lib/billing-apply');
const reconcile = require('../lib/reconcile');
const commerce = require('../lib/commerce');
const weeklyReport = require('../lib/weekly-report');
const { adminOnly } = require('../auth');

router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.findUserById(req.user.id);
    const plan = db.getUserPlan(req.user.id);
    const usage = db.getUsage(req.user.id);
    res.json({ plan, usage, balance: user.balance || 0, plan_expires_at: user.plan_expires_at || null });
  } catch (e) {
    console.error('套餐查询失败:', e);
    res.status(500).json({ error: '查询失败' });
  }
});

router.post('/redeem', authMiddleware, (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: '请输入激活码' });
    const r = db.redeemCode(req.user.id, code);
    if (r.error) return res.status(400).json({ error: r.error });
    const user = db.findUserById(req.user.id);
    const plan = db.getUserPlan(req.user.id);
    res.json({
      message: r.kind === 'pro' ? `已开通${plan.name}` : `余额已充值 ¥${r.value}`,
      kind: r.kind, value: r.value, plan, balance: user.balance || 0,
    });
  } catch (e) {
    console.error('兑换失败:', e);
    res.status(500).json({ error: '兑换失败' });
  }
});

// 在线支付:商品目录(Pro 订阅 + 余额档位)
router.get('/catalog', authMiddleware, (req, res) => {
  const map = payflow.productMap();
  const items = [
    { id: map.pro_monthly, kind: 'pro', name: '专业版 · 月付', amount_cents: 3900, days: 30, note: '无限云端项目 · 去角标 · AI 200 次/日' },
    { id: map.balance_1000, kind: 'balance', name: '余额充值 ¥10', amount_cents: 1000 },
    { id: map.balance_5000, kind: 'balance', name: '余额充值 ¥50', amount_cents: 5000 },
    { id: map.balance_10000, kind: 'balance', name: '余额充值 ¥100', amount_cents: 10000 },
  ].filter((x) => x.id);
  const ch = payflow.readChannels();
  res.json({ catalog: items, configured: !!payflow.loadConfig(), channels: ch.enabled, auto: ch.auto });
});

// 在线支付:创建订单并返回支付链接
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { product_id, kind } = req.body || {};
    const cfgOk = !!payflow.loadConfig();
    if (!cfgOk) return res.status(503).json({ error: '收款服务未配置' });
    const map = payflow.productMap();
    const productId = product_id || (kind === 'pro' ? map.pro_monthly : null);
    if (!productId) return res.status(400).json({ error: '缺少商品' });
    const user = db.findUserById(req.user.id);
    // 委派模式:把买家的邀请人 PayFlow 推荐码传给 PayFlow,佣金由其原生计提
    let referralCode = '';
    if (commerce.isDelegated()) {
      const referrer = user.referred_by ? db.findUserById(user.referred_by) : null;
      if (!referrer) referralCode = '';
      else if (referrer.payflow_ref_code) referralCode = referrer.payflow_ref_code;
      else {
        const ensured = await commerce.ensureReferral(referrer);
        referralCode = (ensured && ensured.referral && ensured.referral.code) || '';
      }
    }
    const r = await payflow.createCheckout(productId, user.email, user.display_name || user.username, 'manual', referralCode);
    const kindResolved = kind || (productId === map.pro_monthly ? 'pro' : 'balance');
    db.createPayflowOrder(r.order_no, req.user.id, kindResolved, productId, r.amount_cents, r.pay_url);
    res.json({ order_no: r.order_no, pay_url: r.pay_url, amount_cents: r.amount_cents, kind: kindResolved });
  } catch (e) {
    console.error('创建支付订单失败:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 订单状态(本地映射 + 必要时向 PayFlow 查询)
router.get('/checkout/:orderNo', authMiddleware, async (req, res) => {
  try {
    const row = db.getPayflowOrder(req.params.orderNo);
    if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: '订单不存在' });
    let status = row.status;
    if (status === 'created') {
      try {
        const remote = await payflow.getOrder(row.order_no);
        if (remote && (remote.status === 'paid' || remote.status === 'delivered')) {
          // 兜底:远端已支付但回调未到
          applyPaidOrder(row.order_no);
          status = 'paid';
        }
      } catch (e) { /* 忽略,保持本地状态 */ }
    }
    const user = db.findUserById(req.user.id);
    res.json({ status, kind: row.kind, amount_cents: row.amount_cents, balance: user.balance || 0, plan: db.getUserPlan(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 我的支付订单
router.get('/payflow-orders', authMiddleware, (req, res) => {
  try {
    res.json({ orders: db.getUserPayflowOrders(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 对账:管理员手动触发 / 查看最近结果
router.post('/reconcile/run', authMiddleware, adminOnly, async (req, res) => {
  try {
    const report = await reconcile.run();
    res.json({ message: '对账完成', report });
  } catch (e) {
    console.error('对账失败:', e);
    res.status(500).json({ error: '对账失败' });
  }
});

// 渠道周报:查看 / 生成并推送
router.get('/weekly', authMiddleware, adminOnly, (req, res) => {
  try {
    const reports = db.getWeeklyReports();
    const current = weeklyReport.build(db.weekKey(0));
    res.json({ reports, current, preview: weeklyReport.render(current) });
  } catch (e) {
    console.error('周报查询失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

router.post('/weekly/run', authMiddleware, adminOnly, (req, res) => {
  try {
    const r = weeklyReport.generate((req.body && req.body.period) || undefined);
    res.json({ message: r.skipped ? '该周周报已存在' : '周报已生成并推送', result: r });
  } catch (e) {
    console.error('周报生成失败:', e);
    res.status(500).json({ error: '生成失败' });
  }
});

router.get('/reconcile/last', authMiddleware, adminOnly, (req, res) => {
  try { res.json({ report: db.getLastReconcile() }); } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

router.get('/orders', authMiddleware, (req, res) => {
  try {
    res.json({ orders: db.getUserOrders(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

router.get('/earnings', authMiddleware, (req, res) => {
  try {
    res.json({ earnings: db.getEarnings(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
