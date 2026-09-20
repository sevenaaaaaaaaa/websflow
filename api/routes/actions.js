/* ============================================================
 * WebsFlow · 跨系统动作路由 (actions.js)  —— 阶段三
 * GET  /api/actions                待审/已决动作列表
 * POST /api/actions/:id/approve    人审通过 → 执行并落库
 * POST /api/actions/:id/reject     人审驳回
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, apiKeyAuth } = require('../auth');
const broker = require('../lib/action-broker');

function either(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('wfk_') || h.startsWith('Bearer wfk_')) return apiKeyAuth(req, res, next);
  return authMiddleware(req, res, next);
}

const shape = (a) => Object.assign({}, a, { payload: a.payload ? JSON.parse(a.payload) : null, result: a.result ? JSON.parse(a.result) : null });

router.get('/', either, (req, res) => {
  const rows = db.listCrossActions({ user_id: req.user.id, status: req.query.status, project_id: req.query.project_id, limit: req.query.limit });
  res.json({ pending: db.countPendingCrossActions(req.user.id), actions: rows.map(shape) });
});

router.post('/:id/approve', either, async (req, res) => {
  const a = db.getCrossAction(req.params.id);
  if (!a || a.user_id !== req.user.id) return res.status(404).json({ error: '动作不存在或无权访问' });
  const r = await broker.approve(req.params.id, req.user.email || req.user.id);
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, action: shape(r.action), result: r.result });
});

router.post('/:id/reject', either, (req, res) => {
  const a = db.getCrossAction(req.params.id);
  if (!a || a.user_id !== req.user.id) return res.status(404).json({ error: '动作不存在或无权访问' });
  const r = broker.reject(req.params.id, req.user.email || req.user.id, req.body && req.body.note);
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, action: shape(r.action) });
});

module.exports = router;
