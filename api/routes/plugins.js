/* ============================================================
 * WebsFlow · 插件路由 (plugins.js)
 * GET    /api/plugins      公开列表(启用的插件区块)
 * POST   /api/plugins      注册插件(需登录)
 * DELETE /api/plugins/:id  删除自己的插件
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { notify, notifyAdmins } = require('../lib/notify');
const { creditReferral } = require('../lib/referral');
const { authMiddleware, optionalAuth, adminOnly } = require('../auth');
const { sanitizePluginHtml, sanitizeFields } = require('../lib/sanitize');

router.get('/', optionalAuth, (req, res) => {
  try {
    res.json({ plugins: db.getPlugins(req.user && req.user.id) });
  } catch (e) {
    console.error('插件列表失败:', e);
    res.status(500).json({ error: '获取插件失败' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, block_type, description, fields, template } = req.body || {};
    if (!name || !block_type || !template) {
      return res.status(400).json({ error: '缺少名称/类型/模板' });
    }
    if (!/^[a-z][a-z0-9-]{1,23}$/.test(block_type)) {
      return res.status(400).json({ error: '区块类型需为小写字母/数字/短横线(2-24 位)' });
    }
    if (!Array.isArray(fields) || !fields.length) {
      return res.status(400).json({ error: '至少定义一个字段' });
    }
    const cleanFields = sanitizeFields(fields);
    const cleanTemplate = sanitizePluginHtml(String(template).slice(0, 8000));
    if (!cleanTemplate) return res.status(400).json({ error: '模板内容为空或包含被禁止的标签(script/iframe/form 等)' });
    const p = db.createPlugin(
      req.user.id, String(name).slice(0, 40), block_type, description, cleanFields,
      cleanTemplate, req.body.price
    );
    if (req.user.is_admin) db.reviewPlugin(p.id, 'approved', '管理员直发');
    if (!req.user.is_admin) {
      notifyAdmins('review', '有新插件待审核', `${req.user.display_name || req.user.username} 提交了「${p.name}」`, '#/console');
    }
    res.status(201).json({ message: '插件已提交上架' + (req.user.is_admin ? '(管理员直通过审)' : ',等待审核'), plugin: p });
  } catch (e) {
    console.error('注册插件失败:', e);
    res.status(500).json({ error: '注册插件失败' });
  }
});

// 购买插件(余额扣款 + 70/30 分账)
router.post('/:id/buy', authMiddleware, (req, res) => {
  try {
    const list = db.getPlugins(null);
    const p = list.find((x) => x.id === req.params.id) || null;
    const full = p || db.getPlugins(req.user.id).find((x) => x.id === req.params.id);
    if (!full) return res.status(404).json({ error: '插件不存在' });
    if (full.owner_id === req.user.id) return res.status(400).json({ error: '这是你自己的插件' });
    if (db.hasPurchased('plugin', full.id, req.user.id)) return res.status(400).json({ error: '你已购买过该插件' });
    const price = Number(full.price) || 0;
    const buyer = db.findUserById(req.user.id);
    if (price > (buyer.balance || 0)) {
      return res.status(400).json({ error: `余额不足(需 ¥${price},当前 ¥${(buyer.balance || 0).toFixed(2)})` });
    }
    const sellerShare = Math.round(price * 0.7 * 100) / 100;
    db.addBalance(req.user.id, -price);
    db.addBalance(full.owner_id, sellerShare);
    db.createOrder('plugin', req.user.id, full.owner_id, price, sellerShare, Math.round((price - sellerShare) * 100) / 100, full.id);
    notify(full.owner_id, 'sale', `插件「${full.name}」售出 +¥${sellerShare}`, `买家:${buyer.display_name || buyer.username}`, '#/console');
    creditReferral(req.user.id, price * 100, 'plugin', full.id);
    res.json({ message: '购买成功,插件已解锁', balance: (buyer.balance || 0) - price });
  } catch (e) {
    console.error('购买插件失败:', e);
    res.status(500).json({ error: '购买失败' });
  }
});

// 使用计数(编辑器注册插件时上报)
router.post('/:id/use', optionalAuth, (req, res) => {
  try { db.incrementPluginUses(req.params.id); } catch (e) {}
  res.json({ ok: true });
});

// 审核插件(管理员)
router.post('/:id/review', authMiddleware, adminOnly, (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: '状态非法' });
    }
    const target = db.getPlugins(null).find((x) => x.id === req.params.id);
    db.reviewPlugin(req.params.id, status, note);
    if (target && target.owner_id) {
      notify(target.owner_id, 'review', `你的插件「${target.name}」${status === 'approved' ? '已通过审核' : status === 'rejected' ? '未通过审核' : '已打回修改'}`, note || '', '#/console');
    }
    res.json({ message: status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '已打回' });
  } catch (e) {
    res.status(500).json({ error: '审核失败' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (!db.deletePlugin(req.params.id, req.user.id)) {
      return res.status(404).json({ error: '插件不存在或无权删除' });
    }
    res.json({ message: '插件已删除' });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
