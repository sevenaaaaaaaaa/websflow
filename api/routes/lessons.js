/* ============================================================
 * WebsFlow · 平台经验库路由 (lessons.js)  —— G4
 * POST   /api/lessons            记录经验(API 密钥 scope: lessons/write/admin;登录用户亦可)
 * GET    /api/lessons            原始列表(?system=&scene=&action=&scope=&outcome=)
 * GET    /api/lessons/summary    聚合胜率(平滑)
 * GET    /api/lessons/brief      给模型/人看的经验文本(?system=&scene=)
 * DELETE /api/lessons/:id        删除(需 system 匹配)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, apiKeyAuth } = require('../auth');
const lessons = require('../lib/lessons');

function either(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer wfk_')) return apiKeyAuth(req, res, next);
  return authMiddleware(req, res, next);
}
// 取"当前系统名":密钥调用按 key 名,登录调用按 websflow-console
function actorSystem(req) {
  if (req.apiKey) return 'apikey:' + String(req.apiKey.name || req.apiKey.key_prefix || 'unknown').slice(0, 30);
  return 'websflow-console';
}

router.get('/', either, (req, res) => {
  res.json({ lessons: db.listLessons({ system: req.query.system, scene: req.query.scene, action: req.query.action, scope: req.query.scope, outcome: req.query.outcome, limit: req.query.limit }) });
});

router.get('/summary', either, (req, res) => {
  res.json({ summary: lessons.summarize({ system: req.query.system, scene: req.query.scene, scope: req.query.scope }) });
});

router.get('/brief', either, (req, res) => {
  res.json({ scene: req.query.scene || '', brief: lessons.brief({ system: req.query.system, scene: req.query.scene, scope: req.query.scope }) });
});

router.post('/', either, (req, res) => {
  const scopes = Array.isArray(req.apiKey && req.apiKey.scopes) ? req.apiKey.scopes : [];
  if (req.apiKey && scopes.length && !scopes.includes('lessons') && !scopes.includes('write') && !scopes.includes('admin')) {
    return res.status(403).json({ error: '该密钥没有记录经验的权限(lessons/write)' });
  }
  const body = req.body || {};
  const list = Array.isArray(body.lessons) ? body.lessons : (body.scene ? [body] : []);
  if (!list.length) return res.status(400).json({ error: '缺少 lessons 数组或 scene/action/outcome' });
  const rows = list.map((r) => Object.assign({ system: r.system || actorSystem(req), source: r.source || 'observed' }, r));
  const missing = rows.filter((r) => !r.scene || !r.action || !r.outcome);
  const saved = lessons.record(rows.filter((r) => r.scene && r.action && r.outcome));
  res.status(201).json({ ok: true, saved: saved.length, rejected: missing.length, ids: saved.map((x) => x.id) });
});

router.delete('/:id', either, (req, res) => {
  const ok = db.deleteLesson(req.params.id, req.query.system);
  if (!ok) return res.status(404).json({ error: '经验不存在或 system 不匹配' });
  res.json({ ok: true });
});

module.exports = router;
