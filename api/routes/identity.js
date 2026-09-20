/* ============================================================
 * WebsFlow · 身份 (identity.js 路由)  —— G2
 * POST /api/identity/resolve   {vid?,uid?,payflow_ref?,email?,phone?} → 身份 + 合并信息
 * GET  /api/identity/lookup?vid=&uid=&email=...   同上(便于直接查询)
 * GET  /api/identity/:id       身份详情 + 跨系统时间线(事件/线索/订单)
 * GET  /api/identity/stats     身份库概览
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const { resolveIdentity } = require('../lib/identity');

function pick(req) {
  return {
    vid: req.query.vid || (req.body && req.body.vid),
    uid: req.query.uid || (req.body && req.body.uid),
    payflow_ref: req.query.payflow_ref || (req.body && req.body.payflow_ref),
    email: req.query.email || (req.body && req.body.email),
    phone: req.query.phone || (req.body && req.body.phone),
  };
}

router.get('/stats', authMiddleware, (req, res) => {
  res.json(db.identityStats());
});

router.get('/lookup', authMiddleware, (req, res) => {
  const r = resolveIdentity(pick(req), null);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json(r);
});

router.post('/resolve', authMiddleware, (req, res) => {
  const r = resolveIdentity(pick(req), (req.body || {}).traits);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json(r);
});

router.get('/:id', authMiddleware, (req, res) => {
  const idn = db.getIdentity(req.params.id);
  if (!idn) return res.status(404).json({ error: '身份不存在' });
  res.json({ identity: idn, timeline: db.identityTimeline(idn.id, Number(req.query.limit) || 50) });
});

module.exports = router;
