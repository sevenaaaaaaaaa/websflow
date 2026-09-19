/* ============================================================
 * WebsFlow · 邀请返佣 (referral routes)
 * GET  /api/referral/me     我的邀请码 / 链接 / 统计
 * POST /api/referral/claim  绑定邀请码(仅首次,不可自邀)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');
const { tierOf, TIERS } = require('../lib/referral');
const { generateSettlements, lastMonthPeriod, renderStatement } = require('../lib/settlement');
const mailer = require('../lib/mailer');
const notifier = require('../lib/notify');
const commerce = require('../lib/commerce');
const { notify } = require('../lib/notify');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const code = db.ensureReferralCode(req.user.id);
    const invited = db.getReferredUsers(req.user.id);
    const earnings = db.getEarnings(req.user.id);
    const { tier, next, need } = tierOf(invited.length);
    const me = db.findUserById(req.user.id);
    const myBalance = me.balance || 0;
    let payflowData = null;
    if (commerce.isDelegated()) {
      try {
        const ensured = await commerce.ensureReferral(me);
        const dash = ensured || await commerce.dashboard(me);
        if (dash) {
          payflowData = {
            code: dash.referral && dash.referral.code,
            summary: dash.summary,
            link: dash.link,
            payouts: (dash.payouts || []).slice(0, 5),
            commissionRate: dash.referral && dash.referral.commission_rate != null ? Number(dash.referral.commission_rate) : null,
          };
        }
      } catch (e) { /* 委派失败 → 前端回退本地数据 */ }
    }
    res.json({
      payoutMode: commerce.isDelegated() ? "payflow" : "local",
      payflow: payflowData,
      code, invited: invited.length, invitedUsers: invited.slice(0, 10), earnings,
      tier: { key: tier.key, name: tier.name, pro: tier.pro, other: tier.other },
      next: next ? { name: next.name, pro: next.pro, other: next.other, need } : null,
      balance: myBalance,
      payouts: db.getPayouts(req.user.id),
      minPayout: 10,
      refVariant: me.ref_variant || "",
      refVariantExp: me.ref_variant_exp || "",
      verified: !!me.verified,
      realName: me.real_name || "",
      phone: me.phone ? String(me.phone).replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") : "",
      risk: Object.assign(db.getRiskConfig(), db.getPayoutRiskSnapshot(req.user.id)),
      settlements: db.getSettlements(req.user.id).slice(0, 12).map((x) => ({ period: x.period, commission: x.data.commission, orders: x.data.orders })),
    });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// 邀请排行榜(前 20,按已邀请人数与佣金)
router.get('/leaderboard', authMiddleware, (req, res) => {
  try {
    const rows = db.query
      ? null : null;
    const all = require('../db');
    const list = all.listAll
      ? null : null;
    // 通过已有方法聚合:取所有用户中邀请数最多的
    const board = all.getReferralLeaderboard ? all.getReferralLeaderboard(20) : [];
    const me = all.findUserById(req.user.id);
    const mine = board.find((x) => x.id === req.user.id) || null;
    res.json({ board: board.map((x) => ({ username: x.username, invited: x.invited, commission: x.commission, isMe: x.id === req.user.id })), me: mine ? { rank: board.indexOf(mine) + 1, invited: mine.invited } : null, tiers: TIERS.map((t) => ({ min: t.min, name: t.name, pro: t.pro, other: t.other })) });
  } catch (e) {
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

// 实名信息提交(提现前置)
router.post('/verify', authMiddleware, (req, res) => {
  try {
    const { real_name, phone } = req.body || {};
    const name = String(real_name || '').trim();
    const ph = String(phone || '').trim();
    if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '请填写真实姓名(2-20 字)' });
    if (!/^1\d{10}$/.test(ph)) return res.status(400).json({ error: '请填写有效的手机号' });
    db.setVerified(req.user.id, name, ph);
    notify(req.user.id, 'sale', '实名信息已提交', '现在可以申请提现了', '#/console');
    res.json({ message: '实名信息已提交', verified: true });
  } catch (e) {
    console.error('实名提交失败:', e);
    res.status(500).json({ error: '提交失败' });
  }
});

// 月度结算单:我的 / 管理员手动生成 / 下载
// 通知通道:飞书 webhook 配置(管理员) + 测试
router.get('/notify/status', authMiddleware, adminOnly, (req, res) => {
  try {
    const c = notifier.cfg();
    res.json({ lark: { configured: !!notifier.larkUrl(), source: process.env.WEBSFLOW_LARK_WEBHOOK ? 'env' : (c.lark_webhook ? 'config' : 'none') } });
  } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

router.post('/notify/lark', authMiddleware, adminOnly, (req, res) => {
  try {
    const { webhook } = req.body || {};
    if (!/^https:\/\//.test(String(webhook || ''))) return res.status(400).json({ error: '请填写合法的 Webhook 地址' });
    notifier.setConfig({ lark_webhook: webhook });
    notifier.pushLark('[WebsFlow] 飞书通道测试成功,后续对账/结算/佣金事件将同步推送。');
    res.json({ message: '飞书通道已配置并发送测试消息' });
  } catch (e) { res.status(500).json({ error: '配置失败' }); }
});

// 邀请页 A/B 自动选优:记录胜出版本为默认
router.post('/ref-variant', authMiddleware, (req, res) => {
  try {
    const { variant, expId } = req.body || {};
    if (!variant) return res.status(400).json({ error: '缺少版本' });
    db.setRefVariant(req.user.id, String(variant).toUpperCase().slice(0, 2), expId || null);
    res.json({ message: `已将变体 ${variant} 设为默认,后续生成的邀请页优先使用该版本文案` });
  } catch (e) { res.status(500).json({ error: '设置失败' }); }
});

// 渠道归因(LTV):管理员看全渠道,普通用户看自己的渠道
router.get('/attribution', authMiddleware, (req, res) => {
  try {
    const isAdmin = !!req.user.is_admin;
    const rows = db.getAttribution(isAdmin ? null : req.user.id);
    const totals = rows.reduce((a, x) => ({
      invited: a.invited + x.invited, paidUsers: a.paidUsers + x.paidUsers,
      revenue: a.revenue + x.revenue, commission: a.commission + x.commission,
    }), { invited: 0, paidUsers: 0, revenue: 0, commission: 0 });
    res.json({
      scope: isAdmin ? 'all' : 'mine',
      channels: rows.slice(0, 20),
      byUtm: db.getAttributionByUtm(),
      totals: Object.assign(totals, {
        convRate: totals.invited ? Math.round(totals.paidUsers / totals.invited * 1000) / 10 : 0,
        ltv: totals.invited ? Math.round(totals.revenue / totals.invited * 100) / 100 : 0,
        roi: totals.commission ? Math.round(totals.revenue / totals.commission * 100) / 100 : 0,
      }),
    });
  } catch (e) {
    console.error('渠道归因失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

// 邮件通道状态 / 测试发送
router.get('/mail/status', authMiddleware, (req, res) => {
  try { res.json({ mail: mailer.status() }); } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

router.post('/mail/test', authMiddleware, adminOnly, async (req, res) => {
  try {
    const to = (req.body && req.body.to) || req.user.email;
    const r = await mailer.send(to, 'WebsFlow 邮件通道测试', `这是一封测试邮件。\n发送时间:${new Date().toISOString()}\n收件人:${to}`);
    if (r.skipped) return res.status(400).json({ error: r.reason + ';请在 api/mail-config.json 或 PayFlow 的 mail 段配置 SMTP' });
    if (!r.ok) return res.status(500).json({ error: '发送失败:' + (r.detail || '') });
    res.json({ message: '测试邮件已发送至 ' + to });
  } catch (e) {
    res.status(500).json({ error: '发送失败' });
  }
});

router.get('/settlements', authMiddleware, (req, res) => {
  try { res.json({ settlements: db.getSettlements(req.user.id) }); } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

router.post('/settlements/run', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await generateSettlements((req.body && req.body.period) || lastMonthPeriod());
    res.json({ message: r.skipped ? '该月结算单已存在' : `已生成 ${r.created} 份结算单`, result: r });
  } catch (e) {
    console.error('生成结算单失败:', e);
    res.status(500).json({ error: '生成失败' });
  }
});

// 手动补发结算单邮件
router.post('/settlements/:period/mail', authMiddleware, (req, res) => {
  try {
    const hit = db.getSettlements(req.user.id).find((x) => x.period === req.params.period);
    if (!hit) return res.status(404).json({ error: '该月没有结算单' });
    const user = db.findUserById(req.user.id);
    const text = renderStatement(user, hit.period, hit.data);
    mailer.send(user.email, `WebsFlow 返佣结算单 · ${hit.period}`, text).then((r) => {
      res.json({ message: r.skipped ? r.reason : (r.ok ? '结算单邮件已发送' : '发送失败'), result: r });
    });
  } catch (e) {
    res.status(500).json({ error: '发送失败' });
  }
});

router.get('/settlements/:period', authMiddleware, (req, res) => {
  try {
    const list = db.getSettlements(req.user.id);
    const hit = list.find((x) => x.period === req.params.period);
    if (!hit) return res.status(404).json({ error: '该月没有结算单' });
    const user = db.findUserById(req.user.id);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(renderStatement(user, hit.period, hit.data));
  } catch (e) {
    res.status(500).json({ error: '生成失败' });
  }
});

// 申请提现(余额即时冻结,驳回原路退回;含风控)
router.post('/payout', authMiddleware, async (req, res) => {
  try {
    const { amount, method, account } = req.body || {};
    const amt = Math.round((Number(amount) || 0) * 100) / 100;
    const cfg = db.getRiskConfig();
    const user = db.findUserById(req.user.id);

    // 委派模式:提现由 PayFlow 处理(其最低额度/风控/打款流程为准)
    if (commerce.isDelegated()) {
      if (!user.verified) return res.status(403).json({ error: '请先完成实名认证再提现', needVerify: true });
      try {
        const ensured = await commerce.ensureReferral(user);
        const r = await commerce.requestPayout(user, Math.round(amt * 100), method, account, req.body && req.body.note);
        const p = r && r.payout;
        if (p) {
          // 本地镜像一条记录用于展示(状态以 PayFlow 为准)
          db.createPayout(user.id, amt, method, account);
          const local = db.getPayouts(user.id)[0];
          if (local) db.updatePayoutStatus(local.id, p.status || 'requested', '由 PayFlow 受理:' + (p.id || ''));
        }
        return res.status(201).json({ message: '提现申请已提交(PayFlow 受理)', payout: p, mode: 'payflow' });
      } catch (e) {
        return res.status(400).json({ error: e.message, mode: 'payflow' });
      }
    }

    // 风控:实名 → 单笔上下限 → 频次 → 累计额度 → 待处理唯一
    if (!user.verified) return res.status(403).json({ error: '请先完成实名认证再提现', needVerify: true });
    if (amt < cfg.minAmount) return res.status(400).json({ error: `单笔提现最低 ¥${cfg.minAmount}` });
    if (amt > cfg.maxAmount) return res.status(400).json({ error: `单笔提现上限 ¥${cfg.maxAmount},大额请分次或联系运营` });

    const snap = db.getPayoutRiskSnapshot(req.user.id);
    if (cfg.singlePending && snap.pendingCount > 0) return res.status(429).json({ error: '已有待处理的提现申请,请等待处理完成' });
    if (snap.todayCount >= cfg.dailyCount) return res.status(429).json({ error: `今日提现申请次数已达上限(${cfg.dailyCount} 次)` });
    if (snap.todayAmount + amt > cfg.dailyAmount) return res.status(429).json({ error: `超出单日提现额度(上限 ¥${cfg.dailyAmount},今日已申请 ¥${snap.todayAmount.toFixed(2)})` });
    if (snap.monthAmount + amt > cfg.monthlyAmount) return res.status(429).json({ error: `超出单月提现额度(上限 ¥${cfg.monthlyAmount})` });
    if (amt > (user.balance || 0)) return res.status(400).json({ error: `余额不足(当前 ¥${(user.balance || 0).toFixed(2)})` });
    db.addBalance(req.user.id, -amt);
    const p = db.createPayout(req.user.id, amt, method, account);
    notify(req.user.id, 'sale', `提现申请已提交 ¥${amt.toFixed(2)}`, '运营将在 1-3 个工作日内处理', '#/console');
    db.adminIds().forEach((id) => notify(id, 'review', `有待处理的提现申请 ¥${amt.toFixed(2)}`, `${user.username || ''} 申请提现`, '#/console'));
    res.status(201).json({ message: '提现申请已提交', payout: p, balance: (user.balance || 0) - amt });
  } catch (e) {
    console.error('提现申请失败:', e);
    res.status(500).json({ error: '申请失败' });
  }
});

// 管理员:待处理提现
router.get('/payouts/pending', authMiddleware, adminOnly, (req, res) => {
  try { res.json({ payouts: db.getPendingPayouts() }); } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

// 管理员:提现审核(approve/reject/paid)
router.post('/payouts/:id/review', authMiddleware, adminOnly, (req, res) => {
  try {
    const { action, note } = req.body || {};
    const p = db.getPayoutById(req.params.id);
    if (!p) return res.status(404).json({ error: '提现不存在' });
    if (!['approve', 'reject', 'paid'].includes(action)) return res.status(400).json({ error: '动作非法' });
    if (action === 'reject') {
      if (p.status === 'requested' || p.status === 'approved') db.addBalance(p.user_id, p.amount); // 退回余额
      db.updatePayoutStatus(p.id, 'rejected', note);
      notify(p.user_id, 'sale', `提现已驳回,¥${(p.amount || 0).toFixed(2)} 已退回余额`, note || '', '#/console');
    } else if (action === 'approve') {
      db.updatePayoutStatus(p.id, 'approved', note);
      notify(p.user_id, 'sale', '提现已通过,等待打款', `金额 ¥${(p.amount || 0).toFixed(2)}`, '#/console');
    } else {
      db.updatePayoutStatus(p.id, 'paid', note);
      notify(p.user_id, 'sale', `提现已打款 ¥${(p.amount || 0).toFixed(2)}`, note || '请查收', '#/console');
    }
    res.json({ message: '已处理' });
  } catch (e) {
    console.error('提现审核失败:', e);
    res.status(500).json({ error: '处理失败' });
  }
});

router.post('/claim', authMiddleware, (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: '请输入邀请码' });
    const r = db.bindReferrer(req.user.id, code);
    if (!r) return res.status(400).json({ error: '邀请码无效、已被绑定或不可自邀' });
    res.json({ message: '邀请码已绑定' });
  } catch (e) {
    res.status(500).json({ error: '绑定失败' });
  }
});

module.exports = router;
