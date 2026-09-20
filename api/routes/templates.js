/* ============================================================
 * WebsFlow · 云端模板路由 (templates.js)
 * GET    /api/templates        公开列表(元信息)
 * GET    /api/templates/:id    详情(含数据,并计数)
 * POST   /api/templates        发布模板(需登录)
 * DELETE /api/templates/:id    删除自己的模板(需登录)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { notify, notifyAdmins } = require('../lib/notify');
const { creditReferral } = require('../lib/referral');
const { authMiddleware, optionalAuth, adminOnly } = require('../auth');

router.get('/', optionalAuth, (req, res) => {
  try {
    const uid = req.user ? req.user.id : null;
    // 公开只出已过审;带上自己的(含审核中)
    let templates = db.getTemplates(false);
    if (uid) {
      const mineAll = db.getTemplates(true).filter((t) => t.user_id === uid);
      const seen = new Set(templates.map((t) => t.id));
      mineAll.forEach((t) => { if (!seen.has(t.id)) templates.push(t); });
    }
    templates = templates.map((t) => Object.assign({}, t, {
      purchased: uid ? (t.user_id === uid || db.hasPurchased('template', t.id, uid)) : false,
      mine: uid ? t.user_id === uid : false,
    }));
    res.json({ templates });
  } catch (e) {
    console.error('模板列表失败:', e);
    res.status(500).json({ error: '获取模板失败' });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const tpl = db.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ error: '模板不存在' });
    const uid = req.user ? req.user.id : null;
    const purchased = uid ? (tpl.user_id === uid || db.hasPurchased('template', tpl.id, uid)) : false;
    // 付费模板:未购买不返回内容
    if (tpl.price > 0 && !purchased) {
      return res.json({ template: { id: tpl.id, name: tpl.name, mode: tpl.mode, description: tpl.description, author: tpl.author, price: tpl.price, locked: true } });
    }
    db.incrementTemplateDownloads(req.params.id);
    res.json({ template: Object.assign(tpl, { purchased }) });
  } catch (e) {
    console.error('模板详情失败:', e);
    res.status(500).json({ error: '获取模板失败' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, mode, description, data, price } = req.body || {};
    const blocks = (data && Array.isArray(data.blocks)) ? data.blocks : [];
    const pages = (data && Array.isArray(data.pages)) ? data.pages : [];
    if (!name || !mode || !data || (!blocks.length && !pages.length)) {
      return res.status(400).json({ error: '缺少模板名称/形态/内容' });
    }
    if (blocks.length > 60 || pages.reduce((n, pg) => n + ((pg.blocks || []).length), 0) > 200) {
      return res.status(400).json({ error: '模板过大' });
    }
    const allowInstant = !!req.user.is_admin; // 管理员发布直接过审
    const tpl = db.createTemplate(
      req.user.id,
      req.user.display_name || req.user.username,
      String(name).slice(0, 60),
      String(mode).slice(0, 20),
      String(description || '').slice(0, 120),
      data,
      Math.max(0, Math.min(9999, Number(price) || 0))
    );
    if (!req.user.is_admin) {
      notifyAdmins('review', '有新模板待审核', `${req.user.display_name || req.user.username} 提交了「${tpl.name}」`, '#/console');
    }
    res.status(201).json({ message: '模板已发布', template: tpl });
  } catch (e) {
    console.error('发布模板失败:', e);
    res.status(500).json({ error: '发布模板失败' });
  }
});

// 购买模板(余额扣款 + 70/30 分账)
router.post('/:id/buy', authMiddleware, (req, res) => {
  try {
    const tpl = db.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ error: '模板不存在' });
    if (tpl.user_id === req.user.id) return res.status(400).json({ error: '这是你自己的模板' });
    if (db.hasPurchased('template', tpl.id, req.user.id)) return res.status(400).json({ error: '你已购买过该模板' });
    const price = Number(tpl.price) || 0;
    const buyer = db.findUserById(req.user.id);
    if (price > (buyer.balance || 0)) {
      return res.status(400).json({ error: `余额不足(需 ¥${price},当前 ¥${(buyer.balance || 0).toFixed(2)}),请先充值` });
    }
    const sellerShare = Math.round(price * 0.7 * 100) / 100;
    const platformShare = Math.round((price - sellerShare) * 100) / 100;
    db.addBalance(req.user.id, -price);
    db.addBalance(tpl.user_id, sellerShare);
    db.createOrder('template', req.user.id, tpl.user_id, price, sellerShare, platformShare, tpl.id);
    notify(tpl.user_id, 'sale', `模板「${tpl.name}」售出 +¥${sellerShare}`, `买家:${buyer.display_name || buyer.username}`, '#/console');
    creditReferral(req.user.id, price * 100, 'template', tpl.id);
    res.json({ message: '购买成功,模板已解锁', balance: (buyer.balance || 0) - price });
  } catch (e) {
    console.error('购买模板失败:', e);
    res.status(500).json({ error: '购买失败' });
  }
});

// 审核模板(管理员):通过/拒绝 + 推荐位
router.post('/:id/review', authMiddleware, adminOnly, (req, res) => {
  try {
    const { status, featured, note } = req.body || {};
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: '状态非法' });
    }
    const tpl = db.getTemplate(req.params.id);
    db.reviewTemplate(req.params.id, status, featured, note);
    if (tpl && tpl.user_id) {
      const label = status === 'approved' ? (featured ? '已通过并设为推荐' : '已通过审核') : status === 'rejected' ? '未通过审核' : '已打回修改';
      notify(tpl.user_id, 'review', `你的模板「${tpl.name}」${label}`, note || '', '#/console');
    }
    res.json({ message: status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '已打回' });
  } catch (e) {
    console.error('模板审核失败:', e);
    res.status(500).json({ error: '审核失败' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const ok = db.deleteTemplate(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: '模板不存在或无权删除' });
    res.json({ message: '模板已删除' });
  } catch (e) {
    console.error('删除模板失败:', e);
    res.status(500).json({ error: '删除模板失败' });
  }
});

module.exports = router;
