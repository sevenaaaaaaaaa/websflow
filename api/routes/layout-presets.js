/* ============================================================
 * WebsFlow · 版式预设路由 (layout-presets.js)
 * GET    /api/layout-presets      列表(团队共享 + 自己的)
 * POST   /api/layout-presets      保存版式预设(需登录)
 * DELETE /api/layout-presets/:id  删除(仅创建者或管理员)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../auth');

// 版式字段白名单 + 数值范围保护
const NUM_RANGE = {
  sectionY: [24, 200], gutter: [8, 72], gap: [6, 64],
  cardPad: [8, 64], container: [480, 1600],
};
const SHADOWS = ['none', 'subtle', 'medium', 'strong'];

function sanitizeLayout(raw) {
  const out = {};
  Object.keys(NUM_RANGE).forEach((k) => {
    const n = Number(raw && raw[k]);
    if (isFinite(n)) out[k] = Math.round(Math.min(NUM_RANGE[k][1], Math.max(NUM_RANGE[k][0], n)));
  });
  const sh = raw && raw.shadow;
  if (SHADOWS.includes(sh)) out.shadow = sh;
  return out;
}

router.get('/', optionalAuth, (req, res) => {
  try {
    res.json({ presets: db.getLayoutPresets(req.user && req.user.id) });
  } catch (e) {
    console.error('版式预设列表失败:', e);
    res.status(500).json({ error: '获取版式预设失败' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, layout, scope } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: '缺少预设名称' });
    const clean = sanitizeLayout(layout);
    if (!Object.keys(clean).length) return res.status(400).json({ error: '版式内容为空' });
    const p = db.createLayoutPreset(
      req.user.id,
      req.user.display_name || req.user.username,
      String(name).trim(),
      clean,
      scope
    );
    res.status(201).json({ message: '已保存', preset: p });
  } catch (e) {
    console.error('保存版式预设失败:', e);
    res.status(500).json({ error: '保存版式预设失败' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const ok = db.deleteLayoutPreset(req.params.id, req.user.id, !!req.user.is_admin);
    if (!ok) return res.status(404).json({ error: '预设不存在或无权删除' });
    res.json({ message: '已删除' });
  } catch (e) {
    console.error('删除版式预设失败:', e);
    res.status(500).json({ error: '删除版式预设失败' });
  }
});

module.exports = router;
