/* ============================================================
 * WebsFlow · 系统体检路由 (selfcheck.js)
 * GET  /api/selfcheck          运行体检(deep=1 时抽样探活素材)
 * POST /api/selfcheck/fix      一键修复(仅安全动作)
 * GET  /api/selfcheck/history  近期体检记录
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const selfcheck = require('../lib/selfcheck');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const report = await selfcheck.run(req.user, { deep: req.query.deep === '1', sample: req.query.sample, applyFixes: req.query.fix === '1' });
    report.smoothness = selfcheck.smoothness(report);
    try { db.addSelfCheck({ user_id: req.user.id, ok: report.ok ? 1 : 0, warns: report.warns, report: JSON.stringify(report) }); } catch (e) {}
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/fix', authMiddleware, async (req, res) => {
  const actions = (req.body && req.body.actions) || null;
  try {
    const report = await selfcheck.run(req.user, { deep: false });
    const targets = actions && actions.length ? report.items.filter((i) => actions.includes(i.fix)) : report.items.filter((i) => i.auto && i.fix);
    const fixes = [];
    for (const t of targets) fixes.push(await selfcheck.applyFix(req.user, t.fix, t));
    res.json({ ok: true, fixes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/history', authMiddleware, (req, res) => {
  let rows = [];
  try { rows = db.listSelfChecks(req.user.id, req.query.limit) || []; } catch (e) {}
  res.json({ checks: rows.map((r) => ({ at: r.created_at, ok: r.ok, warns: r.warns })) });
});

module.exports = router;
